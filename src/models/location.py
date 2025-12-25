from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.asset import Asset


class Location(Base, TimestampMixin):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"))

    parent: Mapped["Location | None"] = relationship(
        "Location", remote_side=[id], back_populates="children"
    )
    children: Mapped[list["Location"]] = relationship("Location", back_populates="parent")
    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="location")
