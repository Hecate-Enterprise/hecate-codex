from fastapi import APIRouter, HTTPException, status

from src.api.v1.dependencies import DbSession, Pagination
from src.models.category import Category
from src.repositories.base import BaseRepository
from src.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from src.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[CategoryResponse])
async def list_categories(db: DbSession, pagination: Pagination):
    repo = BaseRepository(db, Category)
    items = await repo.get_all(skip=pagination.skip, limit=pagination.page_size)
    total = await repo.count()
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        pages=(total + pagination.page_size - 1) // pagination.page_size,
    )


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(db: DbSession, data: CategoryCreate):
    repo = BaseRepository(db, Category)
    return await repo.create(data.model_dump())


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(db: DbSession, category_id: int):
    repo = BaseRepository(db, Category)
    category = await repo.get(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(db: DbSession, category_id: int, data: CategoryUpdate):
    repo = BaseRepository(db, Category)
    category = await repo.update(category_id, data.model_dump(exclude_unset=True))
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(db: DbSession, category_id: int):
    repo = BaseRepository(db, Category)
    deleted = await repo.delete(category_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Category not found")
