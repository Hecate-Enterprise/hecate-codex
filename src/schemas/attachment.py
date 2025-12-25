from datetime import datetime

from pydantic import BaseModel


class AttachmentResponse(BaseModel):
    id: int
    asset_id: int
    filename: str
    original_filename: str
    mime_type: str
    file_size: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}
