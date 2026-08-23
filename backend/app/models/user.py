"""MongoDB stub — replaces SQLAlchemy User ORM model."""
from app.models.enums import UserRole
# Re-export for backward compat with schema imports
__all__ = ["UserRole"]
