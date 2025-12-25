from typing import Annotated

from fastapi import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db

DbSession = Annotated[AsyncSession, Depends(get_db)]


class PaginationParams:
    def __init__(
        self,
        page: Annotated[int, Query(ge=1)] = 1,
        page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    ):
        self.page = page
        self.page_size = page_size
        self.skip = (page - 1) * page_size


Pagination = Annotated[PaginationParams, Depends()]
