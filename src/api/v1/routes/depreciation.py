from decimal import Decimal

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from src.api.v1.dependencies import DbSession
from src.models.asset import Asset
from src.models.category import DepreciationMethod
from src.models.depreciation import DepreciationEntry
from src.schemas.depreciation import (
    DepreciationCalculation,
    DepreciationEntryResponse,
    DepreciationSummary,
)
from src.services.depreciation import calculate_depreciation_for_asset

router = APIRouter()


@router.get("/assets/{asset_id}/depreciation", response_model=list[DepreciationEntryResponse])
async def get_asset_depreciation_history(db: DbSession, asset_id: int):
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    result = await db.execute(
        select(DepreciationEntry)
        .where(DepreciationEntry.asset_id == asset_id)
        .order_by(DepreciationEntry.period_end.desc())
    )
    return result.scalars().all()


@router.post(
    "/assets/{asset_id}/depreciation",
    response_model=DepreciationEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def calculate_depreciation(
    db: DbSession,
    asset_id: int,
    data: DepreciationCalculation,
):
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id).options(selectinload(Asset.category))
    )
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if not asset.purchase_price:
        raise HTTPException(status_code=400, detail="Asset has no purchase price")

    if not asset.category:
        raise HTTPException(status_code=400, detail="Asset has no category")

    entry = await calculate_depreciation_for_asset(db, asset, data.period_start, data.period_end)
    if not entry:
        raise HTTPException(
            status_code=400, detail="Cannot calculate depreciation (fully depreciated or no method)"
        )

    db.add(entry)
    await db.flush()

    asset.current_value = entry.book_value
    await db.flush()
    await db.refresh(entry)

    return entry


@router.get("/reports/depreciation", response_model=list[DepreciationSummary])
async def get_depreciation_report(db: DbSession):
    result = await db.execute(
        select(Asset).options(selectinload(Asset.category)).where(Asset.purchase_price.isnot(None))
    )
    assets = result.scalars().all()

    summaries = []
    for asset in assets:
        dep_result = await db.execute(
            select(func.sum(DepreciationEntry.depreciation_amount)).where(
                DepreciationEntry.asset_id == asset.id
            )
        )
        total_depreciation = dep_result.scalar() or Decimal("0")

        method = (
            asset.category.depreciation_method.value
            if asset.category
            else DepreciationMethod.NONE.value
        )
        useful_life = asset.category.useful_life_years if asset.category else None

        summaries.append(
            DepreciationSummary(
                asset_id=asset.id,
                asset_name=asset.name,
                asset_tag=asset.asset_tag,
                purchase_price=asset.purchase_price,
                purchase_date=asset.purchase_date,
                current_book_value=asset.current_value,
                total_depreciation=total_depreciation,
                depreciation_method=method,
                useful_life_years=useful_life,
            )
        )

    return summaries
