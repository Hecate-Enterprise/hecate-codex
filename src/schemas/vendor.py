from datetime import datetime

from pydantic import BaseModel, EmailStr


class VendorBase(BaseModel):
    name: str
    contact_email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    website: str | None = None
    notes: str | None = None


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    name: str | None = None
    contact_email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    website: str | None = None
    notes: str | None = None


class VendorResponse(VendorBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
