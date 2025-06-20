from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain.schema import Document
from langchain.chains import RetrievalQA
from langchain.chains.summarize import load_summarize_chain
from langchain.prompts import PromptTemplate
import aiohttp
import re
import os
from sqlalchemy.orm import Session
from ..db import crud
import dotenv
dotenv.load_dotenv()

API_KEY_COMMENTS = os.getenv('API_KEY_COMMENTS')
API_KEY_VIDEO = os.getenv('API_KEY_VIDEO')
BASE_URL = "https://www.googleapis.com/youtube/v3"
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
embed_model = "models/embedding-001"

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash-lite",
    google_api_key=GOOGLE_API_KEY,
    temperature=0.3,
    max_output_tokens=2048
)

embedding_model = GoogleGenerativeAIEmbeddings(
    google_api_key=GOOGLE_API_KEY,
    model=embed_model
)

local_cache = {}

async def fetch_comments_data(video_id, max_results=100, order="relevance"):
    url = f"{BASE_URL}/commentThreads?part=snippet&videoId={video_id}&key={API_KEY_COMMENTS}&maxResults={max_results}&order={order}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                return await response.json()
            return None

async def fetch_channel_details(channel_id):
    url = f"{BASE_URL}/channels?part=snippet%2CcontentDetails%2Cstatistics&id={channel_id}&key={API_KEY_VIDEO}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                result = await response.json()
                if result["items"]:
                    return result["items"][0].get("statistics", {})
            return {}

async def fetch_video_details(video_id):
    video_details_url = f"{BASE_URL}/videos?part=snippet,statistics,contentDetails&id={video_id}&key={API_KEY_VIDEO}"
    async with aiohttp.ClientSession() as session:
        async with session.get(video_details_url) as response:
            if response.status == 200:
                result = await response.json()
                if result["items"]:
                    video_details = result["items"][0]
                    return video_details
            return None

async def extract_comments(video_id):
    if video_id in local_cache and "Comments" in local_cache[video_id]:
        print(f"Using cached comments for video ID: {video_id}")
        return local_cache[video_id]["Comments"]

    video = await fetch_video_details(video_id)
    if not video:
        return []

    com_cnt = int(video['statistics']['commentCount']) if 'commentCount' in video['statistics'] else 0
    
    all_comments = []

    # Fetch comments by relevance
    if com_cnt > 0:
        com_data_rel = await fetch_comments_data(video_id, min(100, com_cnt), "relevance")
        if com_data_rel and "items" in com_data_rel:
            for item in com_data_rel["items"]:
                snippet = item["snippet"]["topLevelComment"]["snippet"]
                all_comments.append({
                    "Author": snippet["authorDisplayName"],
                    "CommentText": snippet["textOriginal"],
                    "LikeCount": snippet["likeCount"],
                    "PublishDate": snippet["publishedAt"],
                    "AuthorLogoUrl": snippet["authorProfileImageUrl"],
                    "SortBy": "relevance"
                })

    # Fetch additional comments by time if needed
    if com_cnt > 100:
        remaining_comments = com_cnt - len(all_comments)
        if remaining_comments > 0:
            com_data_time = await fetch_comments_data(video_id, min(100, remaining_comments), "time")
            if com_data_time and "items" in com_data_time:
                for item in com_data_time["items"]:
                    snippet = item["snippet"]["topLevelComment"]["snippet"]
                    all_comments.append({
                        "Author": snippet["authorDisplayName"],
                        "CommentText": snippet["textOriginal"],
                        "LikeCount": snippet["likeCount"],
                        "PublishDate": snippet["publishedAt"],
                        "AuthorLogoUrl": snippet["authorProfileImageUrl"],
                        "SortBy": "time"
                    })

    # Initialize cache structure for this video
    if video_id not in local_cache:
        local_cache[video_id] = {}
    local_cache[video_id]["Comments"] = all_comments
    return all_comments

def remove_links(comment):
    return re.sub(r'https?://\S+|www\.\S+', '', comment).strip()

def has_multiple_timestamps(comment):
    timestamps = re.findall(r'\d{1,2}(:\d{2}){1,3}', comment)
    return len(timestamps) > 3

def has_char_timestamps(comment):
    pattern = r'^\s*\d{1,2}(:\d{2}){1,3}[\s\u200B]*[-:|]*[\s\u200B]+[a-zA-Z]{2,}.*$'
    matches = re.findall(pattern, comment, flags=re.MULTILINE)
    return len(matches) > 3

def is_code_heavy(comment):
    comment = comment.strip()
    high_signal_keywords = re.findall(
        r'\b(def|class|return|import|lambda|function|const|var|=>|try|except|elif)\b',
        comment
    )
    code_structures = re.findall(r'(==|===|{|}|\[|\]|::|->|=)', comment)
    indented_lines = re.findall(r'^\s{4,}', comment, re.MULTILINE)
    num_lines = comment.count('\n') + 1
    score = 0
    if len(high_signal_keywords) >= 2:
        score += 2
    if len(code_structures) >= 3:
        score += 2
    if len(indented_lines) >= 2:
        score += 2
    if num_lines >= 3:
        score += 1
    if len(high_signal_keywords) > 0 and len(code_structures) > 0:
        score += 1
    return score >= 5

def clean_and_filter_comment(comment):
    comment = remove_links(comment)
    if is_code_heavy(comment):
        return None
    if has_multiple_timestamps(comment) and not has_char_timestamps(comment):
        return None
    if len(comment.strip()) == 0:
        return None
    return comment.strip()

def process_comments(comment_list):
    cleaned_comments = []
    for comment in comment_list:
        cleaned = clean_and_filter_comment(comment)
        if cleaned:
            cleaned_comments.append(cleaned)
    return cleaned_comments

def format_comment(comment):
    return f"{comment['Author']}: {comment['CommentText']} (Likes: {comment['LikeCount']})"

custom_prompt = PromptTemplate(
    input_variables=["text", "title", "channel_name"],
    template="""
IMPORTANT: Keep your entire response under 1000 tokens. Be concise. Focus on essential insights. Avoid over-explaining or repeating.

You are a critical and insightful assistant summarizing YouTube comments.
You are summarizing the comment section of a video titled: "{title}", published by the channel: "{channel_name}".
Your tasks are to:
1. **Summarize**: Identify and summarize the main opinions, reactions, and themes across the comments. 
2. **Highlight**: Highlight praise, criticism, and any notable disagreements or debates.
3. **Spot Interesting Comments**: Mention particularly insightful, surprising, or unique perspectives, especially if they contrast with the general opinion.
4. **Fact Check**: Identify any factual claims made in the comments. For each claim:
   - Evaluate whether it's accurate, misleading, false, or unverifiable.
   - Reference widely accepted knowledge or consensus to support your evaluation.
   - When possible, include the author's handle (e.g., @username) for clarity.

Return your output in this format:

**Summary of Opinions**: ...
**Common Themes & Sentiments**: ...
**Notable or Unique Comments**: ...
**Fact Check Notes**:
  - @username: "Comment content or claim..." → ✅ True / ❌ False
   - Explanation: Only if a comment is False

Comments are shown below, with author names starting with @:
{text}

Summary:
"""
)

def chunk_comments(comments, chunk_size=20):
    chunks = []
    for i in range(0, len(comments), chunk_size):
        chunk = comments[i:i + chunk_size]
        if chunk:
            chunks.append(Document(page_content="\n".join(chunk)))
    return chunks

def get_qa_prompt(summary):
    qa_prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=f"""
You are a sharp and knowledge-driven assistant analyzing YouTube comments.

Here is a summary of the comment section:
{summary}

Here are the most relevant comment chunks, with author names:
{{context}}

Answer the following question based on the comments, but also incorporate your broader reasoning, factual understanding, and critical thinking.

Your response should:
- **Be direct, honest, and grounded in fact and logic**.
- If commenters make false or unsupported claims, clearly point them out and explain why.
- If a comment makes a valid point or well-reasoned argument, acknowledge and explain it.
- Avoid vague disclaimers like "this is just their opinion" unless it's truly subjective with no clear reasoning path.
- Reference author handles (e.g., @username) or comment snippets for clarity when helpful.

Question: {{question}}

Answer:
"""
    )
    return qa_prompt

async def ensure_processed_comments(video_id):
    """Ensure comments are processed and cached for a video."""
    if video_id not in local_cache:
        local_cache[video_id] = {}
    
    # Check if processed comments are already cached
    if "ProcessedComments" in local_cache[video_id]:
        return local_cache[video_id]["ProcessedComments"]
    try:
        # Get raw comments (will use cache if available)
        comments = await extract_comments(video_id)
        if not comments:
            raise ValueError("No raw comments found for processing.")
        
        # Process and cache the formatted/cleaned comments
        formatted_comments = [format_comment(comment) for comment in comments]
        cleaned_comments = process_comments(formatted_comments)
        if not cleaned_comments:
            raise ValueError("No valid comments found after cleaning.")
        
        local_cache[video_id]["ProcessedComments"] = cleaned_comments
        return cleaned_comments
    except ValueError as ve:
        raise ve
    except Exception as e:
        print(f"An unexpected error occurred during comment processing for {video_id}: {e}")
        raise RuntimeError(f"Failed to process comments due to an internal issue: {str(e)}")

async def summarize_comments(db: Session, video_id: str, title: str = '', channel_name: str = ''):
    """Checking if Comments Summary already exist in DB"""
    cached_video = crud.get_or_create_video_store(db, video_id)
    if cached_video and cached_video.comment_summary:
        print(f"Using cached comment summary for video ID: {video_id}")
        return cached_video.comment_summary
    try:
        cleaned_comments = await ensure_processed_comments(video_id)
        if not cleaned_comments:
            raise ValueError("No valid comments found after cleaning for summarization.")
        
        comment_text = "\n\n".join(cleaned_comments)
        all_comments_docs = Document(page_content=comment_text)

        summary_chain = load_summarize_chain(llm=llm, chain_type="stuff", prompt=custom_prompt)
        response = summary_chain.invoke({
            "input_documents": [all_comments_docs],
            "title": title,
            "channel_name": channel_name
        })
        summary = response['output_text'].strip()

        # Cache the summary in the database
        crud.update_comment_summary(db, video_id=video_id, summary=summary)
        
        return summary
    except ValueError as ve:
        raise ve
    except Exception as e:
        print(f"An unexpected error occurred during comment summarization for {video_id}: {e}")
        raise RuntimeError(f"Failed to generate summary due to an internal issue: {str(e)}")

async def answer_question(db: Session, video_id: str, question: str):
    try:
        """Answer questions based on comments, using DB for summary cache."""
        summary = await summarize_comments(db, video_id)

        processed_comments = await ensure_processed_comments(video_id)
        if not processed_comments:
            raise ValueError("No comments available to answer the question after processing.")

        # Check for a cached vectorstore
        if local_cache.get(video_id, {}).get("comment_vectorstore"):
            print(f"Using local cache for comment vectorstore for video ID: {video_id}")
            vectorstore = local_cache[video_id]["comment_vectorstore"]
        else:
            print(f"Creating and caching comment vectorstore for video ID: {video_id}")
            if not processed_comments:
                raise ValueError("Cannot create vectorstore: No cleaned comments available.")
            chunked_docs = chunk_comments(processed_comments)
            vectorstore = FAISS.from_documents(chunked_docs, embedding_model)
            local_cache.setdefault(video_id, {})["comment_vectorstore"] = vectorstore

        qa_prompt = get_qa_prompt(summary)
        retriever = vectorstore.as_retriever()
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm, retriever=retriever, chain_type="stuff",
            chain_type_kwargs={"prompt": qa_prompt},
        )
        
        answer = qa_chain.invoke(question)
        if not answer:
            raise ValueError("LLM could not provide a meaningful answer to the question.")
        return answer['result']
    except (ValueError, RuntimeError) as e:
        # Re-raise specific exceptions from sub-functions (summarize_comments, ensure_processed_comments)
        raise e 
    except Exception as e:
        print(f"Error answering comment question: {e}")
        # Transform general exceptions into a RuntimeError for the API layer
        raise RuntimeError(f"Error processing question: {str(e)}")