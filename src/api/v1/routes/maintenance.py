from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from src.api.v1.dependencies import DbSession, Pagination
from src.models.asset import Asset
from src.models.maintenance import MaintenanceRecord, MaintenanceSchedule
from src.repositories.base import BaseRepository
from src.schemas.common import PaginatedResponse
from src.schemas.maintenance import (
    MaintenanceRecordCreate,
    MaintenanceRecordResponse,
    MaintenanceRecordUpdate,
    MaintenanceScheduleCreate,
    MaintenanceScheduleResponse,
    MaintenanceScheduleUpdate,
)

router = APIRouter()


@router.get("/upcoming", response_model=list[MaintenanceScheduleResponse])
async def get_upcoming_maintenance(
    db: DbSession,
    days: int = Query(default=30, ge=1, le=365),
):
    cutoff = date.today()
    result = await db.execute(
        select(MaintenanceSchedule)
        .where(
            MaintenanceSchedule.is_active == True,
            MaintenanceSchedule.next_due <= date.fromordinal(cutoff.toordinal() + days),
        )
        .order_by(MaintenanceSchedule.next_due)
    )
    return result.scalars().all()


@router.get(
    "/assets/{asset_id}/maintenance", response_model=PaginatedResponse[MaintenanceRecordResponse]
)
async def list_asset_maintenance(db: DbSession, asset_id: int, pagination: Pagination):
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    repo = BaseRepository(db, MaintenanceRecord)
    items = await repo.get_all(
        skip=pagination.skip, limit=pagination.page_size, filters={"asset_id": asset_id}
    )
    total = await repo.count(filters={"asset_id": asset_id})
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        pages=(total + pagination.page_size - 1) // pagination.page_size,
    )


@router.post(
    "/assets/{asset_id}/maintenance",
    response_model=MaintenanceRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_maintenance_record(db: DbSession, asset_id: int, data: MaintenanceRecordCreate):
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    repo = BaseRepository(db, MaintenanceRecord)
    record_data = data.model_dump()
    record_data["asset_id"] = asset_id
    return await repo.create(record_data)


@router.get("/records/{record_id}", response_model=MaintenanceRecordResponse)
async def get_maintenance_record(db: DbSession, record_id: int):
    record = await db.get(MaintenanceRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    return record


@router.put("/records/{record_id}", response_model=MaintenanceRecordResponse)
async def update_maintenance_record(
    db: DbSession, record_id: int, data: MaintenanceRecordUpdate
):
    repo = BaseRepository(db, MaintenanceRecord)
    record = await repo.update(record_id, data.model_dump(exclude_unset=True))
    if not record:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    return record


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_maintenance_record(db: DbSession, record_id: int):
    repo = BaseRepository(db, MaintenanceRecord)
    deleted = await repo.delete(record_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Maintenance record not found")


@router.get(
    "/assets/{asset_id}/schedules", response_model=list[MaintenanceScheduleResponse]
)
async def list_asset_schedules(db: DbSession, asset_id: int):
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    result = await db.execute(
        select(MaintenanceSchedule).where(MaintenanceSchedule.asset_id == asset_id)
    )
    return result.scalars().all()


@router.post(
    "/assets/{asset_id}/schedules",
    response_model=MaintenanceScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_maintenance_schedule(
    db: DbSession, asset_id: int, data: MaintenanceScheduleCreate
):
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    repo = BaseRepository(db, MaintenanceSchedule)
    schedule_data = data.model_dump()
    schedule_data["asset_id"] = asset_id
    return await repo.create(schedule_data)


@router.put("/schedules/{schedule_id}", response_model=MaintenanceScheduleResponse)
async def update_maintenance_schedule(
    db: DbSession, schedule_id: int, data: MaintenanceScheduleUpdate
):
    repo = BaseRepository(db, MaintenanceSchedule)
    schedule = await repo.update(schedule_id, data.model_dump(exclude_unset=True))
    if not schedule:
        raise HTTPException(status_code=404, detail="Maintenance schedule not found")
    return schedule


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_maintenance_schedule(db: DbSession, schedule_id: int):
    repo = BaseRepository(db, MaintenanceSchedule)
    deleted = await repo.delete(schedule_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Maintenance schedule not found")
