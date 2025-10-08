from fastapi import APIRouter, UploadFile, File, HTTPException, status
from io import BytesIO
import pandas as pd
from google.cloud import bigquery

from app.schemas.intent import UploadResult
from app.services import storage

router = APIRouter()

# ✅ Initialize BigQuery client once
bq_client = bigquery.Client()
TABLE_ID = "pivotal-canto-466205-p6.intent_inference.Orders"


def parse_products_column(value):
    """
    Convert products column to a list for BigQuery REPEATED field.
    Handles various formats:
    - "product1,product2,product3" -> ["product1", "product2", "product3"]
    - "['product1','product2']" -> ["product1", "product2"]
    - '["product1","product2"]' -> ["product1", "product2"]
    - Already a list -> returns as is
    """
    import ast
    
    if pd.isna(value) or value is None:
        return []
    
    # Already a list
    if isinstance(value, list):
        return value
    
    # Convert to string
    value = str(value).strip()
    
    if not value:
        return []
    
    # Try parsing as JSON/Python literal (handles ['a','b'] or ["a","b"])
    if value.startswith('[') and value.endswith(']'):
        try:
            return ast.literal_eval(value)
        except:
            pass
    
    # Fallback: split by comma
    return [item.strip() for item in value.split(',') if item.strip()]

# ✅ Define explicit schema matching your BigQuery table
SCHEMA = [
    bigquery.SchemaField("order_id", "INTEGER", mode="NULLABLE"),
    bigquery.SchemaField("user_id", "INTEGER", mode="NULLABLE"),
    bigquery.SchemaField("products", "STRING", mode="REPEATED"),
    bigquery.SchemaField("dataset_id", "INTEGER", mode="NULLABLE"),
    bigquery.SchemaField("intent", "STRING", mode="NULLABLE"),
]


@router.post("/upload", response_model=UploadResult)
async def upload_csv(file: UploadFile = File(...)):
    # --- Step 1: Validate file type ---
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only CSV files are allowed."
        )

    # --- Step 2: Read file into DataFrame ---
    try:
        content = await file.read()
        df = pd.read_csv(BytesIO(content))

        # Convert to regular int (not Int64) to avoid JSON serialization issues
        if "order_id" in df.columns:
            df["order_id"] = pd.to_numeric(df["order_id"], errors="coerce")
            df["order_id"] = df["order_id"].apply(lambda x: int(x) if pd.notnull(x) else None)

        if "user_id" in df.columns:
            df["user_id"] = pd.to_numeric(df["user_id"], errors="coerce")
            df["user_id"] = df["user_id"].apply(lambda x: int(x) if pd.notnull(x) else None)

        # ✅ Convert products column to list (for REPEATED field in BigQuery)
        if "products" in df.columns:
            df["products"] = df["products"].apply(parse_products_column)

        # Convert dataset_id to int if present
        if "dataset_id" in df.columns:
            df["dataset_id"] = pd.to_numeric(df["dataset_id"], errors="coerce")
            df["dataset_id"] = df["dataset_id"].apply(lambda x: int(x) if pd.notnull(x) else None)

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read CSV file. Please check the file format."
        )

    # --- Step 3: Validate required columns ---
    required_columns = ["order_id", "products", "user_id"]
    if not all(col in df.columns for col in required_columns):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing one or more required columns: 'order_id', 'products', 'user_id'."
        )

    # --- Step 4: Ensure missing optional fields exist ---
    for col in ["dataset_id", "intent"]:
        if col not in df.columns:
            df[col] = None

    # --- Step 5: Convert to JSON (using pandas native method) ---
    try:
        # ✅ This handles types properly for BigQuery
        json_data = df.to_json(orient="records", lines=True)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to serialize data: {e}"
        )

    # --- Step 6: Upload to BigQuery ---
    try:
        job_config = bigquery.LoadJobConfig(
            source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
            schema=SCHEMA,  # ✅ Use explicit schema instead of autodetect
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
        )

        load_job = bq_client.load_table_from_file(
            BytesIO(json_data.encode("utf-8")),
            TABLE_ID,
            job_config=job_config,
        )
        load_job.result()  # Wait until upload completes

        print(f"✅ Uploaded {len(df)} rows from CSV to {TABLE_ID}.")

    except Exception as e:
        print("❌ BigQuery upload failed:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload to BigQuery: {e}",
        )

    # --- Step 7: Optionally store locally ---
    records = df.to_dict(orient="records")
    storage.set_baskets(records)

    # --- Step 8: Return success response ---
    return UploadResult(rows=len(df), columns=len(df.columns))