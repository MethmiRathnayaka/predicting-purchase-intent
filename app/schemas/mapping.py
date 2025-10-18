from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
# from app.schemas.intent import ProcessResult
from app.services import storage, inference

router = APIRouter()

class UploadResult(BaseModel):
    rows: int
    columns: int

class ProcessResult(BaseModel):
    processed_baskets: int
    unique_intents: int
    time_ms: float

class AggregateRow(BaseModel):
    intent: str
    count: int

@router.post("/process", response_model=ProcessResult)
async def process_baskets():
    baskets = storage.get_baskets()
    if not baskets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No basket data uploaded. Please upload a CSV first."
        )

    results = inference.infer_intent(baskets)
    storage.set_intents(results)

    unique_intents = len(set(item["intent"] for item in results))
    return ProcessResult(
        processed_baskets=len(results),
        unique_intents=unique_intents,
        time_ms=0.0  # Replace 0.0 with actual processing time if available
    )
# Add this function if it does not exist
# (Removed: now implemented in app/services/inference.py)