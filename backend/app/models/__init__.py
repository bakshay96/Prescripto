"""
MongoDB-compatible model package.
All SQLAlchemy ORM has been removed.
Enums are available via app.models.enums.
"""
from app.models.enums import (
    UserRole,
    GenderEnum,
    PrescriptionStatus,
    SubscriptionPlan,
    TransactionType,
    QueryStatus,
)

__all__ = [
    "UserRole",
    "GenderEnum",
    "PrescriptionStatus",
    "SubscriptionPlan",
    "TransactionType",
    "QueryStatus",
]
