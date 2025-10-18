from fastapi import APIRouter, HTTPException
from io import BytesIO
import pandas as pd
from google.cloud import bigquery
from mlxtend.frequent_patterns import fpgrowth, association_rules

router = APIRouter()

bq_client = bigquery.Client()
ORDERS_TABLE = "pivotal-canto-466205-p6.intent_inference.Orders"
RULES_TABLE = "pivotal-canto-466205-p6.intent_inference.MiningResults"


@router.post("/mining")
async def mine_rules():
    # --- Step 1: Fetch latest dataset_id ---
    try:
        dataset_id = 1 # You can customize how you select the dataset_id
        if dataset_id is None:
            raise HTTPException(status_code=404, detail="No dataset found in Orders table.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dataset_id: {e}")

    # --- Step 2: Fetch corresponding data ---
    try:
        query = f"SELECT order_id, products FROM `{ORDERS_TABLE}` WHERE dataset_id = {dataset_id}"
        df = bq_client.query(query).to_dataframe()

        # Clean products list
        #df["products"] = df["products"].apply(lambda x: [i.strip() for i in x] if isinstance(x, list) else [])
            # 🧩 DEBUG PRINTS
        print("✅ Data fetched from BigQuery")
        print("DataFrame shape:", df.shape)
        print("First few rows:")
        print(df.head().to_string())
        print("Products column sample:")
        print(df["products"].iloc[0] if not df.empty else "No data")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dataset: {e}")

    if df.empty:
        raise HTTPException(status_code=404, detail="No orders found for this dataset.")


    # --- Step 3: One-hot encode products ---
    try:
        basket = df.explode("products")
        basket = basket.groupby(["order_id", "products"]).size().unstack(fill_value=0)
        basket = basket.applymap(lambda x: 1 if x > 0 else 0)
        print("Basket shape:", basket.shape)
        print("Non-zero entries:", basket.values.sum())
        print("Basket sample:")
        print(basket.head().to_string())

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to encode dataset: {e}")



    # --- Step 4: FP-Growth ---
    try:
        frequent_itemsets = fpgrowth(basket, min_support=0.01, use_colnames=True)
        rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=0.3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate rules: {e}")

    if rules.empty:
        return {"message": "No rules found for this dataset", "rules_count": 0, "dataset_id": dataset_id}

    # --- Step 5: Prepare rules DataFrame ---
    try:
        rules_df = rules[["antecedents", "consequents", "support", "confidence", "lift"]].copy()
        rules_df["antecedents"] = rules_df["antecedents"].apply(list)
        rules_df["consequents"] = rules_df["consequents"].apply(list)
        rules_df["dataset_id"] = dataset_id

        # Sort by lift descending
        rules_df = rules_df.sort_values(by="lift", ascending=False).reset_index(drop=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to format rules DataFrame: {e}")

    # --- Step 6: Upload to BigQuery ---
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload mining results: {e}")

    print(f"✅ Uploaded {len(rules_df)} rules for dataset_id={dataset_id}")
    return {"message": "Rules mining complete", "rules_count": len(rules_df), "dataset_id": dataset_id}
