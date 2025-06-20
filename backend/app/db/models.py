from sqlalchemy import Column, String, Text
from .database import Base

class VideoStore(Base):
    __tablename__ = "video_store"

    video_id = Column(String, primary_key=True, index=True)
    transcript = Column(Text, nullable=True)
    video_summary = Column(Text, nullable=True)
    comment_summary = Column(Text, nullable=True)