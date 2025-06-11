import re
import yt_dlp
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain.vectorstores import FAISS
from langchain.schema import Document
from langchain.chains import RetrievalQA
from langchain.chains.summarize import load_summarize_chain
from langchain.prompts import PromptTemplate
import time
import json
import requests
import xml.etree.ElementTree as ET
import os
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite-001", google_api_key=GOOGLE_API_KEY, max_output_tokens=4096)
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=GOOGLE_API_KEY)

video_cache = {}

def parse_subtitle_content(subtitle_content, ext):
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

def fetch_transcript(video_id, preferred_langs=['en-orig', 'en']):
    youtube_url = f"https://www.youtube.com/watch?v={video_id}"
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
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(youtube_url, download=False)
            
            all_caption_tracks = {}

            if 'subtitles' in info_dict:
                for lang, tracks in info_dict['subtitles'].items():
                    if lang not in all_caption_tracks:
                        all_caption_tracks[lang] = []
                    all_caption_tracks[lang].extend(tracks)
            
            if 'automatic_captions' in info_dict:
                for lang, tracks in info_dict['automatic_captions'].items():
                    if lang not in all_caption_tracks:
                        all_caption_tracks[lang] = []
                    all_caption_tracks[lang].extend(tracks)

            best_transcript_url = None
            best_transcript_ext = None

            def find_first_non_json_track(tracks):
                for track in tracks:
                    ext = track.get('ext')
                    if ext not in ['json', 'json3']:
                        return track
                return None # No suitable non-json track found

            # 1. Try preferred languages first
            for p_lang in preferred_langs:
                if p_lang in all_caption_tracks:
                    best_track = find_first_non_json_track(all_caption_tracks[p_lang])
                    if best_track:
                        best_transcript_url = best_track['url']
                        best_transcript_ext = best_track['ext']
                        print(f"Found preferred language '{p_lang}' track with extension '{best_transcript_ext}'.")
                        break
                if best_transcript_url:
                    break
            
            # 2. If no suitable track found in preferred languages, try any other available language
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

            if best_transcript_url and best_transcript_ext:
                try:
                    print(f"Attempting to download transcript from: {best_transcript_url}")
                    response = requests.get(best_transcript_url, stream=True)
                    response.raise_for_status()
                    subtitle_content = response.text
                    return parse_subtitle_content(subtitle_content, best_transcript_ext)
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

# Manual Approach to fetch YouTube video transcripts
# def fetch_transcript(video_id, max_retries=6, retry_delay=2):
#     # optionally use headers to mimic a browser request
#     headers = {
#         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
#     }

#     for attempt in range(1, max_retries + 1):
#         try:
#             url = f'https://www.youtube.com/watch?v={video_id}'
#             resp = requests.get(url, headers=headers)
#             html = resp.text

#             # Extract ytInitialPlayerResponse JSON
#             initial_data = re.search(r'ytInitialPlayerResponse\s*=\s*({.+?});', html)
#             # print("initial data: ",initial_data)
#             if not initial_data:
#                 print(f"Attempt {attempt}: Could not find ytInitialPlayerResponse for video ID: {video_id}")
#                 continue  # retry if response was malformed

#             data = json.loads(initial_data.group(1))
#             captions = data.get('captions')
#             print(captions)
#             if not captions:
#                 print(f"No captions available for video ID: {video_id}")
#                 return ""  # final condition

#             tracks = captions['playerCaptionsTracklistRenderer'].get('captionTracks', [])
#             if not tracks:
#                 print(f"No caption tracks available for video ID: {video_id}")
#                 return ""  # final condition
#             # transcript_url = tracks[0]['baseUrl']
#             # transcript_xml = requests.get(transcript_url).text
#             transcript_xml = ''
#             for track in tracks:
#                 transcript_url = track['baseUrl']
#                 response = requests.get(transcript_url, headers=headers)
#                 print("response: ", response.text)
#                 if response.status_code == 200 and response.text.strip():
#                     transcript_xml = response.text
#                     break

#             if not transcript_xml:
#                 print(f"Attempt {attempt}: No valid transcript XML found for video ID: {video_id}")
#                 continue  # retry if transcript didn't load

#             # Parse and build transcript string
#             root = ET.fromstring(transcript_xml)
#             # transcript_lines = []
#             # for elem in root.findall('text'):
#             #     text = elem.text or ''
#             #     transcript_lines.append(text.replace('\n', ' '))
#             transcript = []
#             for elem in root.findall('text'):
#                 start = float(elem.attrib['start'])
#                 dur = float(elem.attrib.get('dur', 0))
#                 text = elem.text or ''
#                 transcript.append({
#                     'start': start,
#                     'duration': dur,
#                     'text': text.replace('\n', ' ')
#                 })

#             # return ' '.join(transcript_lines).strip()
#             print(f"Transcript fetched successfully for video ID: {video_id} on attempt {attempt}")
#             return transcript

#         except Exception as e:
#             print(f"Error fetching transcript for video ID {video_id} on attempt {attempt}: {e}")
#             time.sleep(retry_delay * attempt)

def get_transcript(video_id):
    """Fetch and cache video transcript with timestamps."""
    # Check if transcript is already cached
    if video_id in video_cache and "Transcript" in video_cache[video_id]:
        print(f"Using cached transcript for video ID: {video_id}")
        return video_cache[video_id]["Transcript"]
    
    try:
        captions = fetch_transcript(video_id)
        if not captions:
            print(f"No transcript found for video ID: {video_id}")
            return ''
        # print(caption)
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
        
        # Initialize cache structure for this video
        if video_id not in video_cache:
            video_cache[video_id] = {}
        video_cache[video_id]["Transcript"] = full_transcript
        
        return full_transcript
        
    except Exception as e:
        print(f"Unexpected error fetching transcript: {e}")
        return ''

def get_clean_transcript(video_id):
    """Get transcript without timestamps for better processing."""
    # Check if clean transcript is already cached
    if video_id in video_cache and "CleanTranscript" in video_cache[video_id]:
        print(f"Using cached clean transcript for video ID: {video_id}")
        return video_cache[video_id]["CleanTranscript"]
    
    # Get the full transcript (will use cache if available)
    full_transcript = get_transcript(video_id)
    if not full_transcript:
        return ''
    
    # Remove timestamps to get clean text
    clean_transcript = re.sub(r'\[\d{2}:\d{2}:\d{2}\]', '', full_transcript)
    clean_transcript = re.sub(r'\s+', ' ', clean_transcript).strip()
    
    # Cache the clean transcript
    video_cache[video_id]["CleanTranscript"] = clean_transcript
    return clean_transcript

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
    input_variables=["text"],
    template="""
IMPORTANT: Keep your entire response under 1000 tokens. Be concise. Focus on essential insights. Avoid over-explaining or repeating.

You are a helpful and critical-thinking assistant tasked with analyzing and summarizing YouTube video content.

The input is a transcript of the video formatted as a continuous string. Each sentence is preceded by a timestamp in the format [hh:mm:ss], followed by the spoken text. The entire transcript is space-separated without line breaks.

Example:
(00:00:00) So, I've been coding since 2012, and I (00:00:03) really wish someone told me these 10 (00:00:07) things before I wasted years figuring them out...

Your task is to:
1. **Summarize**: Provide a clear and concise summary of the video content, focusing on the main points, key takeaways, and any critical insights that help someone understand the video's purpose without watching it.

2. **Main Points Covered**: List the main points discussed in the video using bullet points. Include timestamps to indicate when each point is mentioned.

3. **Fact Check**: Evaluate the factual accuracy of claims made by the speaker. For each claim that makes a factual assertion (e.g., dates, statistics, scientific or historical facts), verify if it is true or potentially misleading. Flag inaccuracies or unsupported claims with a note, and provide a short explanation or correction when appropriate.

Return your output in this format:
- **Summary**: ...
- **Main Points Covered**: ...
- **Fact Check Notes**:
  - [hh:mm:ss] Claim: "..." → ✅ True / ❌ False / ⚠️ Unverifiable
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


def ensure_processed_transcript(video_id):
    """Ensure transcript chunks are processed and cached for a video."""
    if video_id not in video_cache:
        video_cache[video_id] = {}
    
    # Check if processed chunks are already cached
    if "TranscriptChunks" in video_cache[video_id]:
        return video_cache[video_id]["TranscriptChunks"]
    
    # Get clean transcript (will use cache if available)
    clean_transcript = get_clean_transcript(video_id)
    if not clean_transcript:
        return []
    
    # Create and cache transcript chunks
    chunks = chunk_transcript(clean_transcript)
    video_cache[video_id]["TranscriptChunks"] = chunks
    return chunks

async def summarize_video(video_id):
    """Summarize video transcript with caching."""
    # Check if summary is already cached
    if video_id in video_cache and "Summary" in video_cache[video_id]:
        print(f"Using cached video summary for video ID: {video_id}")
        return video_cache[video_id]["Summary"]
    
    # Get transcript (will use cache if available)
    transcript = get_transcript(video_id)
    if not transcript:
        return {"error": "No transcript found or unable to fetch transcript."}
    
    try:
        
        # Create document from transcript
        transcript_docs = Document(page_content=transcript)
        summary_chain = load_summarize_chain(
            llm=llm,
            chain_type="stuff",
            prompt=summary_prompt
        )
        response = summary_chain.invoke([transcript_docs])
        summary = response['output_text'].strip()
        if not summary:
            return {"error": "Summary generation failed or returned empty."}
        # Cache the summary
        if video_id not in video_cache:
            video_cache[video_id] = {}
        video_cache[video_id]["Summary"] = summary
        
        return summary
        
    except Exception as e:
        print(f"Error creating video summary: {e}")
        return {"error": f"Error creating summary: {str(e)}"}

async def answer_video_question(video_id, question):
    """Answer questions about video content using transcript and summary."""
    # Ensure we have summary (will create if not cached)
    if video_id not in video_cache or "Summary" not in video_cache[video_id]:
        summary = await summarize_video(video_id)
        if isinstance(summary, dict) and "error" in summary:
            return summary
    else:
        print(f"Using cached video summary for video ID: {video_id}")
        summary = video_cache[video_id]["Summary"]
    
    # Get processed transcript chunks (will process if not cached)
    chunks = ensure_processed_transcript(video_id)
    if not chunks:
        return {"error": "No transcript chunks found after processing."}
    
    # Check if vectorstore is already cached
    if "Vectorstore" not in video_cache[video_id]:
        print(f"Creating and caching vectorstore for video ID: {video_id}")
        try:
            vectorstore = FAISS.from_documents(chunks, embeddings)
            video_cache[video_id]["Vectorstore"] = vectorstore
        except Exception as e:
            return {"error": f"Error creating vectorstore: {str(e)}"}
    else:
        print(f"Using cached vectorstore for video ID: {video_id}")
        vectorstore = video_cache[video_id]["Vectorstore"]
    
    try:
        # Create QA chain
        qa_prompt = get_video_qa_prompt(summary)
        retriever = vectorstore.as_retriever(search_type="similarity", k=4)
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            retriever=retriever,
            chain_type="stuff",
            return_source_documents=True,
            chain_type_kwargs={"prompt": qa_prompt},
        )

        answer = qa_chain(question)
        return answer['result']
        
    except Exception as e:
        print(f"Error answering question: {e}")
        return {"error": f"Error processing question: {str(e)}"}

# Utility functions for cache management
def clear_video_cache(video_id=None):
    """Clear cache for a specific video or all videos."""
    global video_cache
    if video_id:
        if video_id in video_cache:
            del video_cache[video_id]
            print(f"Video cache cleared for video ID: {video_id}")
    else:
        video_cache.clear()
        print("All video cache cleared")

def get_video_cache_stats():
    """Get statistics about what's cached for videos."""
    stats = {}
    for video_id, data in video_cache.items():
        stats[video_id] = {
            "has_transcript": "Transcript" in data,
            "has_clean_transcript": "CleanTranscript" in data,
            "has_transcript_chunks": "TranscriptChunks" in data,
            "has_summary": "Summary" in data,
            "has_vectorstore": "Vectorstore" in data,
            "transcript_length": len(data.get("Transcript", "")),
            "clean_transcript_length": len(data.get("CleanTranscript", "")),
            "chunk_count": len(data.get("TranscriptChunks", []))
        }
    return stats

def get_transcript_preview(video_id, max_chars=500):
    """Get a preview of the transcript for debugging."""
    if video_id in video_cache and "Transcript" in video_cache[video_id]:
        transcript = video_cache[video_id]["Transcript"]
        if len(transcript) > max_chars:
            return transcript[:max_chars] + "..."
        return transcript
    return "No transcript found in cache"

# Advanced utility: Get transcript segments by time range
def get_transcript_segment(video_id, start_time=None, end_time=None):
    """Get transcript segment between specified timestamps (in seconds)."""
    if video_id not in video_cache or "Transcript" not in video_cache[video_id]:
        return "Transcript not found in cache"
    
    transcript = video_cache[video_id]["Transcript"]
    
    # If no time range specified, return full transcript
    if start_time is None and end_time is None:
        return transcript
    
    # Extract segments based on timestamps
    segments = []
    timestamp_pattern = r'\[(\d{2}):(\d{2}):(\d{2})\]([^[]*)'
    matches = re.findall(timestamp_pattern, transcript)
    
    for match in matches:
        hours, minutes, seconds, text = match
        timestamp_seconds = int(hours) * 3600 + int(minutes) * 60 + int(seconds)
        
        # Check if timestamp is within range
        if start_time is not None and timestamp_seconds < start_time:
            continue
        if end_time is not None and timestamp_seconds > end_time:
            break
            
        segments.append(f"[{hours}:{minutes}:{seconds}]{text}")
    
    return " ".join(segments)