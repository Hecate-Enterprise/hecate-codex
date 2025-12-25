from src.models.base import Base
from src.models.asset import Asset
from src.models.category import Category
from src.models.location import Location
from src.models.department import Department
from src.models.vendor import Vendor
from src.models.assignment import Assignment
from src.models.maintenance import MaintenanceRecord, MaintenanceSchedule
from src.models.attachment import Attachment
from src.models.depreciation import DepreciationEntry

__all__ = [
    "Base",
    "Asset",
    "Category",
    "Location",
    "Department",
    "Vendor",
    "Assignment",
    "MaintenanceRecord",
    "MaintenanceSchedule",
    "Attachment",
    "DepreciationEntry",
]
