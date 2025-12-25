from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.asset import Asset
from src.models.category import DepreciationMethod
from src.models.depreciation import DepreciationEntry


async def calculate_straight_line_depreciation(
    purchase_price: Decimal,
    salvage_value: Decimal,
    useful_life_years: int,
    period_start: date,
    period_end: date,
) -> Decimal:
    if useful_life_years <= 0:
        return Decimal("0")

    annual_depreciation = (purchase_price - salvage_value) / useful_life_years
    days_in_period = (period_end - period_start).days + 1
    daily_depreciation = annual_depreciation / Decimal("365")
    return (daily_depreciation * days_in_period).quantize(Decimal("0.01"))


async def calculate_declining_balance_depreciation(
    book_value: Decimal,
    useful_life_years: int,
    period_start: date,
    period_end: date,
    rate_multiplier: Decimal = Decimal("2"),
) -> Decimal:
    if useful_life_years <= 0:
        return Decimal("0")

    annual_rate = rate_multiplier / useful_life_years
    annual_depreciation = book_value * annual_rate
    days_in_period = (period_end - period_start).days + 1
    daily_depreciation = annual_depreciation / Decimal("365")
    return (daily_depreciation * days_in_period).quantize(Decimal("0.01"))


async def calculate_depreciation_for_asset(
    db: AsyncSession,
    asset: Asset,
    period_start: date,
    period_end: date,
) -> DepreciationEntry | None:
    if not asset.purchase_price or not asset.category:
        return None

    category = asset.category
    if category.depreciation_method == DepreciationMethod.NONE:
        return None

    result = await db.execute(
        select(DepreciationEntry)
        .where(DepreciationEntry.asset_id == asset.id)
        .order_by(DepreciationEntry.period_end.desc())
        .limit(1)
    )
    last_entry = result.scalar_one_or_none()

    if last_entry:
        current_book_value = last_entry.book_value
        accumulated = last_entry.accumulated_depreciation
    else:
        current_book_value = asset.purchase_price
        accumulated = Decimal("0")

    useful_life = category.useful_life_years or 5
    salvage_percent = category.salvage_value_percent or 0
    salvage_value = asset.purchase_price * Decimal(salvage_percent) / 100

    if current_book_value <= salvage_value:
        return None

    if category.depreciation_method == DepreciationMethod.STRAIGHT_LINE:
        depreciation_amount = await calculate_straight_line_depreciation(
            asset.purchase_price, salvage_value, useful_life, period_start, period_end
        )
    else:
        depreciation_amount = await calculate_declining_balance_depreciation(
            current_book_value, useful_life, period_start, period_end
        )

    new_book_value = max(current_book_value - depreciation_amount, salvage_value)
    actual_depreciation = current_book_value - new_book_value

    entry = DepreciationEntry(
        asset_id=asset.id,
        period_start=period_start,
        period_end=period_end,
        depreciation_amount=actual_depreciation,
        accumulated_depreciation=accumulated + actual_depreciation,
        book_value=new_book_value,
    )

    return entry
