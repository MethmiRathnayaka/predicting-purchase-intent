
from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

router = APIRouter()

@router.get("/rfm-insights")
def get_rfm_insights(user_id: str = Query(...)):
    # Load and process data
    from google.cloud import bigquery
    client = bigquery.Client()
    # Get latest dataset_id for this user from Data sets table
    dataset_table = "pivotal-canto-466205-p6.intent_inference.Data sets"
    dataset_query = f"""
        SELECT dataset_id FROM `{dataset_table}`
        WHERE Client_id = @user_id
        ORDER BY dataset_id DESC
        LIMIT 1
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ScalarQueryParameter("user_id", "STRING", user_id)]
    )
    dataset_result = client.query(dataset_query, job_config=job_config).result()
    dataset_row = next(dataset_result, None)
    if not dataset_row:
        return JSONResponse(content={"error": "No dataset found for this user."}, status_code=404)
    dataset_id = dataset_row.dataset_id

    # Query Orders for this dataset_id
    table_path = "pivotal-canto-466205-p6.intent_inference.Orders"
    query = f"""
        SELECT `user_id`, `order_date`, `order_id`, `Total cost`
        FROM `{table_path}`
        WHERE `user_id` IS NOT NULL AND dataset_id = @dataset_id
        LIMIT 100000
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ScalarQueryParameter("dataset_id", "INT64", dataset_id)]
    )
    data = client.query(query, job_config=job_config).to_dataframe()
    data = data.drop_duplicates()
    # Robust date parsing: let pandas infer the format, coerce errors to NaT
    data['order_date'] = pd.to_datetime(data['order_date'], errors='coerce')
    max_date = data['order_date'].max()
    rfm = data.groupby('user_id').agg({
        'order_date': lambda x: (max_date - x.max()).days,  # Recency
        'order_id': 'nunique',                              # Frequency
        'Total cost': 'sum'                                 # Monetary
    })
    rfm.rename(columns={'order_date': 'Recency', 'order_id': 'Frequency', 'Total cost': 'Monetary'}, inplace=True)
    # Drop any rows with NaN values before clustering
    rfm = rfm.dropna()
    k = 4
    if len(rfm) < k:
        return JSONResponse(content={"error": f"Not enough customers for clustering (need at least {k}, got {len(rfm)})."}, status_code=200)
    scaler = StandardScaler()
    rfm_scaled = scaler.fit_transform(rfm)
    kmeans = KMeans(n_clusters=k, random_state=42)
    rfm['Cluster'] = kmeans.fit_predict(rfm_scaled)
    cluster_summary = rfm.groupby('Cluster').agg({
        'Recency': 'mean',
        'Frequency': 'mean',
        'Monetary': 'mean'
    })
    cluster_summary['Num_Customers'] = rfm.groupby('Cluster').size()
    # Convert to dict for JSON response
    summary_dict = cluster_summary.reset_index().to_dict(orient='records')
    return JSONResponse(content={"clusters": summary_dict})
