from datetime import datetime

from pydantic import BaseModel


class DepartmentBase(BaseModel):
    name: str
    code: str | None = None
    parent_id: int | None = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    parent_id: int | None = None


class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
