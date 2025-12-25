import io

import qrcode
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from src.api.v1.dependencies import DbSession
from src.models.asset import Asset

router = APIRouter()


@router.get("/assets/{asset_id}/qrcode")
async def generate_qrcode(
    db: DbSession,
    asset_id: int,
    size: int = Query(default=10, ge=1, le=40),
    border: int = Query(default=4, ge=0, le=10),
):
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=size,
        border=border,
    )

    qr_data = f"ASSET:{asset.asset_tag}|ID:{asset.id}|NAME:{asset.name}"
    qr.add_data(qr_data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="image/png",
        headers={"Content-Disposition": f"inline; filename=asset_{asset.asset_tag}_qr.png"},
    )
