from fastapi import APIRouter, HTTPException, status

from src.api.v1.dependencies import DbSession, Pagination
from src.models.vendor import Vendor
from src.repositories.base import BaseRepository
from src.schemas.common import PaginatedResponse
from src.schemas.vendor import VendorCreate, VendorResponse, VendorUpdate

router = APIRouter()


@router.get("", response_model=PaginatedResponse[VendorResponse])
async def list_vendors(db: DbSession, pagination: Pagination):
    repo = BaseRepository(db, Vendor)
    items = await repo.get_all(skip=pagination.skip, limit=pagination.page_size)
    total = await repo.count()
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        pages=(total + pagination.page_size - 1) // pagination.page_size,
    )


@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(db: DbSession, data: VendorCreate):
    repo = BaseRepository(db, Vendor)
    return await repo.create(data.model_dump())


@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(db: DbSession, vendor_id: int):
    repo = BaseRepository(db, Vendor)
    vendor = await repo.get(vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.put("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(db: DbSession, vendor_id: int, data: VendorUpdate):
    repo = BaseRepository(db, Vendor)
    vendor = await repo.update(vendor_id, data.model_dump(exclude_unset=True))
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor(db: DbSession, vendor_id: int):
    repo = BaseRepository(db, Vendor)
    deleted = await repo.delete(vendor_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Vendor not found")
