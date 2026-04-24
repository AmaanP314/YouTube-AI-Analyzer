from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from .db import crud, models
from .db.database import SessionLocal, engine, get_db
from .schemas import video as video_schema
from .schemas import comment as comment_schema
from .services import comments_analysis, video_analysis, youtube_search

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="YouTube Analysis API",
    description="An API to search, analyze, and get insights from YouTube videos and comments.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:3000"],
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Welcome to the YouTube Analysis API"}

# --- Search Endpoints ---

@app.get("/search", 
         response_model=video_schema.VideoSearchResponse, 
         tags=["search"],
         responses={
            404: {"model": video_schema.ErrorDetailResponse, "description": "No results found"},
            500: {"model": video_schema.ErrorDetailResponse, "description": "Internal server error"}
        })
async def search(
    query: str,
    max_results: int = Query(5, ge=1, le=50),
    page_token: str = None,
):
    try:
        results_df, next_page_token = await youtube_search.search_youtube(query, max_results=max_results, page_token=page_token)
        
        if results_df.empty:
            return JSONResponse(
                status_code=404,
                content={"message": f"No YouTube videos found for query: '{query}'", 
                         "results": {"videos": [], 
                         "nextPageToken": None}}
            )

        results = {
            "videos": results_df.to_dict(orient="records"),
            "nextPageToken": next_page_token
        } 
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting sentiments: {str(e)}")

@app.get(
    '/video/{video_id}',
    summary="Get YouTube Video Details",
    description="Fetches details of a YouTube video by its ID, including title, description, thumbnail URL, and channel information.",
    response_model=video_schema.SingleVideoResponse,
    tags=["Video"],
    responses={
        404: {"model": video_schema.ErrorDetailResponse, "description": "Video not found"},
        500: {"model": video_schema.ErrorDetailResponse, "description": "Internal server error"}
    }
)
async def get_video_details(video_id: str):
    try:
        video_details = await youtube_search.search_video(video_id)
        if video_details.empty:
            print(f"No video found or an issue occurred for video ID: {video_id}")
            return JSONResponse(
                status_code=404,
                content={"message": f"No YouTube videos found for videoId: '{video_id}'", 
                         "results": {}}
            )
        return {"results": video_details.to_dict(orient="records")[0]}
    except Exception as e:
        print(f"An unexpected error occurred while fetching video details for {video_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")

# --- Video Endpoints ---

@app.get("/video/transcript/{video_id}", 
         response_model=video_schema.Transcript, 
         tags=["Video"],
         description="Fetches the full transcript of a YouTube video by its ID, using cached data or retrieving it from the source.",
         responses={
        404: {"model": video_schema.ErrorDetailResponse, "description": "Transcript not found or unavailable for the given video ID."},
        500: {"model": video_schema.ErrorDetailResponse, "description": "Internal server error during transcript retrieval."}
    })
async def get_video_transcript(video_id: str, db: Session = Depends(get_db)):
    try:
        transcript = await video_analysis.get_transcript(db, video_id)
        return {
            "results": transcript,
            "length": len(transcript),
            "word_count": len(transcript.split())
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=404, 
            detail=f"{ve}" 
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=500, 
            detail=f"{re}" 
        )
    except Exception as e:
        print(f"An unexpected error occurred in get_video_transcript endpoint for {video_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An unknown internal error occurred: {str(e)}")


@app.get("/video/summarize/{video_id}", 
         response_model=video_schema.Summary, 
         tags=["Video"],
         description="Generates a concise summary of a YouTube video's transcript by its ID, using cached data or an LLM if needed.",
         responses={
            404: {"model": video_schema.ErrorDetailResponse, "description": "Video transcript not found or could not be summarized."},
            500: {"model": video_schema.ErrorDetailResponse, "description": "Internal server error during video summarization."}
         })
async def video_summary(
    video_id: str,
    title: str = Query(default="", description="Title of the YouTube video"),
    channel_name: str = Query(default="", description="Name of the YouTube channel"),
    db: Session = Depends(get_db)
):
    try:
        summary = await video_analysis.summarize_video(db, video_id, title, channel_name)
        return {"results": summary}
    except ValueError as ve:
        raise HTTPException(
            status_code=404, 
            detail=f"{ve}"
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=500, 
            detail=f"{re}"
        )
    except Exception as e:
        print(f"An unexpected error occurred in video_summary endpoint for {video_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An unknown internal error occurred: {str(e)}")

@app.get("/video/qa/{video_id}", 
         response_model=video_schema.QAResponse, 
         tags=["Video"],
         description="Provides answers to specific questions based on the YouTube video's transcript content, utilizing an LLM and vector store.",
         responses={
            404: {"model": video_schema.ErrorDetailResponse, "description": "Video transcript not found, or could not be processed/summarized, or no answer could be generated."},
            500: {"model": video_schema.ErrorDetailResponse, "description": "Internal server error during question answering process."}
        })
async def video_qa(
    video_id: str,
    question: str = Query(..., description="Question to ask about the video comments"),
    db: Session = Depends(get_db)
):
    try:
        answer = await video_analysis.answer_video_question(db, video_id, question)
        return {"results": answer}
    except ValueError as ve:
        raise HTTPException(
            status_code=404, 
            detail=f"{ve}"
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=500, 
            detail=f"{re}"
        )
    except Exception as e:
        print(f"An unexpected error occurred in video_qa endpoint for {video_id} with question '{question}': {e}")
        raise HTTPException(status_code=500, detail=f"An unknown internal error occurred: {str(e)}")


@app.post("/video/summarize-from-content",
          response_model=video_schema.Summary,
          tags=["Video"],
          description="Receives raw transcript XML from the client, processes, and returns a summary.",
          responses={
             400: {"model": video_schema.ErrorDetailResponse, "description": "Invalid input data"},
             500: {"model": video_schema.ErrorDetailResponse, "description": "Internal server error"}
         })
async def summarize_from_content(request: video_schema.SummarizeFromContentRequest, db: Session = Depends(get_db)):
    try:
        # Use .model_dump() for Pydantic v2+ or .dict() for v1
        summary = await video_analysis.summarize_from_xml_content(db, request.model_dump())
        return {"results": summary}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=500, detail=str(re))
    except Exception as e:
        print(f"An unexpected error occurred in summarize_from_content: {e}")
        raise HTTPException(status_code=500, detail="An unknown internal error occurred.")

# --- Comment Endpoints ---

@app.get("/comments/{video_id}", 
         response_model=comment_schema.CommentList, 
         tags=["Comments"],
         responses={
        404: {"model": video_schema.ErrorDetailResponse, "description": "No comments found"},
        500: {"model": video_schema.ErrorDetailResponse, "description": "Internal server error"}
    })
async def get_comments(video_id: str):
    try:
        comments = await comments_analysis.extract_comments(video_id)
        if not comments:
            print(f"No comments found or an issue occurred for video ID: {video_id}")
            return JSONResponse(
                status_code=404,
                content={"message": f"No comments found for videoId: '{video_id}'",
                         "results": []}
            )
        return {"results": comments}
    except Exception as e:
        print(f"An unexpected error occurred while fetching comments for {video_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")

@app.post(
    "/comments/sentiments",
    response_model=comment_schema.SentimentsResponse, 
    summary="Get Sentiments for Comments",
    description="Takes a list of comments and returns a list of sentiments for each comment by calling an external sentiment analysis API.",
    tags=["Comments"],
    responses={
        400: {"model": video_schema.ErrorDetailResponse, "description": "Invalid input (e.g., no comments provided) or external API returned empty sentiments for valid input."},
        500: {"model": video_schema.ErrorDetailResponse, "description": "Internal server error or issues communicating with the external sentiment API."}
    }
)
async def comments_sentiments(input_data: comment_schema.CommentsInput):
    try:
        sentiments = await youtube_search.get_sentiments(input_data.comments)
        return {"results": sentiments}
    except ValueError as ve:
        raise HTTPException(
            status_code=400, 
            detail=f"{ve}"
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=500, 
            detail=f"{re}"
        )
    except Exception as e:
        print(f"An unexpected error occurred in comments_sentiments endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"An unknown internal error occurred: {str(e)}")

    
@app.get("/comments/summarize/{video_id}", 
         response_model=video_schema.Summary, 
         tags=["Comments"],
         description="Generates a summary of YouTube comments for a given video ID, using cached data if available. Leverages an LLM for summarization.",
         responses={
        404: {"model": video_schema.ErrorDetailResponse, "description": "Comments not found or could not be processed for summarization"},
        500: {"model": video_schema.ErrorDetailResponse, "description": "Internal server error during summarization"}
    })
async def comment_summary(
    video_id: str,
    title: str = Query(default="", description="Title of the YouTube video"),
    channel_name: str = Query(default="", description="Name of the YouTube channel"),
    db: Session = Depends(get_db)
):
    try:
        summary = await comments_analysis.summarize_comments(db, video_id, title, channel_name)
        if not summary:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Summary could not be generated or was empty for videoId: '{video_id}'", 
                            "results": {}} 
                )
        return {"results": summary}
    except ValueError as ve:
        # This catches the ValueError raised from summarize_comments if no valid comments were found
        raise HTTPException(
            status_code=404, 
            detail=f"{ve}" # Use the message from the raised ValueError
        )
    except RuntimeError as re:
        # This catches the RuntimeError raised from summarize_comments for other internal issues
        raise HTTPException(
            status_code=500, 
            detail=f"{re}" # Use the message from the raised RuntimeError
        )
    except Exception as e:
        # Catch any unexpected exceptions that weren't caught by the specific ones above
        print(f"An unexpected error occurred in comment_summary endpoint for {video_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An unknown internal error occurred: {str(e)}")

@app.get("/comments/qa/{video_id}", 
         response_model=video_schema.QAResponse, 
         tags=["Comments"],
         description="Provides answers to specific questions based on the YouTube comments of a given video, utilizing an LLM and vector store. Includes an optional summary from cached data.",
         responses={
        404: {"model": video_schema.ErrorDetailResponse, "description": "Video comments not found, or could not be processed/summarized, or no answer could be generated."},
        500: {"model": video_schema.ErrorDetailResponse, "description": "Internal server error during question answering process."}
    })
async def comment_qa(
    video_id: str,
    question: str = Query(..., description="Question to ask about the video comments"),
    db: Session = Depends(get_db)
):
    try:
        answer = await comments_analysis.answer_question(db, video_id, question)
        return {"results": answer}
    except ValueError as ve:
        # Catches ValueErrors from service functions (e.g., no comments, LLM couldn't answer)
        raise HTTPException(
            status_code=404, 
            detail=f"{ve}"
        )
    except RuntimeError as re:
        # Catches RuntimeErrors from service functions (e.g., internal LLM error, vectorstore issue)
        raise HTTPException(
            status_code=500, 
            detail=f"{re}"
        )
    except Exception as e:
        # General catch-all for any other unforeseen issues
        print(f"An unexpected error occurred in comment_qa endpoint for {video_id} with question '{question}': {e}")
        raise HTTPException(status_code=500, detail=f"An unknown internal error occurred: {str(e)}")