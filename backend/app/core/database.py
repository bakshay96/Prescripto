from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# MongoDB Atlas Client Initialization
try:
    from pymongo import MongoClient
    mongo_client = MongoClient(settings.MONGO_URI or settings.MONGODB_URL)
    mongo_db = mongo_client[settings.MONGO_DB_NAME or settings.MONGODB_DB_NAME]
except Exception as e:
    mongo_client = None
    mongo_db = None

def get_mongo_db():
    return mongo_db
