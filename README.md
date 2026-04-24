# YouTube AI Analyzer

**YouTube AI Analyzer** is a full-stack web application designed to analyze YouTube content through an interactive interface. Users can search for videos similarly to how they would on the YouTube platform. The application then provides:

* **Comparison visualizations** for selected videos
* **Video and comment summaries**
* **Question answering (QA)** for both videos and comments
* **Sentiment analysis** of video comments

The project is built with a **Next.js** frontend and a **FastAPI** backend. The user interface is designed to resemble YouTube’s layout to provide a familiar and user-friendly experience.

# Table of Contents

- [Features](#features)  
  - [Index Page (`/`)](#index-page)
  - [Results Page (`/results`)](#results-page)  
  - [Watch Page (`/watch`)](#watch-page)  
- [Tech Stack](#tech-stack)  
- [Project Structure](#project-structure)  
- [⚙️ Local Setup and Installation](#️-local-setup-and-installation)  
  - [Prerequisites](#prerequisites)  
  - [Clone the Repository](#1-clone-the-repository)  
  - [Backend Setup](#2-backend-setup)  
  - [Frontend Setup](#3-frontend-setup)  
  - [Running the Full Application](#running-the-full-application)  
- [🐳 Docker Deployment](#-docker-deployment)  
- [API Endpoint Documentation](#api-endpoint-documentation)  
  - [Search and Video Details](#search-and-video-details)  
  - [Video Analysis](#video-analysis)  
  - [Comment Analysis](#comment-analysis)  
- [🗃️ Database & Caching Explained](#️-database--caching-explained)  
- [Contributing](#contributing)  
- [Contact](#contact)  


## Features

The application is structured across **three primary pages**, each offering a unique set of functionalities designed for **in-depth content analysis**.

---
<a name="index-page"></a>
### 1. **Index Page** (`/`)

The landing page provides a clean, focused entry point into the application.

* **Primary Search**
  The main feature is the header's search bar. Users can enter a query to begin their analysis journey. Upon searching, they are seamlessly redirected to the dedicated **Results Page**.

* **Analysis Mode Toggle**
  Accessible from the header's dropdown menu, this global switch allows users to enable or disable all **resource-intensive analysis features** across the application, providing control over API usage and performance.
---
<a name="results-page"></a>
### 2. **Results Page** (`/results`)
![result page](https://github.com/AmaanP314/YouTube-AI-Analyzer/blob/d404fc77e9727ce99d4d36dcd0d292e40a2ed800/frontend/youtube/public/results.png)

This page displays search results in a powerful **two-column dashboard**, designed for **comparing videos** and identifying key performers at a glance.

#### 📄 Left Section: **Search Results List**

* **Video Details**
  Displays a list of videos matching the search query, each with its **thumbnail, title, channel name, view count**, and **upload date**.

* **Infinite Scroll**
  As the user scrolls down, more results are automatically fetched and appended to the list, creating a **seamless browsing experience** without pagination buttons.

#### 📊 Right Section: **Interactive Visualizations**

This sticky side panel provides a **comparative analytical overview** of all currently loaded search results. The charts are **fully dynamic**, updating with smooth animations as new videos are loaded via infinite scroll.

* **Cross-Component Interactivity**

  * **Hover-to-Highlight**: Hovering over any video in the left-hand list instantly highlights its corresponding data bar or point in all three charts.
  * **Click-to-Scroll**: Clicking a bar in any chart auto-scrolls the results list to bring the corresponding video into view.

* **Detailed Charts**

  * **Views vs. Likes Chart**: A composed bar-and-line chart mapping each video's view count (bar) against its like count (line), making it easy to identify videos with high viewership or strong like-to-view ratios.
  * **Engagement Rate Chart**: A bar chart showing engagement rate (`Likes % Views`). Bars are **color-coded** (green = high, yellow = medium, red = low) for quick assessment.
  * **Composite Performance Score Chart**: Ranks videos based on a **custom score** using views, likes, and channel subscribers to provide a holistic view of performance.

#### 💾 State Preservation

The results page uses **session storage** to remember the complete state of your last search. If you click on a video and return via your browser's back button, you'll return **exactly as you left it**—with all previously loaded videos and your scroll position intact.

#### 📱 Mobile Responsiveness

* On smaller screens, **only the video results list** is visible by default.
* A **"Show Analysis"** button in the header toggles the view, switching between the video list and a **full-screen visualization panel**.
* **Click-to-scroll interactivity is enhanced**: tapping a chart bar switches to the video list and scrolls to the corresponding video.

---
<a name="watch-page"></a>
### 3. **Watch Page** (`/watch`)
![result page](https://github.com/AmaanP314/YouTube-AI-Analyzer/blob/d404fc77e9727ce99d4d36dcd0d292e40a2ed800/frontend/youtube/public/watch.png)

The watch page is the **analytical core** of the application, offering **deep insights** into a single video and its comments.

#### 🎥 Left Section: **Main Video Content**

This section offers a clean viewing experience with a layout inspired by **YouTube’s interface**.

* **Ad-Free Video Player**
  An embedded `iframe` player allows for **uninterrupted, ad-free playback**.

* **Video Metadata & Description**
  Displays the title, channel info, and a **description box** with clickable links for all URLs.

* **Advanced Comments Section**

  * **Real-time Search**: The "Add a comment" input acts as a **live search bar**, filtering by text or author and **highlighting matched terms**.
  * **Multi-Layered Filtering**: Choose a primary sort ("Top comments" or "Newest first"), then **layer a sentiment filter** ("Positive", "Neutral", "Negative").
  * **Inline Sentiment Analysis**: Each comment includes a **sentiment label** (Positive, Neutral, or Negative) with a **color-coded icon** next to the publish date.

#### 🤖 Right Section: **AI-Powered Analysis Panel**

This section contains **AI-generated insights**, which can be toggled globally via the **Analysis Mode** switch in the header.

* **AI-Generated Summaries**

  * **Video Summary**:
    1. **Purpose**: This section provides an overall structure of the video, including the main points covered, and highlights which claims made in the video are factually accurate and which are not.

    2. **Why it's helpful**:
This summary helps viewers quickly grasp the core content of the video without watching the entire thing. It’s especially useful for those who are short on time or are trying to evaluate whether the video is worth watching in full. By clearly identifying which points are backed by facts and which are misleading or inaccurate, this section helps viewers make more informed decisions and avoid misinformation.

  * **Comment Summary**:
    1. **Purpose**: This section analyzes the video’s comment section by identifying common themes, praise, criticism, and viewer opinions. It also distinguishes between factually accurate points and misleading or incorrect statements made by commenters.
    2. **Why it's helpful**:
This is valuable for two main groups:

        For **Viewers**: It helps them understand what the broader audience thinks about the video, offering insights into whether the content is worth their time, aligns with their expectations, or contains issues that others have already pointed out.
        
        For **Content Creators**: It serves as a useful audience feedback tool, allowing creators to understand what viewers appreciate, what they criticize, and what improvements they suggest. This feedback is crucial for refining future content, better engaging with their community, and delivering more tailored and impactful content.
  * A toggle allows easy switching between summary types.

* **Interactive Q\&A Assistant**

  * Ask **natural language questions** about the video or its comments.
  * Context switches based on the active summary:

    * **Video Q\&A**: e.g., *"What tools did the creator recommend?"*
    * **Comments Q\&A**: e.g., *"What was the main criticism in the comments?"*
  * **Why it's helpful**: This feature makes the experience more interactive and efficient, allowing users to quickly get targeted answers without having to sift through the entire summary or watch the full video. It's ideal for viewers looking for specific information and for content creators who want to zero in on feedback or patterns in viewer engagement. By enabling context-aware Q&A, the assistant becomes a smart navigation tool, saving users time and offering more personalized insights based on what they care about most.
  * The input is only enabled when the relevant summary is available.

* **Sentiment Distribution Chart**:
  - A bar chart showing the **percentage breakdown** of positive, neutral, and negative comments. The sentiment analysis is powered by a **large language model (LLM)** fine-tuned by me on a dataset of **over 1 million sentiment-labeled YouTube comments**, ensuring high relevance and accuracy in the YouTube context.
  - You can find the model here: [youtube-xlm-roberta-base-sentiment-multilingual](https://huggingface.co/AmaanP314/youtube-xlm-roberta-base-sentiment-multilingual),

#### 📱 Mobile Responsiveness

On smaller screens:

* The default view shows the **video content**.
* Toggling **"Show Analysis"** in the header switches to the **analysis panel**, hiding the video and comments.

## Tech Stack

  - **Frontend**: [Next.js](https://nextjs.org/) (React Framework)
  - **Styling**: [Tailwind CSS](https://tailwindcss.com/)
  - **UI Components**: `lucide-react` for icons
  - **Charting**: [Recharts](https://recharts.org/)
   - **Backend**: [FastAPI](https://fastapi.tiangolo.com/) for high-performance, asynchronous API endpoints.
  - **AI**: [Google Generative AI (Gemini)](https://deepmind.google/technologies/gemini/) for summarization and Q&A, integrated via [LangChain](https://www.langchain.com/).
  - **Vector Store**: [FAISS](https://github.com/facebookresearch/faiss) for efficient similarity searches in the RAG pipeline.
  - **Database**: [PostgreSQL](https://www.postgresql.org/) (e.g., connected via [Neon](https://neon.tech/)) with [SQLAlchemy](https://www.sqlalchemy.org/) as the ORM.
  - **Data Validation**: [Pydantic](https://docs.pydantic.dev/) for request/response model validation.
  - **Async Operations**: `aiohttp` for non-blocking external API calls to the YouTube Data API.
  - **Deployment**: Configured for deployment with [Docker](https://www.docker.com/)

## Project Structure

The repository is organized into two main directories, `frontend` and `backend`, reflecting the separation of concerns between the client and server.

```
.
├── backend/                     # Backend (FastAPI) application
│   ├── app/
│   │   ├── db/                  # DB models and session setup
│   │   │   ├── __init__.py      # Package initializer
│   │   │   ├── crud.py          # CRUD operations
│   │   │   ├── database.py      # DB engine and session config
│   │   │   └── models.py        # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic models for API data
│   │   │   ├── __init__.py
│   │   │   ├── comment.py       # Comment-related schemas
│   │   │   └── video.py         # Video-related schemas
│   │   ├── services/            # Application logic
│   │   │   ├── __init__.py
│   │   │   ├── comments_analysis.py  # YouTube comment analysis
│   │   │   ├── video_analysis.py     # YouTube video analysis
│   │   │   └── Youtube.py            # YouTube Data API service
│   │   ├── __init__.py
│   │   └── main.py             # FastAPI app and route definitions
│   ├── Dockerfile              # Docker setup for backend
│   ├── Procfile                # Process declaration for deployment
│   └── requirements.txt        # Python dependencies
│
└── frontend/                   # Frontend (Next.js) application
    └── youtube/
        ├── public/             # Static assets (icons, images)
        ├── src/
        │   ├── components/     # Reusable UI components
        │   │   ├── placeholders/       # Loading skeletons
        │   │   │   ├── AnswerSkeleton.js
        │   │   │   ├── CommentSkeleton.js
        │   │   │   ├── SearchResultSkeleton.js
        │   │   │   ├── SentimentChartSkeleton.js
        │   │   │   ├── SentimentSkeleton.js
        │   │   │   ├── SummarySkeleton.js
        │   │   │   └── VideoPlaceholderItem.js
        │   │   ├── results/            # Components for /results
        │   │   │   ├── SearchResultItem.js
        │   │   │   └── VideoDetails.js
        │   │   ├── video/              # Components for /watch
        │   │   │   ├── CommentFilterButton.js
        │   │   │   ├── CommentsSection.js
        │   │   │   ├── DescriptionBox.js
        │   │   │   ├── FilterDropdownMenu.js
        │   │   │   ├── QASection.js
        │   │   │   ├── SortFilterControls.js
        │   │   │   ├── SummarySection.js
        │   │   │   └── VideoPlayer.js
        │   │   ├── visualizations/     # Recharts components
        │   │   │   ├── CompositeScoreChart.js
        │   │   │   ├── EngagementRateChart.js
        │   │   │   ├── SentimentDistributionChart.js
        │   │   │   └── ViewsLikesChart.js
        │   │   └── Header.js           # App header with search
        │   ├── context/                # Global state (React Context)
        │   │   └── AnalysisContext.js
        │   ├── pages/                  # Next.js routes
        │   │   ├── _app.js
        │   │   ├── _document.js
        │   │   ├── index.js
        │   │   ├── results.js
        │   │   └── watch.js
        │   └── styles/
        │       └── globals.css         # Global and Tailwind styles
        ├── eslint.config.mjs          # ESLint configuration
        ├── jsconfig.json              # Path alias config
        ├── next.config.mjs            # Next.js configuration
        ├── package.json               # Project metadata and dependencies
        ├── postcss.config.js          # PostCSS setup
        └── tailwind.config.js         # Tailwind CSS config
└── .gitignore                 # Git ignore rules
```

## ⚙️ Local Setup and Installation

### Prerequisites

  * Node.js and npm/yarn
  * Python 3.9+
  * A [PostgreSQL database](https://neon.tech/) (e.g., via Neon)
  * API keys for the [YouTube Data API](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
  * API key for [Google AI (Gemini)](https://makersuite.google.com/app)
    
### 1. Clone the Repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```
### 2. Backend Setup

1.  **Navigate to the backend directory:**

    ```bash
    cd backend
    ```

2.  **Create a virtual environment:**

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install Python dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the `backend/` directory and populate it with your credentials.

    ```.env
    DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"
    API_KEY_VIDEO="your_youtube_data_api_key"
    API_KEY_COMMENTS="your_youtube_data_api_key_for_comments"
    GOOGLE_API_KEY="your_google_ai_api_key"
    MODEL_API_URL="your_external_sentiment_model_api_url"
    ```

### 3. Frontend Setup

1.  **Navigate to the frontend directory:**

    ```bash
    cd frontend/youtube
    ```

2.  **Install Node.js dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the `frontend/youtube/` directory and point it to your local backend instance.

    ```
    NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
    ```

### Running the Full Application

1.  **Start the backend server:**
    From the `backend/` directory, run:

    ```bash
    uvicorn app.main:app --reload
    ```

    The API will be live at `http://127.0.0.1:8000`.

2.  **Start the frontend development server:**
    From the `frontend/youtube/` directory, run:

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🐳 Docker Deployment

The `Dockerfile` is configured to build and run the FastAPI application in a containerized environment.

### 1\. Build the Docker Image

```bash
docker build -t youtube-analysis-api .
```

### 2\. Run the Docker Container

Make sure to pass the environment variables to the container.

```bash
docker run -d -p 8000:8000 \
  --env-file ./.env \
  --name youtube-api \
  youtube-analysis-api
```

## API Endpoint Documentation

The base URL is `http://127.0.0.1:8000`. All endpoints include detailed error responses for status codes 404 and 500.

### Search and Video Details

#### `GET /search`

Search for YouTube videos with pagination.

  - **Tags**: `Search`
  - **Query Parameters**:
      - `query: str` (required): The search term.
      - `max_results: int` (optional, default: 5): Number of results per page.
      - `page_token: str` (optional): Token for fetching the next page of results.
  - **Success Response (200)**: A JSON object containing a list of videos and a `nextPageToken`.

#### `GET /video/{video_id}`

Fetches detailed information for a single video by its ID.

  - **Tags**: `Video`
  - **Success Response (200)**: A JSON object with the video's details.

### Video Analysis

#### `GET /video/transcript/{video_id}`

Fetches the full, timestamped transcript for a video. Uses the persistent database for caching.

  - **Tags**: `Video`
  - **Success Response (200)**: A JSON object containing the transcript string, length, and word count.
  - **Error Response (404)**: If the transcript is unavailable.

#### `GET /video/summarize/{video_id}`

Generates an AI-powered summary of the video content.

  - **Tags**: `Video`
  - **Query Parameters**:
      - `title: str` (optional)
      - `channel_name: str` (optional)
  - **Success Response (200)**: A JSON object with the summary text.
  - **Error Response (404)**: If the transcript is not found or a summary cannot be generated.

#### `GET /video/qa/{video_id}`

Answers a specific question about the video's content.

  - **Tags**: `Video`
  - **Query Parameters**:
      - `question: str` (required): The question to ask about the video.
  - **Success Response (200)**: A JSON object with the answer text.
  - **Error Response (404)**: If no answer can be generated.

### Comment Analysis

#### `GET /comments/{video_id}`

Fetches a diverse list of comments for a video.

  - **Tags**: `Comments`
  - **Success Response (200)**: A JSON object containing a list of comment details.
  - **Error Response (404)**: If no comments are found.

#### `POST /comments/sentiments`

Analyzes the sentiment of a list of comment strings by calling an external API.

  - **Tags**: `Comments`
  - **Request Body**: `{ "comments": ["comment 1", "comment 2"] }`
  - **Success Response (200)**: A JSON object with a list of sentiment labels.

#### `GET /comments/summarize/{video_id}`

Generates an AI-powered summary of the comment section.

  - **Tags**: `Comments`
  - **Query Parameters**:
      - `title: str` (optional)
      - `channel_name: str` (optional)
  - **Success Response (200)**: A JSON object with the summary text.
  - **Error Response (404)**: If no valid comments are found for summarization.

#### `GET /comments/qa/{video_id}`

Answers a specific question about the video's comments.

  - **Tags**: `Comments`
  - **Query Parameters**:
      - `question: str` (required): The question to ask about the comments.
  - **Success Response (200)**: A JSON object with the answer text.
  - **Error Response (404)**: If no answer can be generated.

-----

## 🗃️ Database & Caching Explained

The API uses a dual-layer caching strategy to ensure high performance and minimize redundant, expensive operations.

### Persistent Database Cache (PostgreSQL)

A PostgreSQL database serves as the persistent cache layer. This layer is designed to store the results of computationally expensive tasks that don't need to be regenerated on every request.

**Schema:**
The database uses a single table, `video_store`, defined in `app/db/models.py`:

  - **`video_id` (Primary Key)**: The unique YouTube video ID.
  - **`transcript`**: The full, timestamped transcript of the video.
  - **`video_summary`**: The AI-generated summary of the video content.
  - **`comment_summary`**: The AI-generated summary of the comments.

**Operations:**

  - Database operations are cleanly abstracted into `app/db/crud.py`.
  - The `get_or_create_video_store` function ensures that database entries are fetched or created in a concurrent-safe manner, preventing race conditions when multiple requests for the same video arrive simultaneously.

### In-Memory Runtime Cache (Local Dictionary)

For data that is session-specific and doesn't need to be persisted (like FAISS vector stores, processed lists of comments), a simple dictionary `local_cache` is used in the service layer (`video_analysis.py` and `comments_analysis.py`).

  - **Purpose**: This avoids re-calculating these intermediate objects for multiple Q\&A or analysis requests on the same `video_id` within a single application run.
  - **Lifecycle**: This cache is volatile and exists only for the lifetime of the application process. It is cleared upon application restart.
  - **Benefit**: Dramatically improves performance for sequential API calls on the same `video_id` during a user's session.

## Contributing
Contributions are welcome! Please fork the repository and submit pull requests.

## Contact
Amaan Poonawala - [GitHub](https://github.com/amaanp314) | [LinkedIn](https://www.linkedin.com/in/amaan-poonawala)

Feel free to reach out for any questions or feedback.
