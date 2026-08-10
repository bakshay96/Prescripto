from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field

class MedicineBase(BaseModel):
    name: str
    category: str
    stock_quantity: int = Field(ge=0, description="Current available stock in inventory")
    price: float = Field(ge=0.0, description="Unit price of the medicine")
    expiry_date: date
    batch_number: str
    unit: str = "Tablets"
    min_stock_alert: int = 10

class MedicineCreate(MedicineBase):
    pass

class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0.0)
    expiry_date: Optional[date] = None
    batch_number: Optional[str] = None
    unit: Optional[str] = None
    min_stock_alert: Optional[int] = None

class RestockInput(BaseModel):
    quantity: int = Field(gt=0, description="Quantity to add to stock")
    notes: Optional[str] = "Manual restock"

class StockAdjustmentInput(BaseModel):
    quantity_change: int = Field(description="Positive to add, negative to remove")
    reason: str = Field(description="Reason for adjustment: e.g., Damaged, Expired")

class MedicineOut(MedicineBase):
    id: str
    clinic_id: str
    is_low_stock: bool
    is_expired: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
