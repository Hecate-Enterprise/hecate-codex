from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from src.api.v1.dependencies import DbSession, Pagination
from src.models.asset import Asset, AssetStatus
from src.models.assignment import Assignment
from src.repositories.base import BaseRepository
from src.schemas.asset import (
    AssetAssign,
    AssetCreate,
    AssetResponse,
    AssetReturn,
    AssetUpdate,
)
from src.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[AssetResponse])
async def list_assets(
    db: DbSession,
    pagination: Pagination,
    status: AssetStatus | None = Query(None),
    category_id: int | None = Query(None),
    location_id: int | None = Query(None),
    department_id: int | None = Query(None),
):
    repo = BaseRepository(db, Asset)
    filters = {
        "status": status,
        "category_id": category_id,
        "location_id": location_id,
        "department_id": department_id,
    }
    items = await repo.get_all(
        skip=pagination.skip, limit=pagination.page_size, filters=filters
    )
    total = await repo.count(filters=filters)
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        pages=(total + pagination.page_size - 1) // pagination.page_size,
    )


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(db: DbSession, data: AssetCreate):
    repo = BaseRepository(db, Asset)
    asset_data = data.model_dump()
    if data.purchase_price is not None:
        asset_data["current_value"] = data.purchase_price
    return await repo.create(asset_data)


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(db: DbSession, asset_id: int):
    repo = BaseRepository(db, Asset)
    asset = await repo.get(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(db: DbSession, asset_id: int, data: AssetUpdate):
    repo = BaseRepository(db, Asset)
    asset = await repo.update(asset_id, data.model_dump(exclude_unset=True))
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(db: DbSession, asset_id: int):
    repo = BaseRepository(db, Asset)
    deleted = await repo.delete(asset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Asset not found")


@router.post("/{asset_id}/assign", response_model=AssetResponse)
async def assign_asset(db: DbSession, asset_id: int, data: AssetAssign):
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.status == AssetStatus.ASSIGNED:
        raise HTTPException(status_code=400, detail="Asset is already assigned")

    if asset.status not in (AssetStatus.AVAILABLE, AssetStatus.IN_MAINTENANCE):
        raise HTTPException(
            status_code=400, detail=f"Cannot assign asset with status {asset.status}"
        )

    assignment = Assignment(
        asset_id=asset_id,
        assignee_id=data.assignee_id,
        assignee_name=data.assignee_name,
        notes=data.notes,
    )
    db.add(assignment)
    asset.status = AssetStatus.ASSIGNED
    await db.flush()
    await db.refresh(asset)
    return asset


@router.post("/{asset_id}/return", response_model=AssetResponse)
async def return_asset(db: DbSession, asset_id: int, data: AssetReturn):
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.status != AssetStatus.ASSIGNED:
        raise HTTPException(status_code=400, detail="Asset is not currently assigned")

    result = await db.execute(
        select(Assignment)
        .where(Assignment.asset_id == asset_id, Assignment.returned_at.is_(None))
        .order_by(Assignment.assigned_at.desc())
        .limit(1)
    )
    current_assignment = result.scalar_one_or_none()

    if current_assignment:
        current_assignment.returned_at = datetime.now(timezone.utc)
        if data.notes:
            current_assignment.notes = (
                f"{current_assignment.notes}\nReturn: {data.notes}"
                if current_assignment.notes
                else f"Return: {data.notes}"
            )

    asset.status = AssetStatus.AVAILABLE
    await db.flush()
    await db.refresh(asset)
    return asset
