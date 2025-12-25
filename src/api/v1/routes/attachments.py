import os
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from src.api.v1.dependencies import DbSession
from src.core.config import settings
from src.models.asset import Asset
from src.models.attachment import Attachment
from src.schemas.attachment import AttachmentResponse

router = APIRouter()


@router.get("/assets/{asset_id}/attachments", response_model=list[AttachmentResponse])
async def list_attachments(db: DbSession, asset_id: int):
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    await db.refresh(asset, ["attachments"])
    return asset.attachments


@router.post(
    "/assets/{asset_id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_attachment(db: DbSession, asset_id: int, file: UploadFile):
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if file.size and file.size > settings.max_upload_size:
        raise HTTPException(
            status_code=413, detail=f"File too large. Max size: {settings.max_upload_size} bytes"
        )

    upload_dir = Path(settings.upload_dir) / str(asset_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix if file.filename else ""
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / unique_filename

    content = await file.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    attachment = Attachment(
        asset_id=asset_id,
        filename=unique_filename,
        original_filename=file.filename or "unknown",
        file_path=str(file_path),
        mime_type=file.content_type or "application/octet-stream",
        file_size=len(content),
    )
    db.add(attachment)
    await db.flush()
    await db.refresh(attachment)
    return attachment


@router.get("/attachments/{attachment_id}")
async def download_attachment(db: DbSession, attachment_id: int):
    attachment = await db.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.original_filename,
        media_type=attachment.mime_type,
    )


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(db: DbSession, attachment_id: int):
    attachment = await db.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)

    await db.delete(attachment)
    await db.flush()
