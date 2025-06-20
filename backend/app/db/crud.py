from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from . import models

def get_video_by_id(db: Session, video_id: str):
    return db.query(models.VideoStore).filter(models.VideoStore.video_id == video_id).first()

def get_or_create_video_store(db: Session, video_id: str) -> models.VideoStore:
    """
    Retrieves a VideoStore entry by video_id, or creates it if it doesn't exist.
    Handles race conditions during creation.
    """
    db_video = get_video_by_id(db, video_id)
    if db_video:
        return db_video
    
    # If not found, attempt to create
    db_video = models.VideoStore(video_id=video_id)
    db.add(db_video)
    try:
        db.commit()
        db.refresh(db_video)
        return db_video
    except IntegrityError:
        # If another concurrent transaction just created this video_id,
        # rollback the current failed transaction and fetch the existing one.
        db.rollback()
        # Fetch the existing object that was created by the concurrent transaction
        existing_video = get_video_by_id(db, video_id)
        if existing_video:
            return existing_video
        else:
            # Fallback for very rare edge cases or if something else went wrong
            raise RuntimeError(f"Failed to get or create video store for {video_id} after IntegrityError.")

def update_transcript(db: Session, video_id: str, transcript: str):
    db_video = get_video_by_id(db, video_id)
    if db_video:
        db_video.transcript = transcript
        db.commit()
        db.refresh(db_video)
    return db_video

def update_video_summary(db: Session, video_id: str, summary: str):
    db_video = get_video_by_id(db, video_id)
    if db_video:
        db_video.video_summary = summary
        db.commit()
        db.refresh(db_video)
    return db_video

def update_comment_summary(db: Session, video_id: str, summary: str):
    db_video = get_video_by_id(db, video_id)
    if db_video:
        db_video.comment_summary = summary
        db.commit()
        db.refresh(db_video)
    return db_video