from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from app.core.config import settings
from app.core.database import engine, Base
from app.api import api_router
from app.graphql.schema import schema

# Create DB tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="Integrated full-stack healthcare solution bridging clinic operations and pharmacy inventory."
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

@app.get("/")
def root():
    return {
        "message": "Welcome to Prescripto Backend API",
        "docs": "/docs",
        "graphql": "/graphql",
        "version": settings.VERSION
    }
