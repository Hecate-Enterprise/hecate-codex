from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.asset import Asset


class MaintenanceType(str, Enum):
    PREVENTIVE = "preventive"
    CORRECTIVE = "corrective"
    INSPECTION = "inspection"
    UPGRADE = "upgrade"


class MaintenanceRecord(Base, TimestampMixin):
    __tablename__ = "maintenance_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    maintenance_type: Mapped[MaintenanceType] = mapped_column(default=MaintenanceType.PREVENTIVE)
    description: Mapped[str | None] = mapped_column(Text)
    scheduled_date: Mapped[date | None] = mapped_column(Date)
    completed_date: Mapped[date | None] = mapped_column(Date)
    cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    performed_by: Mapped[str | None] = mapped_column(String(200))
    notes: Mapped[str | None] = mapped_column(Text)

    asset: Mapped["Asset"] = relationship("Asset", back_populates="maintenance_records")


class MaintenanceSchedule(Base, TimestampMixin):
    __tablename__ = "maintenance_schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    frequency_days: Mapped[int] = mapped_column(Integer, nullable=False)
    last_performed: Mapped[date | None] = mapped_column(Date)
    next_due: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)

    asset: Mapped["Asset"] = relationship("Asset", back_populates="maintenance_schedules")
