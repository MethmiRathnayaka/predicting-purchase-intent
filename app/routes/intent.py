from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
import threading
import queue
import json

from app.services.intent_service import infer_intent_for_dataset

router = APIRouter(prefix="/intent", tags=["Intent Inference"])


@router.post("/infer")
def run_intent_inference(dataset: str = Query(..., description="BigQuery dataset name")):
    """
    Triggers intent inference for a given dataset (synchronous call).
    Example: POST /intent/infer?dataset=my_dataset
    """
    # Keep synchronous behavior for backward compatibility
    infer_intent_for_dataset(dataset)
    return {"status": "started", "dataset": dataset}


@router.get("/infer/stream")
def run_intent_inference_stream(dataset: str = Query(..., description="BigQuery dataset name"), sample_size: int = Query(200, description="Number of rows to sample")):
    """
    Trigger intent inference and stream progress updates as Server-Sent Events (SSE).
    Example: GET /intent/infer/stream?dataset=my_dataset&sample_size=200
    """
    q: "queue.Queue[str]" = queue.Queue()

    def progress_cb(msg: str):
        q.put(msg)

    def worker():
        try:
            infer_intent_for_dataset(dataset, sample_size=sample_size, progress_cb=progress_cb)
            q.put(json.dumps({"type": "done", "text": "Inference finished"}))
        except Exception as e:
            q.put(json.dumps({"type": "error", "text": str(e)}))

    threading.Thread(target=worker, daemon=True).start()

    def event_stream():
        while True:
            msg = q.get()
            # Parse JSON progress messages and only forward minimal batch info
            try:
                obj = json.loads(msg)
                if obj.get("type") == "progress":
                    out = json.dumps({"type": "batch", "batch": obj.get("batch"), "total": obj.get("total_batches")})
                    yield f"data: {out}\n\n"
                    continue
                # pass through done/error and other messages
                yield f"data: {json.dumps(obj)}\n\n"
                if obj.get("type") in ("done", "error"):
                    break
            except Exception:
                # if message isn't JSON, forward raw
                yield f"data: {msg}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
