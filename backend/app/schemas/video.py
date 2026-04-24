from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Video(BaseModel):
    Title: str
    Channel: str
    Subscribers: int
    Views: int
    Likes: int
    Likes_percentage: float
    Duration: str
    Upload_date: datetime
    Comments: int
    Video_link: str
    Thumbnail: str
    Channel_Thumbnail: str
    Description: str


class VideosAndNextPage(BaseModel):
    videos: List[Video]
    nextPageToken: Optional[str] = None

class VideoSearchResponse(BaseModel):
    results: VideosAndNextPage

class ErrorDetailResponse(BaseModel):
    detail: str

class SingleVideoResponse(BaseModel):
    results: Video

class Transcript(BaseModel):
    results: str
    length: int
    word_count: int

class Summary(BaseModel):
    results: str

class QAResponse(BaseModel):
    results: str

class SummarizeFromContentRequest(BaseModel):
    transcript_xml: str
    video_id: str
    title: str
    channel_name: str