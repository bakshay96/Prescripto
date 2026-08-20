"""
Prescripto Backend — FastAPI Application Entry Point.
Database: Pure MongoDB — no SQLAlchemy/SQLite anywhere.
"""
import sys
import os
import threading

# Force UTF-8 encoding on Windows console to avoid codec errors
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from app.core.config import settings
from app.core.database import ping_db, ensure_indexes, is_pymongo_available
from app.api import api_router
from app.graphql.schema import schema

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="Prescripto — Doctor, Pharmacy & Admin Management (MongoDB backend).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)
graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")


@app.on_event("startup")
def startup_event():
    """Print startup banner. MongoDB check runs in background thread to not block startup."""
    sep = "=" * 65
    print("")
    print(sep)
    print("  PRESCRIPTO HEALTHCARE BACKEND INITIALIZATION")
    print(sep)
    print("  [STATUS]    Server             : STARTING...")
    print(f"  [SERVER]    API Documentation  : http://{settings.HOST}:{settings.PORT}/docs")
    print(f"  [SERVER]    GraphQL Playground  : http://{settings.HOST}:{settings.PORT}/graphql")
    print(sep)
    print("")

    # Run MongoDB check in background so startup completes immediately
    def _bg_check():
        try:
            mongo_url = settings.get_mongo_url()
            db_name = settings.get_mongo_db()
            url_display = mongo_url[:40] + "..." if len(mongo_url) > 40 else mongo_url
            print(f"  [MONGODB]   Connecting to   : {url_display}")
            print(f"  [MONGODB]   Database        : {db_name}")
            connected = ping_db()
            status = "CONNECTED [OK]" if connected else "OFFLINE (check URL/credentials)"
            print(f"  [MONGODB]   Status          : {status}")
            if connected:
                ok = ensure_indexes()
                print(f"  [INDEXES]   {'CREATED / VERIFIED' if ok else 'SKIPPED'}")
            print("  [VITALS]    READY TO SERVE DATA")
        except Exception as e:
            print(f"  [MONGODB]   ERROR - {str(e)[:80]}")

    threading.Thread(target=_bg_check, daemon=True).start()


@app.get("/")
def root():
    return {
        "message": "Prescripto Backend API",
        "database": "MongoDB",
        "pymongo_installed": is_pymongo_available(),
        "docs": "/docs",
        "graphql": "/graphql",
        "version": settings.VERSION,
    }
