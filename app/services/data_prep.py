
from typing import Optional
from google.oauth2 import service_account


import pandas as pd

try:
    from google.cloud import bigquery
except Exception:  # pragma: no cover - optional dependency
    bigquery = None


def fetch_data_from_bigquery(category: Optional[str] = None,
                             product: Optional[str] = None,
                             limit: Optional[int] = None,
                             client: Optional[object] = None) -> pd.DataFrame:
    """Fetch data from BigQuery for a given category or product.

    Parameters
    ----------
    category : Optional[str]
        Category value to filter the query. If None, no category filter is applied.
    product : Optional[str]
        Product_Name value to filter the query. If None, no product filter is applied.
    limit : Optional[int]
        Optional LIMIT to reduce returned rows.
    client : Optional[bigquery.Client]
        Optional BigQuery client instance (useful for testing/mocking). If not provided,
        a new client is created using default credentials.

    Returns
    -------
    pd.DataFrame
        DataFrame with columns Date, Category, Product_Name, Quantity, Unit_Price, Total_Price
    """
    key_path = r"C:\Users\raguk\Downloads\Document from Ilam.json"
    credentials = service_account.Credentials.from_service_account_file(key_path)

    client = bigquery.Client(credentials=credentials, project="pivotal-canto-466205-p6")

    query = """
        SELECT `Date`, `Product Category`, `Product Name`, `Units Sold`, `Unit Price`, `Total Revenue`, `Region`, `Payment Method`
        FROM `pivotal-canto-466205-p6.intent_inference.predictive_analysis`
        WHERE 1=1
    """

    if category:
        query += f" AND `Product Category` = '{category}'"
    if product:
        query += f" AND `Product Name` = '{product}'"

    query += " ORDER BY `Date`"
    if limit:
        query += f" LIMIT {int(limit)}"
