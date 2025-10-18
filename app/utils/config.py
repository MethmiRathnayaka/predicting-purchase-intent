import os
from dotenv import load_dotenv

load_dotenv()

RUNPOD_ENDPOINT = os.getenv("RUNPOD_ENDPOINT", "https://api.runpod.io/v2/your-endpoint")
RUNPOD_API_KEY = os.getenv("RUNPOD_API_KEY", "your-api-key")