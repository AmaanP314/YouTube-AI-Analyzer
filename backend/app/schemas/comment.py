from pydantic import BaseModel
from typing import List, Optional

class Comment(BaseModel):
    Author: str
    CommentText: str
    LikeCount: int
    PublishDate: str
    AuthorLogoUrl: str
    SortBy: str

class CommentList(BaseModel):
    results: List[Comment]

class CommentsInput(BaseModel):
    comments: List[str]

class Sentiment(BaseModel):
    label: str

class SentimentsResponse(BaseModel):
    results: List[str]