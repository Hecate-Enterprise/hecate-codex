from datetime import date
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.assignment import Assignment
    from src.models.attachment import Attachment
    from src.models.category import Category
    from src.models.department import Department
    from src.models.depreciation import DepreciationEntry
    from src.models.location import Location
    from src.models.maintenance import MaintenanceRecord, MaintenanceSchedule
    from src.models.vendor import Vendor


class AssetStatus(str, Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    IN_MAINTENANCE = "in_maintenance"
    RETIRED = "retired"
    DISPOSED = "disposed"


class Asset(Base, TimestampMixin):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    asset_tag: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    serial_number: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[AssetStatus] = mapped_column(default=AssetStatus.AVAILABLE)

    purchase_date: Mapped[date | None] = mapped_column(Date)
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    current_value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    warranty_expiry: Mapped[date | None] = mapped_column(Date)

    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"))
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"))
    vendor_id: Mapped[int | None] = mapped_column(ForeignKey("vendors.id"))

    category: Mapped["Category | None"] = relationship("Category", back_populates="assets")
    location: Mapped["Location | None"] = relationship("Location", back_populates="assets")
    department: Mapped["Department | None"] = relationship("Department", back_populates="assets")
    vendor: Mapped["Vendor | None"] = relationship("Vendor", back_populates="assets")

    assignments: Mapped[list["Assignment"]] = relationship(
        "Assignment", back_populates="asset", order_by="desc(Assignment.assigned_at)"
    )
    maintenance_records: Mapped[list["MaintenanceRecord"]] = relationship(
        "MaintenanceRecord", back_populates="asset"
    )
    maintenance_schedules: Mapped[list["MaintenanceSchedule"]] = relationship(
        "MaintenanceSchedule", back_populates="asset"
    )
    attachments: Mapped[list["Attachment"]] = relationship("Attachment", back_populates="asset")
    depreciation_entries: Mapped[list["DepreciationEntry"]] = relationship(
        "DepreciationEntry", back_populates="asset"
    )
