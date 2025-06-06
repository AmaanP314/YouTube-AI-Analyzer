from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from youtube_search import search_youtube, get_sentiments, search_video
from comment_QA import extract_comments, summarize_comments, answer_question, get_cache_stats
from video_QA import get_transcript, summarize_video, answer_video_question, get_transcript_preview, get_video_cache_stats
app = FastAPI()

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "YouTube Search API is running"}

# Search endpoint with pagination
@app.get("/search")
async def search(
    query: str = Query(..., description="Search query for YouTube videos"),
    max_results: int = Query(5, ge=1, le=50, description="Number of videos to retrieve per page"),
    page_token: str = Query(None, description="Token for the next page of results (for pagination)")
):
    """
    Search YouTube for videos matching the query with pagination.
    """
    try:
        results_df, next_page_token = await search_youtube(query, max_results=max_results, page_token=page_token)
        
        if results_df.empty:
            return {"results": {"videos": [], "nextPageToken": None}}

        results = {
            "videos": results_df.to_dict(orient="records"),
            "nextPageToken": next_page_token
        } 
        return {"results": results}
    except Exception as e:
        return {"error": str(e)}

@app.get('/video/{video_id}',
    summary="Get YouTube Video Details",
    description="Fetches details of a YouTube video by its ID, including title, description, thumbnail URL, and channel information.",
    tags=["Video"]
)
async def get_video_details(video_id: str):
    """
    Get details of a YouTube video by its ID.
    """
    try:
        video_details = await search_video(video_id)
        if video_details.empty:
            print(f"No video found or an issue occurred for video ID: {video_id}")
            return {"results": {}}
        return {"results": video_details.to_dict(orient="records")[0]}
    except Exception as e:
        return {"error": str(e)}

@app.get(
    "/comments/{video_id}",
    summary="Get YouTube Comments",
    description="Fetches a list of comments for a given YouTube video ID, including author, text, likes, publish date, and author logo URL.",
    tags=["Comments"]
)
async def get_comments(video_id: str):
    try:
        comments = await extract_comments(video_id)
        if not comments:
            print(f"No comments found or an issue occurred for video ID: {video_id}")
            return {"results": []}
        return {"results": comments}
    except Exception as e:
        return {"error": str(e)}

class CommentsInput(BaseModel):
    comments: List[str]

@app.post(
    "/comments/sentiments",
    summary="Get Sentiments for Comments",
    description="Takes a list of comments and returns a list of sentiments for each comment.",
    tags=["Comments"]
)
async def comments_sentiments(input_data: CommentsInput):
    try:
        sentiments = await get_sentiments(input_data.comments)
        if not sentiments:
            return JSONResponse(
                status_code=404,
                content={"message": "No sentiments returned", "results": []}
            )
        return {"results": sentiments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting sentiments: {str(e)}")

@app.get(
    "/comments/summarize/{video_id}",
    summary="Summarize YouTube Comments",
    description="Summarizes the comments of a YouTube video by its ID. Uses caching for improved performance.",
    tags=["Comments"]
)
async def comment_summary(video_id: str):
    """Generate a summary of YouTube video comments."""
    try:
        summary = await summarize_comments(video_id)
        if isinstance(summary, dict) and "error" in summary:
            return JSONResponse(
                status_code=404,
                content={"message": summary["error"], "results": None}
            )
        if not summary:
            return JSONResponse(
                status_code=404,
                content={"message": f"No summary available for video ID: {video_id}", "results": None}
            )
        return {"results": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating comment summary: {str(e)}")

@app.get(
    "/comments/qa/{video_id}",
    summary="Comment Question Answering",
    description="Answers questions based on the comments of a YouTube video by its ID. Uses RAG with caching.",
    tags=["Comments"]
)
async def comment_qa(
    video_id: str, 
    question: str = Query(..., description="Question to ask about the video comments")
):
    """Answer questions based on YouTube video comments."""
    try:
        answer = await answer_question(video_id, question)
        if isinstance(answer, dict) and "error" in answer:
            return JSONResponse(
                status_code=404,
                content={"message": answer["error"], "results": None}
            )
        if not answer:
            return JSONResponse(
                status_code=404,
                content={"message": f"No answer available for video ID: {video_id}", "results": None}
            )
        return {"results": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error answering question: {str(e)}")

@app.get(
    "/video/transcript/{video_id}",
    summary="Get Video Transcript",
    description="Fetches the transcript of a YouTube video with timestamps.",
    tags=["Video"]
)   
def get_video_transcript(video_id: str):
    """Get the full transcript of a YouTube video."""
    try:
        transcript = get_transcript(video_id)
        if not transcript:
            print(f"No transcript found or an issue occurred for video ID: {video_id}")
            return {"results": ''}
        return {
            "results": transcript,
            "length": len(transcript),
            "word_count": len(transcript.split())
        }
    except Exception as e:
        return {"error": str(e)}

@app.get(
    "/video/summarize/{video_id}",
    summary="Summarize Video Content",
    description="Summarizes the content of a YouTube video based on its transcript. Uses caching for improved performance.",
    tags=["Video"]
)
async def video_summary(video_id: str):
    """Generate a summary of YouTube video content."""
    try:
        summary = await summarize_video(video_id)
        if isinstance(summary, dict) and "error" in summary:
            return JSONResponse(
                status_code=404,
                content={"message": summary["error"], "results": None}
            )
        if not summary:
            return JSONResponse(
                status_code=404,
                content={"message": f"No summary available for video ID: {video_id}", "results": None}
            )
        return {"results": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating video summary: {str(e)}")

@app.get(
    "/video/qa/{video_id}",
    summary="Video Question Answering",
    description="Answers questions based on the content of a YouTube video transcript. Uses RAG with caching.",
    tags=["Video"]
)
async def video_qa(
    video_id: str, 
    question: str = Query(..., description="Question to ask about the video content")
):
    """Answer questions based on YouTube video content."""
    try:
        answer = await answer_video_question(video_id, question)
        if isinstance(answer, dict) and "error" in answer:
            return JSONResponse(
                status_code=404,
                content={"message": answer["error"], "results": None}
            )
        if not answer:
            return JSONResponse(
                status_code=404,
                content={"message": f"No answer available for video ID: {video_id}", "results": None}
            )
        return {"results": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error answering question: {str(e)}")

@app.get(
    "/cache/preview/{video_id}",
    summary="Preview Cached Data",
    description="Get a preview of cached transcript and comment data for debugging.",
    tags=["Cache Management"]
)
async def cache_preview(video_id: str):
    """Get a preview of cached data for debugging."""
    try:
        transcript_preview = get_transcript_preview(video_id)
        comment_stats = get_cache_stats().get(video_id, {})
        video_stats = get_video_cache_stats().get(video_id, {})
        
        return {
            "video_id": video_id,
            "transcript_preview": transcript_preview,
            "comment_cache_info": comment_stats,
            "video_cache_info": video_stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting cache preview: {str(e)}")

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"message": "Endpoint not found", "detail": str(exc)}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error", "detail": str(exc)}
    )