from datetime import datetime

from pydantic import BaseModel

from src.models.category import DepreciationMethod


class CategoryBase(BaseModel):
    name: str
    description: str | None = None
    depreciation_method: DepreciationMethod = DepreciationMethod.STRAIGHT_LINE
    useful_life_years: int | None = None
    salvage_value_percent: int = 0
    parent_id: int | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    depreciation_method: DepreciationMethod | None = None
    useful_life_years: int | None = None
    salvage_value_percent: int | None = None
    parent_id: int | None = None


class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
