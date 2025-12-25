from fastapi import APIRouter

from src.api.v1.routes import (
    assets,
    attachments,
    categories,
    departments,
    depreciation,
    locations,
    maintenance,
    qrcode,
    vendors,
)

router = APIRouter()

router.include_router(assets.router, prefix="/assets", tags=["Assets"])
router.include_router(categories.router, prefix="/categories", tags=["Categories"])
router.include_router(locations.router, prefix="/locations", tags=["Locations"])
router.include_router(departments.router, prefix="/departments", tags=["Departments"])
router.include_router(vendors.router, prefix="/vendors", tags=["Vendors"])
router.include_router(maintenance.router, prefix="/maintenance", tags=["Maintenance"])
router.include_router(attachments.router, tags=["Attachments"])
router.include_router(qrcode.router, tags=["QR Codes"])
router.include_router(depreciation.router, tags=["Depreciation"])
