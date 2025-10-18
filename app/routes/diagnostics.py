from fastapi import APIRouter, Query, HTTPException
from app.services.data_prep import fetch_data_from_bigquery
from app.services.diagnostics_service import run_diagnostics

router = APIRouter(prefix="/diagnostics", tags=["Diagnostics"])


@router.get("/")
async def diagnostics(category: str = Query(None), product: str = Query(None)):
    df = fetch_data_from_bigquery(category=category, product=product)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="No data found for selection.")

    diagnostics = run_diagnostics(df)
    return {"category": category, "diagnostics": diagnostics}
