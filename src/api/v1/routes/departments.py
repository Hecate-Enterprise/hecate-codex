from fastapi import APIRouter, HTTPException, status

from src.api.v1.dependencies import DbSession, Pagination
from src.models.department import Department
from src.repositories.base import BaseRepository
from src.schemas.common import PaginatedResponse
from src.schemas.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate

router = APIRouter()


@router.get("", response_model=PaginatedResponse[DepartmentResponse])
async def list_departments(db: DbSession, pagination: Pagination):
    repo = BaseRepository(db, Department)
    items = await repo.get_all(skip=pagination.skip, limit=pagination.page_size)
    total = await repo.count()
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        pages=(total + pagination.page_size - 1) // pagination.page_size,
    )


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(db: DbSession, data: DepartmentCreate):
    repo = BaseRepository(db, Department)
    return await repo.create(data.model_dump())


@router.get("/{department_id}", response_model=DepartmentResponse)
async def get_department(db: DbSession, department_id: int):
    repo = BaseRepository(db, Department)
    department = await repo.get(department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department


@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(db: DbSession, department_id: int, data: DepartmentUpdate):
    repo = BaseRepository(db, Department)
    department = await repo.update(department_id, data.model_dump(exclude_unset=True))
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(db: DbSession, department_id: int):
    repo = BaseRepository(db, Department)
    deleted = await repo.delete(department_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Department not found")
