import aiohttp
import pandas as pd 
import isodate
import os
import dotenv
dotenv.load_dotenv()


API_KEY_VIDEO = os.getenv('API_KEY_VIDEO')
BASE_URL = "https://www.googleapis.com/youtube/v3"
API_URL = os.getenv('MODEL_API_URL')

async def get_sentiments(comments):
    async with aiohttp.ClientSession() as session:
        try:
            payload = {"comments": comments}
            async with session.post(API_URL, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("sentiments", [])
                else:
                    print(f"Error: Received {response.status} from API")
                    return []
        except Exception as e:
            print(f"Error in get_sentiment_async: {e}")
            return []
        
# search query with pagination token
async def fetch_video_data(search_query, max_results, sort_by='relevance', page_token=None):
    url = f"{BASE_URL}/search?part=snippet&type=video&q={search_query}&key={API_KEY_VIDEO}&maxResults={max_results}&order={sort_by}"
    if page_token:
        url += f"&pageToken={page_token}"
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            response_body = await response.text()
            if response.status == 200:
                data = await response.json()
                if 'items' in data and data['items']:
                    return data, data.get('nextPageToken') # Return data and nextPageToken
                else:
                    return {"items": []}, None
            else:
                print(f"Failed to fetch video data. Status code: {response.status}")
                print(f"Response body: {response_body}")
                return {"items": []}, None
            
async def fetch_channel_details(channel_id):
    url = f"{BASE_URL}/channels?part=snippet%2CcontentDetails%2Cstatistics&id={channel_id}&key={API_KEY_VIDEO}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                result = await response.json()
                if result["items"]:
                    return result["items"][0].get("statistics", {}), result["items"][0].get("snippet", {})
            return {}, {}

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

async def get_data(search_query, max_videos, sort_by, page_token=None):
    video_data, next_page_token = await fetch_video_data(search_query=search_query, max_results=max_videos, sort_by=sort_by, page_token=page_token)
    detailed_video_data = []
    if video_data and "items" in video_data:
        for video in video_data["items"]:
            if 'videoId' in video["id"]:
                video_id = video["id"]["videoId"]
            else:
                continue
            video_details = await fetch_video_details(video_id=video_id)
            detailed_video_data.append(video_details)
        return detailed_video_data, next_page_token
    return None, None

# Search YouTube for videos matching the query with pagination.
async def search_youtube(query, sort_by='relevance', max_results=5, page_token=None):
    videos_data, next_page_token = await get_data(search_query=query, 
                                                  max_videos=max_results, 
                                                  sort_by=sort_by,
                                                  page_token=page_token)
    
    if not videos_data:
        return None, None
    structured_data = []
    for video in videos_data:
        try:
            if video:
                video_id = video["id"]
                snippet = video["snippet"]
                statistics = video.get("statistics", {})
                content_details = video.get("contentDetails", {})
                channel_title = snippet["channelTitle"]
                channel_details, channel_snippet = await fetch_channel_details(snippet["channelId"])
                video_link = f"https://www.youtube.com/watch?v={video_id}"

                thumbnails = snippet.get("thumbnails", {})
                thumbnail_url = thumbnails.get("high", {}).get("url", "")

                channel_thumbnails = channel_snippet.get("thumbnails", {})
                channel_thumbnail_url = channel_thumbnails.get("high", {}).get("url") or \
                                        channel_thumbnails.get("medium", {}).get("url") or \
                                        channel_thumbnails.get("default", {}).get("url") or ""

                duration_str = content_details.get('duration', 'PT0S')
                duration = isodate.parse_duration(duration_str)
                total_seconds = int(duration.total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                seconds = total_seconds % 60
                formatted_duration = f"{hours:02}:{minutes:02}:{seconds:02}"
                video_info = {
                    "Title": snippet["title"],
                    "Views": int(statistics.get("viewCount", 0)),
                    "Likes": int(statistics.get("likeCount", 0)),
                    "Comments": int(statistics.get("commentCount", 0)),
                    "Upload_date": snippet.get("publishedAt", "N/A"),
                    "Duration": formatted_duration,
                    "Channel": channel_title,
                    "Subscribers": int(channel_details.get("subscriberCount", 0)),
                    'Video_link': video_link,
                    'Thumbnail': thumbnail_url,
                    "Channel_Thumbnail": channel_thumbnail_url,
                    "Description": snippet.get("description", "No description available.")
                }
                structured_data.append(video_info)
        except Exception as e:
            print(f"Error processing video data: {e}")
            continue
    if not structured_data:
        return None, None
    df = pd.DataFrame(structured_data)
    try:
        df['Upload_date'] = pd.to_datetime(df['Upload_date'].str.split('T').str[0])
        df['Likes(%)'] = (df['Likes']) / (df['Views']) * 100
        df = df[['Title', 'Channel', 'Subscribers', 'Views', 'Likes', 'Likes(%)', 'Duration', 'Upload_date', 'Comments', 'Video_link', 'Thumbnail', 'Channel_Thumbnail', 'Description']]
        df['Title'] = df.apply(lambda row: f'<a href="{row["Video_link"]}" target="_blank">{row["Title"]}</a>', axis=1)
        return df, next_page_token
    except Exception as e:
        print(f"An error occurred while processing the data: {e}")
        return None, None

# Extract video data by video ID
async def search_video(video_id):
    video = await fetch_video_details(video_id)
    if not video:
        return None
    video_id = video["id"]
    snippet = video["snippet"]
    statistics = video.get("statistics", {})
    content_details = video.get("contentDetails", {})
    channel_title = snippet["channelTitle"]
    channel_details, channel_snippet = await fetch_channel_details(snippet["channelId"])
    video_link = f"https://www.youtube.com/watch?v={video_id}"

    thumbnails = snippet.get("thumbnails", {})
    thumbnail_url = thumbnails.get("high", {}).get("url", "")

    channel_thumbnails = channel_snippet.get("thumbnails", {})
    channel_thumbnail_url = channel_thumbnails.get("high", {}).get("url") or \
                            channel_thumbnails.get("medium", {}).get("url") or \
                            channel_thumbnails.get("default", {}).get("url") or ""

    duration_str = content_details.get('duration', 'PT0S')
    duration = isodate.parse_duration(duration_str)
    total_seconds = int(duration.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    formatted_duration = f"{hours:02}:{minutes:02}:{seconds:02}"
    video_info = {
        "Title": snippet["title"],
        "Views": int(statistics.get("viewCount", 0)),
        "Likes": int(statistics.get("likeCount", 0)),
        "Comments": int(statistics.get("commentCount", 0)),
        "Upload_date": snippet.get("publishedAt", "N/A"),
        "Duration": formatted_duration,
        "Channel": channel_title,
        "Subscribers": int(channel_details.get("subscriberCount", 0)),
        'Video_link': video_link,
        'Thumbnail': thumbnail_url,
        "Channel_Thumbnail": channel_thumbnail_url,
        "Description": snippet.get("description", "No description available.")
    }
    df = pd.DataFrame([video_info])
    try:
        df['Upload_date'] = pd.to_datetime(df['Upload_date'].str.split('T').str[0])
        df['Likes(%)'] = (df['Likes']) / (df['Views']) * 100
        df = df[['Title', 'Channel', 'Subscribers', 'Views', 'Likes', 'Likes(%)', 'Duration', 'Upload_date', 'Comments', 'Video_link', 'Thumbnail', 'Channel_Thumbnail', 'Description']]
        df['Title'] = df.apply(lambda row: f'<a href="{row["Video_link"]}" target="_blank">{row["Title"]}</a>', axis=1)
        return df
    except Exception as e:
        print(f"An error occurred while processing the data: {e}")
        return None