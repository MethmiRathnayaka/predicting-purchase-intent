from fastapi import APIRouter, HTTPException, Request
from io import BytesIO
import pandas as pd
from google.cloud import bigquery
from mlxtend.frequent_patterns import fpgrowth, association_rules

router = APIRouter()

bq_client = bigquery.Client()

# BigQuery table paths
ORDERS_TABLE = "pivotal-canto-466205-p6.intent_inference.Orders"
RULES_TABLE = "pivotal-canto-466205-p6.intent_inference.MiningResults"
DATASET_TABLE = "pivotal-canto-466205-p6.intent_inference.Data sets"

# Query template to get the latest dataset_id for a given user
DATASET_QUERY = f"""
    SELECT dataset_id 
    FROM `{DATASET_TABLE}`
    WHERE Client_id = @user_id
    ORDER BY dataset_id DESC
    LIMIT 1
"""


@router.post("/mining")
async def mine_rules(request: Request):
    """
    Run rule mining (FP-Growth) for the most recent dataset of a given user.
    """
    # --- Step 1: Get user_id from request body ---
    try:
        body = await request.json()
        user_id = body.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Missing user_id in request")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request body: {e}")

    # --- Step 2: Fetch latest dataset_id for this user ---
    try:
        job_config = bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("user_id", "STRING", user_id)]
        )
        query_job = bq_client.query(DATASET_QUERY, job_config=job_config)
        results = query_job.result()

        dataset_id = None
        for row in results:
            dataset_id = row.dataset_id
            break

        if dataset_id is None:
            raise HTTPException(status_code=404, detail="No dataset found for this user.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dataset_id: {e}")

    # --- Step 3: Fetch corresponding orders from BigQuery ---
    try:
        query = f"""
            SELECT order_id, products 
            FROM `{ORDERS_TABLE}` 
            WHERE dataset_id = {dataset_id}
        """
        df = bq_client.query(query).to_dataframe()

        if df.empty:
            raise HTTPException(status_code=404, detail="No orders found for this dataset.")

        print(f"Data fetched from BigQuery — Rows: {len(df)}")
        print(df.head().to_string())

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dataset: {e}")

    # --- Step 4: One-hot encode product data ---
    try:
        basket = df.explode("products")
        basket = basket.groupby(["order_id", "products"]).size().unstack(fill_value=0)
        basket = basket.applymap(lambda x: 1 if x > 0 else 0)

        print(f"Basket shape: {basket.shape}")
        print(basket.head().to_string())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to encode dataset: {e}")

    # --- Step 5: FP-Growth ---
    try:
        frequent_itemsets = fpgrowth(basket, min_support=0.01, use_colnames=True)
        rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=0.3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate rules: {e}")

    if rules.empty:
        return {"message": "No rules found for this dataset", "rules_count": 0, "dataset_id": dataset_id}

    # --- Step 6: Prepare rules DataFrame ---
    try:
        rules_df = rules[["antecedents", "consequents", "support", "confidence", "lift"]].copy()
        rules_df["antecedents"] = rules_df["antecedents"].apply(list)
        rules_df["consequents"] = rules_df["consequents"].apply(list)
        rules_df["dataset_id"] = dataset_id
        rules_df = rules_df.sort_values(by="lift", ascending=False).reset_index(drop=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to format rules DataFrame: {e}")

    # --- Step 7: Upload to BigQuery ---
    try:
        job_config = bigquery.LoadJobConfig(
            schema=[
                bigquery.SchemaField("antecedents", "STRING", mode="REPEATED"),
                bigquery.SchemaField("consequents", "STRING", mode="REPEATED"),
                bigquery.SchemaField("support", "FLOAT"),
                bigquery.SchemaField("confidence", "FLOAT"),
                bigquery.SchemaField("lift", "FLOAT"),
                bigquery.SchemaField("dataset_id", "INTEGER"),
            ],
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
            source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
        )

        json_data = rules_df.to_json(orient="records", lines=True)
        load_job = bq_client.load_table_from_file(
            BytesIO(json_data.encode("utf-8")),
            RULES_TABLE,
            job_config=job_config
        )
        load_job.result()

        print(f"Uploaded {len(rules_df)} rules for dataset_id={dataset_id}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload mining results: {e}")

    # --- Step 8: Return success response ---
    return {
        "message": "Rules mining complete",
        "rules_count": len(rules_df),
        "dataset_id": dataset_id
    }
