from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class DepreciationEntryResponse(BaseModel):
    id: int
    asset_id: int
    period_start: date
    period_end: date
    depreciation_amount: Decimal
    accumulated_depreciation: Decimal
    book_value: Decimal

    model_config = {"from_attributes": True}


class DepreciationSummary(BaseModel):
    asset_id: int
    asset_name: str
    asset_tag: str
    purchase_price: Decimal | None
    purchase_date: date | None
    current_book_value: Decimal | None
    total_depreciation: Decimal
    depreciation_method: str
    useful_life_years: int | None


class DepreciationCalculation(BaseModel):
    period_start: date
    period_end: date
