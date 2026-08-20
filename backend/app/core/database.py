"""
Prescripto — MongoDB Connection Module (Offline-Safe).
Uses pymongo if available; gracefully degrades otherwise.
"""
try:
    from pymongo import MongoClient, ASCENDING, DESCENDING
    _PYMONGO_AVAILABLE = True
except ImportError:
    MongoClient = None
    ASCENDING = 1
    DESCENDING = -1
    _PYMONGO_AVAILABLE = False

from app.core.config import settings

# ─── Single global client (lazy, non-blocking) ────────────────────────────────
_mongo_client = None
_mongo_db = None


def _get_client():
    global _mongo_client
    if not _PYMONGO_AVAILABLE:
        return None
    if _mongo_client is None:
        mongo_url = settings.get_mongo_url()
        _mongo_client = MongoClient(
            mongo_url,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
            connect=False,
            tlsAllowInvalidCertificates=True,  # needed for some Atlas free clusters
        )
    return _mongo_client


def get_db():
    """Returns the MongoDB database instance."""
    global _mongo_db
    if not _PYMONGO_AVAILABLE:
        raise RuntimeError(
            "pymongo is not installed. Please run:\n"
            "  pip install pymongo\n"
            "Then restart the server."
        )
    if _mongo_db is None:
        client = _get_client()
        db_name = settings.get_mongo_db()
        _mongo_db = client[db_name]
    return _mongo_db


def get_mongo_db():
    """Returns db or None if MongoDB/pymongo unavailable."""
    try:
        return get_db()
    except Exception:
        return None


def ping_db() -> bool:
    """Returns True if MongoDB is reachable."""
    if not _PYMONGO_AVAILABLE:
        return False
    try:
        _get_client().admin.command("ping")
        return True
    except Exception:
        return False


def is_pymongo_available() -> bool:
    return _PYMONGO_AVAILABLE


def ensure_indexes():
    """Create all required MongoDB indexes once on startup."""
    if not _PYMONGO_AVAILABLE:
        return False
    try:
        db = get_db()

        db["users"].create_index([("email", ASCENDING)], unique=True, background=True)
        db["users"].create_index([("clinic_id", ASCENDING)], background=True)

        db["clinics"].create_index([("email", ASCENDING)], background=True)

        db["patients"].create_index([("clinic_id", ASCENDING), ("name", ASCENDING)], background=True)

        db["medicines"].create_index([("clinic_id", ASCENDING), ("name", ASCENDING)], background=True)
        db["medicines"].create_index([("clinic_id", ASCENDING), ("category", ASCENDING)], background=True)

        db["prescriptions"].create_index([("clinic_id", ASCENDING), ("created_at", DESCENDING)], background=True)
        db["prescriptions"].create_index([("patient_id", ASCENDING)], background=True)
        db["prescriptions"].create_index([("prescription_number", ASCENDING)], unique=True, background=True)

        db["stock_transactions"].create_index([("medicine_id", ASCENDING)], background=True)

        db["clinic_profiles"].create_index([("clinic_id", ASCENDING)], unique=True, background=True)

        db["subscriptions"].create_index([("clinic_id", ASCENDING)], unique=True, background=True)

        db["support_queries"].create_index([("status", ASCENDING)], background=True)

        return True
    except Exception:
        return False
