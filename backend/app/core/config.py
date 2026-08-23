from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Prescripto - Doctor Prescription & Pharmacy Management System"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "prescripto_super_secret_jwt_key_2026_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # ── Razorpay Payment Gateway Config ───────────────────────────────────────
    RAZORPAY_KEY_ID: str = "rzp_live_ShxcWH099cPOXb"
    RAZORPAY_KEY_SECRET: str = "pfJYGdFtL00KVRXHr0Vn8vFW"

    # ── MongoDB Atlas ─────────────────────────────────────────────────────────
    # Supports both MONGODB_URL (new) and MONGO_URI (legacy) env var names
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGO_URI: str = ""  # legacy alias — used as fallback

    MONGODB_DB_NAME: str = "prescripto"
    MONGO_DB_NAME: str = ""  # legacy alias

    # ── Server ────────────────────────────────────────────────────────────────
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    model_config = SettingsConfigDict(
        case_sensitive=False,
        env_file=".env",
        extra="ignore"
    )

    def get_mongo_url(self) -> str:
        """Returns MongoDB connection URL, preferring Atlas URI if set."""
        url = self.MONGO_URI if (self.MONGO_URI and self.MONGO_URI.startswith("mongodb")) else self.MONGODB_URL
        if url.startswith("mongo_url="):
            url = url.replace("mongo_url=", "", 1)
        return url

    def get_mongo_db(self) -> str:
        """Returns MongoDB database name."""
        if self.MONGO_DB_NAME:
            return self.MONGO_DB_NAME
        return self.MONGODB_DB_NAME


settings = Settings()
