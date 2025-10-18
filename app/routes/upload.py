from fastapi import APIRouter, UploadFile, File, HTTPException, status, Form
from io import BytesIO
import pandas as pd
from google.cloud import bigquery
import ast

from app.schemas.intent import UploadResult
from app.services import storage

router = APIRouter()

bq_client = bigquery.Client()
TABLE_ID = "pivotal-canto-466205-p6.intent_inference.Orders"

# BigQuery schema (keep as is)
SCHEMA = [
    bigquery.SchemaField("order_id", "INTEGER", mode="NULLABLE"),
    bigquery.SchemaField("user_id", "INTEGER", mode="NULLABLE"),
    bigquery.SchemaField("products", "STRING", mode="REPEATED"),
    bigquery.SchemaField("dataset_id", "INTEGER", mode="NULLABLE"),
    bigquery.SchemaField("intent", "STRING", mode="NULLABLE"),
    bigquery.SchemaField("order_date", "STRING", mode="NULLABLE"),
    bigquery.SchemaField("Total cost", "FLOAT", mode="NULLABLE"),
    bigquery.SchemaField("City", "STRING", mode="NULLABLE"),
    bigquery.SchemaField("payment method", "STRING", mode="NULLABLE"),
    bigquery.SchemaField("User name", "STRING", mode="NULLABLE"),
    bigquery.SchemaField("Store type", "STRING", mode="NULLABLE"),
    bigquery.SchemaField("Customer_Category", "STRING", mode="NULLABLE"),
    bigquery.SchemaField("Season", "STRING", mode="NULLABLE"),
    bigquery.SchemaField("Promotion", "STRING", mode="NULLABLE"),
    bigquery.SchemaField("Total_Items", "STRING", mode="NULLABLE")
]


from fastapi import Form

@router.post("/upload", response_model=UploadResult)
async def upload_csv(file: UploadFile = File(...), user_id: str = Form(None)):
    print(f"DEBUG: Received user_id={user_id}, file={file.filename if file else None}")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required in the form data.")
    # --- Step 1: Validate file type ---
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload exactly 3 CSV files: orders, order_products, and products."
        )

    dfs = {}
    try:
        for file in files:
            if not file.filename.endswith(".csv"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid file type for {file.filename}. Only CSVs are allowed."
                )

            content = await file.read()
            df = pd.read_csv(BytesIO(content))

            # Detect which file is which by its columns
            cols = set(df.columns)
            if {"order_id", "user_id", "order_date", "Total cost"} <= cols:
                dfs["orders"] = df
            elif {"order_id", "product_id"} <= cols:
                dfs["order_products"] = df
            elif {"product_id", "product_name"} <= cols:
                dfs["products"] = df
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown schema in file {file.filename}"
                )

        # --- Ensure all files present ---
        for key in ["orders", "order_products", "products"]:
            if key not in dfs:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing {key}.csv file."
                )

        # --- Merge ---
        merged = dfs["order_products"].merge(dfs["products"], on="product_id", how="left")
        grouped = merged.groupby("order_id")["product_name"].apply(list).reset_index()

        # Join with orders table
        final_df = dfs["orders"].merge(grouped, on="order_id", how="left")

        # Rename and clean
        final_df.rename(columns={"product_name": "products"}, inplace=True)
        final_df["products"] = final_df["products"].apply(lambda x: x if isinstance(x, list) else [])

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error merging files: {e}")

    # --- Get next dataset_id ---
    try:
        query = f"SELECT MAX(dataset_id) AS last_id FROM {TABLE_ID}"
        query_job = bq_client.query(query)
        result = query_job.result()
        last_id = next(result).last_id or 0
        new_dataset_id = int(last_id) + 1
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch last dataset_id: {e}")

    final_df["dataset_id"] = new_dataset_id

    # --- Step 4b: Insert new dataset record into Data Set table ---
    # You may need to adjust how you get user_id depending on your auth system
    from fastapi import Request, Depends
    from fastapi.security import OAuth2PasswordBearer
    # user_id is now received from the frontend form
    DATASET_TABLE_ID = "pivotal-canto-466205-p6.intent_inference.Data sets"
    dataset_row = [{
        "dataset_id": new_dataset_id,
        "Client_id": user_id,
        "num of rows": len(df)
    }]
    # Convert to DataFrame and upload
    dataset_df = pd.DataFrame(dataset_row)
    dataset_json = dataset_df.to_json(orient="records", lines=True)
    dataset_schema = [
        bigquery.SchemaField("dataset_id", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("Client_id", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("num of rows", "INTEGER", mode="NULLABLE"),
    ]
    try:
        dataset_job_config = bigquery.LoadJobConfig(
            source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
            schema=dataset_schema,
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
        )
        dataset_load_job = bq_client.load_table_from_file(
            BytesIO(dataset_json.encode("utf-8")),
            DATASET_TABLE_ID,
            job_config=dataset_job_config,
        )
        dataset_load_job.result()
        print(f"Added dataset_id={new_dataset_id} for user_id={user_id} to Data sets table")
    except Exception as e:
        print(f"Failed to add to Data sets table:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add dataset record: {e}"
        )

    # --- Step 5: Convert to JSON ---
    try:
        json_data = df.to_json(orient="records", lines=True)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to serialize data: {e}"
        )

    # --- Upload to BigQuery ---
    try:
        job_config = bigquery.LoadJobConfig(
            source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
            schema=SCHEMA,
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
        )
        load_job = bq_client.load_table_from_file(
            BytesIO(json_data.encode("utf-8")), TABLE_ID, job_config=job_config
        )
        load_job.result()
    except Exception as e:
        raise HTTPException(500, f"BigQuery upload failed: {e}")

    # Optional local store
    storage.set_baskets(final_df.to_dict(orient="records"))

    return UploadResult(rows=len(df), columns=len(df.columns))
