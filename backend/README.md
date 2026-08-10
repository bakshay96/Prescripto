# Prescripto Backend API

Python FastAPI backend with SQLAlchemy (PostgreSQL / SQLite) + Strawberry GraphQL + MongoDB ODM schemas.

## Requirements
- Python 3.11+
- Dependencies listed in `requirements.txt`

## Running Backend Server
```bash
py -m uvicorn app.main:app --reload
```
Interactive REST API Documentation: http://127.0.0.1:8000/docs
GraphQL IDE: http://127.0.0.1:8000/graphql

## Running Automated Tests
```bash
py -m pytest tests/
```
