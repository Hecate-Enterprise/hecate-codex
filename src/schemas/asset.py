from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from src.models.asset import AssetStatus


class AssetBase(BaseModel):
    name: str
    asset_tag: str
    serial_number: str | None = None
    description: str | None = None
    status: AssetStatus = AssetStatus.AVAILABLE
    purchase_date: date | None = None
    purchase_price: Decimal | None = None
    warranty_expiry: date | None = None
    category_id: int | None = None
    location_id: int | None = None
    department_id: int | None = None
    vendor_id: int | None = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: str | None = None
    asset_tag: str | None = None
    serial_number: str | None = None
    description: str | None = None
    status: AssetStatus | None = None
    purchase_date: date | None = None
    purchase_price: Decimal | None = None
    current_value: Decimal | None = None
    warranty_expiry: date | None = None
    category_id: int | None = None
    location_id: int | None = None
    department_id: int | None = None
    vendor_id: int | None = None


class AssetResponse(AssetBase):
    id: int
    current_value: Decimal | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssetAssign(BaseModel):
    assignee_id: str
    assignee_name: str | None = None
    notes: str | None = None


class AssetReturn(BaseModel):
    notes: str | None = None
