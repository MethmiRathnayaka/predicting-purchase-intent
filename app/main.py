from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
import os

load_dotenv()  # loads the variables from .env into os.environ

from app.routes.upload import router as upload_router
# from app.routes.process import router as process_router
# from app.routes.powerbi import router as powerbi_router

app = FastAPI(title="Basket Intent Demo")

app.include_router(upload_router)
# app.include_router(process_router)
# app.include_router(powerbi_router)