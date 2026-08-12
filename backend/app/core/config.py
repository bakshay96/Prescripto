from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Prescripto - Doctor Prescription & Pharmacy Management System"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = "prescripto_super_secret_key_change_in_production_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    DATABASE_URL: str = "sqlite:///./prescripto.db"
    
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "prescripto_db"
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "prescripto"

    HOST: str = "127.0.0.1"
    PORT: int = 8080

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
