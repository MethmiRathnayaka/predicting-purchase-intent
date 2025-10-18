from google.cloud import bigquery  # type: ignore
import requests
import json
import uuid
import time
from datetime import datetime
from app.utils.config import RUNPOD_API_KEY, RUNPOD_ENDPOINT
import math
from typing import Callable, Optional


bq_client = bigquery.Client(project="mindful-ship-474319-g8")
BATCH_SIZE = 50
MODEL_NAME = "mistralai/Mistral-7B-v0.3"


def chunk_list(lst, n):
  """Yield successive n-sized chunks from a list."""
  for i in range(0, len(lst), n):
    yield lst[i:i + n]


def infer_intent_for_dataset(dataset_name: str, sample_size: int = 200, progress_cb: Optional[Callable[[str], None]] = None):
  """
  Fetches a sample of orders from BigQuery (default 200 rows), batches them,
  sends to RunPod vLLM endpoint for intent inference, and writes results
  back to BigQuery.

  Args:
    dataset_name: BigQuery dataset name (e.g. `project.dataset`).
    sample_size: Number of rows to sample from the source table (default 200).
    progress_cb: Optional callable that receives JSON-serializable strings for progress updates.
  """
  # Ensure sample_size is a positive integer
  sample_size = max(0, int(sample_size))

  query = f"SELECT order_id, products FROM `{dataset_name}.orders_grouped` LIMIT {sample_size};"
  rows = list(bq_client.query(query).result())
  all_orders = [{"order_id": r["order_id"], "products": r["products"]} for r in rows]

  run_id = str(uuid.uuid4())
  table_id = f"{dataset_name}.intent_inference_results"

  if not all_orders:
    msg = json.dumps({"type": "info", "text": f"No orders found in `{dataset_name}.orders_grouped` (sample_size={sample_size})."})
    print(msg)
    if progress_cb:
      try:
        progress_cb(msg)
      except Exception:
        pass
    return

  total_batches = math.ceil(len(all_orders) / BATCH_SIZE)
  for idx, batch in enumerate(chunk_list(all_orders, BATCH_SIZE)):
    # progress: batch start
    msg = json.dumps({"type": "progress", "text": f"🔹 Processing batch {idx+1}/{total_batches}", "batch": idx+1, "total_batches": total_batches})
    print(msg)
    if progress_cb:
      try:
        progress_cb(msg)
      except Exception:
        pass

    prompt = (
      "You are an intent inference model. Your task is to analyze a list of shopping orders and deduce the most specific, high-level intent behind each one.\n\n"
      "* The inferred intent must be a concise phrase, no more than 2–3 words.\n"
      "* Be as specific as possible. Instead of \"Clothing Shopping,\" consider \"Planning a wedding outfit.\"\n"
      "  Instead of \"Grocery Shopping,\" consider \"Baking a cake\" or \"Making chili.\"\n"
      "* If the intent is truly impossible to determine, you may use the phrase \"unknown intent.\"\n\n"
      "**Input Format:**\n"
      "```json\n"
      + json.dumps(batch, indent=2)
      + "\n```\n\n"
      "Please output a JSON array of objects with the shape: [{\"order_id\": <order_id>, \"intent\": \"<inferred intent>\"}]\n"
    )

    try:
      body = {
        "model": "TheBloke/Mistral-7B-Instruct-v0.1-AWQ",
        "prompt": prompt,
        "max_tokens": 512,
        "temperature": 0.3,
        "stream": False,
      }

      headers = {
        "Authorization": f"Bearer {RUNPOD_API_KEY}",
        "Content-Type": "application/json",
      }

      response = requests.post(
        RUNPOD_ENDPOINT,
        data=json.dumps(body),
        headers=headers,
        timeout=180,
      )

      # Print raw response text for debugging/visibility (show even on HTTP error)
      try:
        print("Model response text:", response.text)
      except Exception:
        pass
      response.raise_for_status()

      output = response.json()
      if "output" in output and "text" in output["output"]:
        intents = json.loads(output["output"]["text"])
      else:
        err = json.dumps({"type": "error", "text": "Unexpected response format from model", "response": output})
        print(err)
        if progress_cb:
          try:
            progress_cb(err)
          except Exception:
            pass
        continue

      rows_to_insert = [
        {
          "order_id": r["order_id"],
          "intent": r["intent"],
          "model": MODEL_NAME,
          "run_id": run_id,
          "created_at": datetime.utcnow().isoformat(),
        }
        for r in intents
      ]

      bq_client.insert_rows_json(table_id, rows_to_insert)
      inserted_msg = json.dumps({"type": "inserted", "count": len(rows_to_insert), "batch": idx + 1})
      print(inserted_msg)
      if progress_cb:
        try:
          progress_cb(inserted_msg)
        except Exception:
          pass

    except Exception as e:
      # Try to capture model response body for debugging
      response_text = None
      try:
        response_text = response.text  # type: ignore
      except Exception:
        try:
          response_text = getattr(e, "response", None) and getattr(e.response, "text", None)  # type: ignore
        except Exception:
          response_text = None

      err_payload = {"type": "error", "text": f"Batch {idx+1} failed: {e}", "batch": idx + 1}
      if response_text:
        err_payload["response_text"] = response_text

      err_msg = json.dumps(err_payload)
      print(err_msg)
      if progress_cb:
        try:
          progress_cb(err_msg)
        except Exception:
          pass
      # stop processing on first error
      return

  done_msg = json.dumps({"type": "done", "text": f"Inference completed for dataset: {dataset_name}", "run_id": run_id})
  print(done_msg)
  if progress_cb:
    try:
      progress_cb(done_msg)
    except Exception:
      pass
