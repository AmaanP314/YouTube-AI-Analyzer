import asyncio
import yt_dlp
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain.schema import Document
from langchain.chains import RetrievalQA
from langchain.chains.summarize import load_summarize_chain
from langchain.prompts import PromptTemplate
import requests
import xml.etree.ElementTree as ET
import os
from sqlalchemy.orm import Session
from ..db import crud

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", google_api_key=GOOGLE_API_KEY)
embeddings = GoogleGenerativeAIEmbeddings(model="gemini-embedding-001", google_api_key=GOOGLE_API_KEY)

local_cache = {}

def parse_subtitle_content(subtitle_content):
    try:
        root = ET.fromstring(subtitle_content)
        transcript = []
        for elem in root.findall('text'):
            start = float(elem.attrib['start'])
            dur = float(elem.attrib.get('dur', 0))
            text = elem.text or ''
            transcript.append({
                'start': start,
                'duration': dur,
                'text': text.replace('\n', ' ')
            })
        return transcript
    except Exception as e:
        print(f"Error parsing subtitle content: {e}")
        return []

# Most reliable method to extract YouTube video transcripts when running locally.
# Transcripts are almost always retrievable if available.
# Note: This method may not work reliably on remote servers, as YouTube often blocks data center IP addresses.
def fetch_transcript(video_id, preferred_langs=['en-orig', 'en']):
    youtube_url = f"https://www.youtube.com/watch?v={video_id}"
    # yt-dlp configuration to only extract subtitles, not download video
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'quiet': True,
        'no_warnings': True,
        'log_warnings': False,
        'format': 'bestaudio/best',
    }

    try:
        # Use yt-dlp to extract video metadata and available subtitles
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(youtube_url, download=False)

            # Collect all caption tracks from both manual and auto subtitles
            all_caption_tracks = {}

            # Add manually provided subtitles to the caption track list
            if 'subtitles' in info_dict:
                for lang, tracks in info_dict['subtitles'].items():
                    if lang not in all_caption_tracks:
                        all_caption_tracks[lang] = []
                    all_caption_tracks[lang].extend(tracks)
            
            # Add auto-generated captions to the caption track list
            if 'automatic_captions' in info_dict:
                for lang, tracks in info_dict['automatic_captions'].items():
                    if lang not in all_caption_tracks:
                        all_caption_tracks[lang] = []
                    all_caption_tracks[lang].extend(tracks)

            best_transcript_url = None
            best_transcript_ext = None

            # Helper: Return the first track with a non-JSON file format
            def find_first_non_json_track(tracks):
                for track in tracks:
                    ext = track.get('ext')
                    if ext not in ['json', 'json3']:
                        return track
                return None # No suitable non-json track found

            # Step 1: Try to find a track in preferred languages
            for p_lang in preferred_langs:
                if p_lang in all_caption_tracks:
                    best_track = find_first_non_json_track(all_caption_tracks[p_lang])
                    if best_track:
                        best_transcript_url = best_track['url']
                        best_transcript_ext = best_track['ext']
                        print(f"Found preferred language '{p_lang}' track with extension '{best_transcript_ext}'.")
                        break # Stop searching once we find a match
                if best_transcript_url:
                    break # Already found a usable track
            
            # Step 2: If no match in preferred languages, fallback to any other available language
            if not best_transcript_url:
                for lang, tracks in all_caption_tracks.items():
                    if 'live_chat' in lang or lang in preferred_langs: 
                        continue 
                    best_track = find_first_non_json_track(tracks)
                    if best_track:
                        best_transcript_url = best_track['url']
                        best_transcript_ext = best_track['ext']
                        print(f"Found any language '{lang}' track with extension '{best_transcript_ext}'.")
                        break
            
            # If a valid transcript URL and extension are found, fetch and parse
            if best_transcript_url and best_transcript_ext:
                try:
                    print(f"Attempting to download transcript from: {best_transcript_url}")
                    response = requests.get(best_transcript_url, stream=True)
                    response.raise_for_status()
                    subtitle_content = response.text # Raw subtitle XML
                    return parse_subtitle_content(subtitle_content) # Convert XML to structured transcript
                except requests.exceptions.RequestException as e:
                    print(f"Error fetching subtitle content from URL {best_transcript_url}: {e}")
                    return []
            else:
                print(f"No suitable non-json/json3 transcript URL found for {youtube_url} after checking all options.")
                all_langs_found = set(all_caption_tracks.keys())
                if all_langs_found:
                    print(f"Available caption languages found in info_dict (including potentially json/live_chat): {', '.join(all_langs_found)}")
                else:
                    print("No caption tracks found at all in the info_dict.")
                return []

    except yt_dlp.utils.DownloadError as e:
        print(f"Error with yt-dlp (e.g., video not found, geo-restricted): {e}")
        return []
    except Exception as e:
        print(f"An unexpected error occurred during yt-dlp extraction: {e}")
        return []

async def get_transcript(db: Session, video_id: str) -> str:
    """Fetch transcript from DB cache or from source, then cache it."""
    cached_video = crud.get_or_create_video_store(db, video_id)
    if cached_video and cached_video.transcript:
        print(f"Using cached transcript for video ID: {video_id}")
        return cached_video.transcript

    print(f"Fetching transcript from source for video ID: {video_id}")
    try:
        loop = asyncio.get_event_loop()
        captions = await loop.run_in_executor(None, fetch_transcript, video_id)
        # captions = fetch_transcript(video_id)
        if not captions:
            raise ValueError(f"No transcript available for video ID: {video_id}")

        formatted_lines = []
        for snippet in captions:
            total_seconds = int(snippet['start'])
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            timestamp = f"({hours:02}:{minutes:02}:{seconds:02})"
            formatted_line = f"{timestamp} {snippet['text']}"
            formatted_lines.append(formatted_line)
        
        full_transcript = " ".join(formatted_lines)

        crud.update_transcript(db, video_id=video_id, transcript=full_transcript)
        return full_transcript
    except ValueError as ve:
        # Re-raise the ValueError indicating no transcript
        raise ve
    except Exception as e:
        # Catch any other unexpected errors during transcript fetching/processing
        print(f"An unexpected error occurred while fetching/processing transcript for {video_id}: {e}")
        raise RuntimeError(f"Failed to retrieve transcript due to an internal issue: {str(e)}")

def chunk_transcript(transcript, chunk_size=1000, overlap=200):
    """Split transcript into overlapping chunks for better context preservation."""
    if not transcript:
        return []
    
    words = transcript.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk_words = words[i:i + chunk_size]
        chunk_text = ' '.join(chunk_words)
        chunks.append(Document(page_content=chunk_text))
        
        # Break if we've reached the end
        if i + chunk_size >= len(words):
            break
    
    return chunks


summary_prompt = PromptTemplate(
    input_variables=["text", "title", "channel_name"],
    template="""
IMPORTANT: Keep your entire response under 1000 tokens. Be concise. Focus on essential insights. Avoid over-explaining or repeating.

You are a helpful and critical-thinking assistant tasked with analyzing and summarizing YouTube video content.

You are summarizing a video titled: "{title}", published by the channel: "{channel_name}".

The input is a transcript of the video formatted as a continuous string. Each sentence is preceded by a timestamp in the format [hh:mm:ss], followed by the spoken text. The entire transcript is space-separated without line breaks.

Example:
(00:00:00) So, I've been coding since 2012, and I (00:00:03) really wish someone told me these 10 (00:00:07) things before I wasted years figuring them out...

Your task is to:
1. **Summarize**: Provide a clear and concise summary of the video content, focusing on the main points, key takeaways, and any critical insights that help someone understand the video's purpose without watching it.

2. **Main Points Covered**: List the main points discussed in the video using bullet points. Include timestamps to indicate when each point is mentioned.

3. **Fact Check**: Evaluate the factual accuracy of claims made by the speaker. For each claim that makes a factual assertion (e.g., dates, statistics, scientific or historical facts), verify if it is true or potentially misleading. Flag inaccuracies or unsupported claims with a note, and provide a short explanation or correction when appropriate.

Return your output in this format:
**Summary**: ...
**Main Points Covered**: ...
**Fact Check Notes**:
  - [hh:mm:ss] Claim: "..." → ✅ True / ❌ False
  - Explanation: ...

**Transcript**:
{text}

**Output**:
"""
)


def get_video_qa_prompt(summary):
    """Create QA prompt template with video summary context and assertive reasoning."""
    qa_prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=f"""
 You are an expert analyst evaluating the content of a YouTube video.

Here is a summary of the video:
{summary}

Here are the most relevant transcript segments:
{{context}}

You will be asked questions about the video content, including factual accuracy, logic, reasoning, and opinions expressed by the speaker.

Your response should:
- Be **honest, direct, and grounded** in general knowledge, logic, and factual correctness.
- **Do not avoid critical analysis** of opinion-based or controversial takes—provide a clear and well-reasoned perspective based on known facts or expert consensus.
- When possible, reference specific timestamps from the transcript.
- Avoid vague disclaimers like "this is subjective" or "it depends" unless no other conclusion is possible.
- If the speaker's take is incorrect, misleading, or lacks evidence, **state that clearly and explain why**.
- If the speaker makes a reasonable or accurate claim, acknowledge that as well.

Question: {{question}}

Answer:
"""
    )
    return qa_prompt


def ensure_processed_transcript(db: Session, video_id: str):
    """Ensure transcript chunks are processed and cached for a video."""
    if video_id not in local_cache:
        local_cache[video_id] = {}
    
    # Check if processed chunks are already cached
    if "TranscriptChunks" in local_cache[video_id]:
        return local_cache[video_id]["TranscriptChunks"]
    
    try:
        transcript = get_transcript(db, video_id)
        chunks = chunk_transcript(transcript)
        if not chunks:
            raise ValueError("No valid transcript chunks could be created for the video.")
        local_cache[video_id]["TranscriptChunks"] = chunks
        return chunks
    except ValueError as ve:
        raise ve
    except Exception as e:
        print(f"An unexpected error occurred during transcript chunk processing for {video_id}: {e}")
        raise RuntimeError(f"Failed to process transcript chunks due to an internal issue: {str(e)}")

async def summarize_video(db: Session, video_id: str, title: str='', channel_name: str=''):
    """Summarize video transcript, using DB for caching."""
    cached_video = crud.get_or_create_video_store(db, video_id)
    if cached_video and cached_video.video_summary:
        print(f"Using cached video summary for video ID: {video_id}")
        return cached_video.video_summary
    try:
        transcript = await get_transcript(db, video_id)
        if not transcript:
            raise ValueError("Transcript not found, cannot summarize.")
        
        transcript_docs = Document(page_content=transcript)
        summary_chain = load_summarize_chain(llm=llm, chain_type="stuff", prompt=summary_prompt)
        response = summary_chain.invoke({
            "input_documents": [transcript_docs],
            "title": title,
            "channel_name": channel_name
        })
        summary = response['output_text'].strip()
        if not summary:
            raise ValueError("LLM returned an empty summary for the video.")
        # Cache the summary in the database
        crud.update_video_summary(db, video_id=video_id, summary=summary)
        
        return summary
    except ValueError as ve:
        # Re-raise ValueErrors that indicate business logic failures (like no transcript or empty summary)
        raise ve
    except Exception as e:
        # Catch any other unexpected errors during the summarization process (e.g., LLM issues)
        print(f"Error creating video summary for {video_id}: {e}")
        raise RuntimeError(f"Error creating summary: {str(e)}")

async def summarize_from_xml_content(db: Session, request_data: dict):
    """
    Processes raw XML transcript from the client, generates a summary, and caches it.
    """
    video_id = request_data.get('video_id')
    transcript_xml = request_data.get('transcript_xml')
    title = request_data.get('title', '')
    channel_name = request_data.get('channel_name', '')

    if not all([video_id, transcript_xml]):
        raise ValueError("Missing video_id or transcript_xml in request.")

    # Check for a cached summary first to save costs
    cached_video = crud.get_or_create_video_store(db, video_id)
    if cached_video and cached_video.video_summary:
        print(f"Using cached video summary for video ID: {video_id}")
        return cached_video.video_summary

    # Parse the XML content provided by the client
    captions = parse_subtitle_content(transcript_xml)
    if not captions:
        raise ValueError("Provided XML content could not be parsed or was empty.")

    # Format the parsed transcript into a single string
    formatted_lines = []
    for snippet in captions:
        total_seconds = int(snippet['start'])
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        timestamp = f"({hours:02}:{minutes:02}:{seconds:02})"
        formatted_line = f"{timestamp} {snippet['text']}"
        formatted_lines.append(formatted_line)
    
    full_transcript = " ".join(formatted_lines)
    
    # Update the database with the transcript for future QA use
    crud.update_transcript(db, video_id=video_id, transcript=full_transcript)
    
    # Generate the summary using the existing LLM chain
    transcript_docs = Document(page_content=full_transcript)
    summary_chain = load_summarize_chain(llm=llm, chain_type="stuff", prompt=summary_prompt) # Assumes summary_prompt is defined above
    response = summary_chain.invoke({
        "input_documents": [transcript_docs],
        "title": title,
        "channel_name": channel_name
    })
    summary = response['output_text'].strip()

    if not summary:
        raise RuntimeError("LLM returned an empty summary.")

    # Cache the new summary in the database
    crud.update_video_summary(db, video_id=video_id, summary=summary)
    
    return summary

async def answer_video_question(db: Session, video_id: str, question: str):
    try:
        """Answer questions about video content using transcript and summary from DB."""
        summary = await summarize_video(db, video_id)
        chunks = ensure_processed_transcript(db, video_id)
        if not chunks:
            raise ValueError("No transcript chunks available to answer the question after processing.")
    
        # Check if vectorstore is already cached
        if "Vectorstore" not in local_cache.get(video_id, {}):
            print(f"Creating and caching vectorstore for video ID: {video_id}")
            try:
                vectorstore = FAISS.from_documents(chunks, embeddings)
                local_cache.setdefault(video_id, {})["Vectorstore"] = vectorstore
            except Exception as e:
                print(f"Error creating vectorstore for video ID {video_id}: {e}")
                raise RuntimeError(f"Error creating vectorstore: {str(e)}")
        else:
            print(f"Using cached vectorstore for video ID: {video_id}")
            vectorstore = local_cache[video_id]["Vectorstore"]
            
        qa_prompt = get_video_qa_prompt(summary)
        retriever = vectorstore.as_retriever()
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            retriever=retriever,
            chain_type="stuff",
            chain_type_kwargs={"prompt": qa_prompt},
        )
        answer = qa_chain.invoke(question)
        return answer['result']
    except (ValueError, RuntimeError) as e:
        # Re-raise specific exceptions from sub-functions (summarize_video, ensure_processed_transcript, vectorstore creation)
        raise e 
    except Exception as e:
        # Catch any other unexpected errors during the QA process
        print(f"Error answering video question for {video_id} with question '{question}': {e}")
        # Transform general exceptions into a RuntimeError for the API layer
        raise RuntimeError(f"Error processing question: {str(e)}")