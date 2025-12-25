from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from src.models.maintenance import MaintenanceType


class MaintenanceRecordBase(BaseModel):
    maintenance_type: MaintenanceType = MaintenanceType.PREVENTIVE
    description: str | None = None
    scheduled_date: date | None = None
    completed_date: date | None = None
    cost: Decimal | None = None
    performed_by: str | None = None
    notes: str | None = None


class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass


class MaintenanceRecordUpdate(BaseModel):
    maintenance_type: MaintenanceType | None = None
    description: str | None = None
    scheduled_date: date | None = None
    completed_date: date | None = None
    cost: Decimal | None = None
    performed_by: str | None = None
    notes: str | None = None


class MaintenanceRecordResponse(MaintenanceRecordBase):
    id: int
    asset_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MaintenanceScheduleBase(BaseModel):
    description: str
    frequency_days: int
    next_due: date
    is_active: bool = True


class MaintenanceScheduleCreate(MaintenanceScheduleBase):
    pass


class MaintenanceScheduleUpdate(BaseModel):
    description: str | None = None
    frequency_days: int | None = None
    next_due: date | None = None
    is_active: bool | None = None


class MaintenanceScheduleResponse(MaintenanceScheduleBase):
    id: int
    asset_id: int
    last_performed: date | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
