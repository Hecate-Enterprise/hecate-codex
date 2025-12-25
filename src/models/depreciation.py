from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.asset import Asset


class DepreciationEntry(Base, TimestampMixin):
    __tablename__ = "depreciation_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    depreciation_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    accumulated_depreciation: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    book_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    asset: Mapped["Asset"] = relationship("Asset", back_populates="depreciation_entries")
