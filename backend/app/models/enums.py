"""
MongoDB-compatible enums and constants.
Replaces SQLAlchemy ORM models — no SQLAlchemy dependency.
"""
from enum import Enum


class UserRole(str, Enum):
    DOCTOR = "DOCTOR"
    PHARMACIST = "PHARMACIST"
    MASTER_ADMIN = "MASTER_ADMIN"


class GenderEnum(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class PrescriptionStatus(str, Enum):
    PENDING = "PENDING"
    DISPENSED = "DISPENSED"
    CANCELLED = "CANCELLED"


class SubscriptionPlan(str, Enum):
    FREE = "FREE"
    BASIC = "BASIC"
    PROFESSIONAL = "PROFESSIONAL"
    ENTERPRISE = "ENTERPRISE"


class TransactionType(str, Enum):
    RESTOCK = "RESTOCK"
    DISPENSED = "DISPENSED"
    ADJUSTMENT = "ADJUSTMENT"
    EXPIRED = "EXPIRED"


class QueryStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
