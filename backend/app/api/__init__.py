from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.clinic import router as clinic_router
from app.api.patients import router as patients_router
from app.api.inventory import router as inventory_router
from app.api.prescriptions import router as prescriptions_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(clinic_router)
api_router.include_router(patients_router)
api_router.include_router(inventory_router)
api_router.include_router(prescriptions_router)
