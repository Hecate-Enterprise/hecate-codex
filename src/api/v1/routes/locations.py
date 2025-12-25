from fastapi import APIRouter, HTTPException, status

from src.api.v1.dependencies import DbSession, Pagination
from src.models.location import Location
from src.repositories.base import BaseRepository
from src.schemas.common import PaginatedResponse
from src.schemas.location import LocationCreate, LocationResponse, LocationUpdate

router = APIRouter()


@router.get("", response_model=PaginatedResponse[LocationResponse])
async def list_locations(db: DbSession, pagination: Pagination):
    repo = BaseRepository(db, Location)
    items = await repo.get_all(skip=pagination.skip, limit=pagination.page_size)
    total = await repo.count()
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        pages=(total + pagination.page_size - 1) // pagination.page_size,
    )


@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(db: DbSession, data: LocationCreate):
    repo = BaseRepository(db, Location)
    return await repo.create(data.model_dump())


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(db: DbSession, location_id: int):
    repo = BaseRepository(db, Location)
    location = await repo.get(location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(db: DbSession, location_id: int, data: LocationUpdate):
    repo = BaseRepository(db, Location)
    location = await repo.update(location_id, data.model_dump(exclude_unset=True))
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(db: DbSession, location_id: int):
    repo = BaseRepository(db, Location)
    deleted = await repo.delete(location_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Location not found")
