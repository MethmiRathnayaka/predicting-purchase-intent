from fastapi import APIRouter, Query, HTTPException
from app.services.data_prep import fetch_data_from_bigquery
from app.services.diagnostics_service import run_diagnostics
from app.services.forecast_service import run_forecast

router = APIRouter(prefix="/forecast", tags=["Forecast"])


@router.get("/")
async def forecast(
    category: str = Query(None, description="Filter by product category"),
    product: str = Query(None, description="Filter by product name")
):
    df = fetch_data_from_bigquery(category=category, product=product)
    if df.empty:
        raise HTTPException(status_code=404, detail="No data found for selection.")

    diagnostics = run_diagnostics(df)
    forecasts = run_forecast(df)

    return {
        "category": category,
        "product": product,
        "diagnostics": diagnostics,
        "forecasts": forecasts,
    }
