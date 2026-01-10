from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

class BaseTable(SQLModel):
    """
    Base SQLModel for all database tables.
    Includes UUID primary key and timestamp mixins.
    """
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
