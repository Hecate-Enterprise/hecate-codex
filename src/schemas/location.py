from datetime import datetime

from pydantic import BaseModel


class LocationBase(BaseModel):
    name: str
    address: str | None = None
    parent_id: int | None = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    parent_id: int | None = None


class LocationResponse(LocationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
