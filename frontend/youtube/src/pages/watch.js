import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Header from "../components/Header";
import VideoPlayer from "../components/video/VideoPlayer";
import VideoDetails from "../components/results/VideoDetails";
import DescriptionBox from "../components/video/DescriptionBox";
import CommentsSection from "../components/video/CommentsSection";
import SummarySection from "../components/video/SummarySection";
import QASection from "../components/video/QASection";
import SentimentDistributionChart from "../components/visualizations/SentimentDistributionChart";
import SentimentChartSkeleton from "../components/placeholders/SentimentChartSkeleton";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
// --- UTILITY FUNCTIONS ---
const formatViews = (views) => {
  if (views === undefined || views === null || isNaN(views)) return "N/A";
  if (views < 1000) return views.toString();
  if (views < 1000000)
    return (views / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return (views / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
};
const formatAbsoluteDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return "Invalid Date";
  }
};
const stripHtml = (html) => {
  if (typeof document !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  }
  return html.replace(/<[^>]+>/g, "");
};

export default function WatchPage() {
  const router = useRouter();
  const { v: videoIdFromQuery } = router.query;

  // Video Data State
  const [videoData, setVideoData] = useState(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const [errorVideo, setErrorVideo] = useState(null);
  const [initialHeaderQuery, setInitialHeaderQuery] = useState(""); // For the header on this page

  // ... (All other state variables for comments, sentiments, summaries remain the same)
  const [commentsWithSentiments, setCommentsWithSentiments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isLoadingSentiments, setIsLoadingSentiments] = useState(false);
  const [errorComments, setErrorComments] = useState(null);
  const [errorSentiments, setErrorSentiments] = useState(null);
  const [areSentimentsReady, setAreSentimentsReady] = useState(false);

  const [activeSummaryContext, setActiveSummaryContext] = useState("video");
  const [videoSummary, setVideoSummary] = useState("");
  const [commentSummary, setCommentSummary] = useState("");
  const [isLoadingVideoSummary, setIsLoadingVideoSummary] = useState(true);
  const [isLoadingCommentSummary, setIsLoadingCommentSummary] = useState(true);
  const [errorVideoSummary, setErrorVideoSummary] = useState(null);
  const [errorCommentSummary, setErrorCommentSummary] = useState(null);

  // Function to fetch video details directly (if not from session storage)
  const fetchVideoDetailsDirectly = async (videoId) => {
    setIsLoadingVideo(true);
    setErrorVideo(null);
    try {
      const response = await fetch(`${apiUrl}/video/${videoId}`);
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown server error" }));
        throw new Error(
          errorData.detail ||
            `Failed to fetch video details: ${response.statusText}`
        );
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.results && Object.keys(data.results).length > 0) {
        const apiVideo = data.results;
        const transformedVideoData = {
          id: videoId,
          title: stripHtml(apiVideo.Title),
          channelName: apiVideo.Channel,
          subscribers: apiVideo.Subscribers,
          views: apiVideo.Views,
          likes: apiVideo.Likes,
          uploadTimeRaw: apiVideo.Upload_date,
          duration: apiVideo.Duration,
          thumbnailUrl: apiVideo.Thumbnail,
          channelThumbnailUrl: apiVideo.Channel_Thumbnail,
          description: apiVideo.Description,
          Comments: apiVideo.Comments,
        };
        setVideoData(transformedVideoData);
        sessionStorage.setItem(
          "currentWatchVideoData",
          JSON.stringify(transformedVideoData)
        );
      } else {
        throw new Error("Video not found or empty details returned.");
      }
    } catch (err) {
      console.error("Error fetching video details directly:", err);
      setErrorVideo(err.message);
      setVideoData(null);
    } finally {
      setIsLoadingVideo(false);
    }
  };

  // Effect for initial video data & header query
  useEffect(() => {
    const lastGlobalQuery = sessionStorage.getItem("youtubeLastSearchQuery"); // Use the query from results page
    if (lastGlobalQuery) {
      setInitialHeaderQuery(lastGlobalQuery);
    }

    if (!videoIdFromQuery) {
      setIsLoadingVideo(false);
      setVideoData(null);
      return;
    }
    setIsLoadingVideo(true);
    setErrorVideo(null);
    const storedVideoDataString = sessionStorage.getItem(
      "currentWatchVideoData"
    );
    if (storedVideoDataString) {
      try {
        const storedVideoData = JSON.parse(storedVideoDataString);
        if (storedVideoData.id === videoIdFromQuery) {
          setVideoData(storedVideoData);
          setIsLoadingVideo(false);
          return;
        }
      } catch (e) {
        console.error("Error parsing video data from sessionStorage:", e);
        sessionStorage.removeItem("currentWatchVideoData");
      }
    }
    fetchVideoDetailsDirectly(videoIdFromQuery);
  }, [videoIdFromQuery]);

  // ... (useEffect for comments & sentiments remains the same)
  useEffect(() => {
    if (!videoData?.id) {
      setIsLoadingComments(false);
      setCommentsWithSentiments([]);
      setAreSentimentsReady(false);
      return;
    }
    const videoId = videoData.id;
    const fetchCommentsAndSentiments = async () => {
      setIsLoadingComments(true);
      setErrorComments(null);
      setCommentsWithSentiments([]);
      setAreSentimentsReady(false);
      let rawComments = [];
      try {
        const commentsRes = await fetch(`${apiUrl}/comments/${videoId}`);
        if (!commentsRes.ok)
          throw new Error(`Comments Fetch: ${commentsRes.statusText}`);
        const commentsData = await commentsRes.json();
        if (commentsData.error) throw new Error(commentsData.error);
        rawComments = commentsData.results || [];
        setCommentsWithSentiments(
          rawComments.map((c) => ({ ...c, sentiment: null }))
        );
      } catch (err) {
        console.error("Error fetching comments:", err);
        setErrorComments(err.message);
        setIsLoadingComments(false);
        return;
      }
      setIsLoadingComments(false);

      if (rawComments.length > 0) {
        setIsLoadingSentiments(true);
        setErrorSentiments(null);
        const commentTexts = rawComments.map((c) => c.CommentText);
        try {
          const sentimentsRes = await fetch(`${apiUrl}/comments/sentiments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comments: commentTexts }),
          });
          if (!sentimentsRes.ok)
            throw new Error(`Sentiments Fetch: ${sentimentsRes.statusText}`);
          const sentimentsData = await sentimentsRes.json();
          if (sentimentsData.error) throw new Error(sentimentsData.error);
          const fetchedSentiments = sentimentsData.results || [];
          const mergedComments = rawComments.map((comment, index) => ({
            ...comment,
            sentiment: fetchedSentiments[index] || null,
          }));
          setCommentsWithSentiments(mergedComments);
          setAreSentimentsReady(true);
        } catch (err) {
          console.error("Error fetching sentiments:", err);
          setErrorSentiments(err.message);
          setCommentsWithSentiments(
            rawComments.map((c) => ({ ...c, sentiment: null }))
          );
          setAreSentimentsReady(false);
        } finally {
          setIsLoadingSentiments(false);
        }
      } else {
        setAreSentimentsReady(true);
      }
    };
    fetchCommentsAndSentiments();
  }, [videoData?.id]);

  // ... (useEffect for summaries remains the same)
  useEffect(() => {
    if (!videoData?.id) {
      setIsLoadingVideoSummary(false);
      setIsLoadingCommentSummary(false);
      return;
    }
    const videoId = videoData.id;
    const fetchAllSummaries = async () => {
      setIsLoadingVideoSummary(true);
      setErrorVideoSummary(null);
      try {
        const videoRes = await fetch(`${apiUrl}/video/summarize/${videoId}`);
        if (!videoRes.ok) {
          throw new Error(`Video Summary: ${videoRes.statusText}`);
        }
        const data = await videoRes.json();
        setVideoSummary(data.results || "");
      } catch (err) {
        console.error("Error fetching video summary:", err);
        setErrorVideoSummary(err.message);
        setVideoSummary("");
      } finally {
        setIsLoadingVideoSummary(false);
      }

      setIsLoadingCommentSummary(true);
      setErrorCommentSummary(null);
      try {
        const commentRes = await fetch(
          `${apiUrl}/comments/summarize/${videoId}`
        );
        if (!commentRes.ok) {
          throw new Error(`Comment Summary: ${commentRes.statusText}`);
        }
        const data = await commentRes.json();
        setCommentSummary(data.results || "");
      } catch (err) {
        console.error("Error fetching comment summary:", err);
        setErrorCommentSummary(err.message);
        setCommentSummary("");
      } finally {
        setIsLoadingCommentSummary(false);
      }
    };
    fetchAllSummaries();
  }, [videoData?.id]);

  const displayVideoData = useMemo(() => {
    if (!videoData) return null;
    return {
      ...videoData,
      viewsFormatted: formatViews(videoData.views),
      uploadTimeAbsolute: formatAbsoluteDate(videoData.uploadTimeRaw),
    };
  }, [videoData]);

  const isQAEnabled = useMemo(() => {
    if (activeSummaryContext === "video")
      return !isLoadingVideoSummary && videoSummary && !errorVideoSummary;
    if (activeSummaryContext === "comments")
      return !isLoadingCommentSummary && commentSummary && !errorCommentSummary;
    return false;
  }, [
    activeSummaryContext,
    videoSummary,
    commentSummary,
    isLoadingVideoSummary,
    isLoadingCommentSummary,
    errorVideoSummary,
    errorCommentSummary,
  ]);

  const handleHeaderSearchOnWatchPage = (query) => {
    if (query && query.trim() !== "") {
      router.push(`/results?search_query=${encodeURIComponent(query)}`);
    }
  };

  const WatchPageSkeleton = () => (
    <main className="w-full px-2 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-6 flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:flex-grow">
        <div className="aspect-video bg-youtube-dark-secondary w-full rounded-xl animate-pulse mb-4"></div>
        <div className="mt-4 p-3 bg-youtube-dark-secondary rounded-xl animate-pulse h-32 mb-4"></div>
        <div className="mt-4 p-3 bg-youtube-dark-secondary rounded-xl animate-pulse h-20 mb-4"></div>
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={`cs-${index}`}
            className="flex items-start gap-3 py-4 animate-pulse"
          >
            <div className="w-10 h-10 bg-youtube-dark-secondary rounded-full"></div>
            <div className="flex-grow space-y-2">
              <div className="h-3 bg-youtube-dark-secondary rounded w-1/4"></div>
              <div className="h-3 bg-youtube-dark-secondary rounded w-full"></div>
              <div className="h-3 bg-youtube-dark-secondary rounded w-5/6"></div>
            </div>
          </div>
        ))}
      </div>
      <div className="w-full lg:w-[360px] xl:w-[402px] flex-shrink-0">
        <div className="p-4 bg-youtube-dark-secondary rounded-xl animate-pulse">
          <div className="h-5 bg-youtube-dark-tertiary rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-youtube-dark-tertiary rounded w-full"></div>
            <div className="h-3 bg-youtube-dark-tertiary rounded w-5/6"></div>
            <div className="h-3 bg-youtube-dark-tertiary rounded w-full"></div>
          </div>
        </div>
      </div>
    </main>
  );

  if (isLoadingVideo && !displayVideoData) {
    return (
      <div className="min-h-screen bg-youtube-dark font-inter text-white">
        <Header
          initialQuery={initialHeaderQuery}
          onSearch={handleHeaderSearchOnWatchPage}
        />
        <WatchPageSkeleton />
      </div>
    );
  }
  if (errorVideo) {
    return (
      <div className="min-h-screen bg-youtube-dark font-inter text-white">
        <Header
          initialQuery={initialHeaderQuery}
          onSearch={handleHeaderSearchOnWatchPage}
        />
        <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="w-full max-w-4xl mx-auto">
            <p className="text-center text-xl py-10 text-red-400">
              Error loading video: {errorVideo}
            </p>
          </div>
        </main>
      </div>
    );
  }
  if (!displayVideoData) {
    return (
      <div className="min-h-screen bg-youtube-dark font-inter text-white">
        <Header
          initialQuery={initialHeaderQuery}
          onSearch={handleHeaderSearchOnWatchPage}
        />
        <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="w-full max-w-4xl mx-auto">
            <p className="text-center text-xl py-10">
              Video not available or ID missing.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-youtube-dark font-inter text-white flex flex-col">
      <Header
        initialQuery={initialHeaderQuery}
        onSearch={handleHeaderSearchOnWatchPage}
      />{" "}
      {/* Use the new handler */}
      <main className="w-full px-2 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-6 flex flex-col lg:flex-row gap-6 flex-grow">
        {/* Left Column */}
        <div className="w-full lg:flex-grow min-w-0">
          <VideoPlayer videoId={displayVideoData.id} />
          <VideoDetails videoInfo={displayVideoData} />
          <DescriptionBox
            videoInfo={displayVideoData}
            formattedViews={displayVideoData.viewsFormatted}
            formattedAbsoluteDate={displayVideoData.uploadTimeAbsolute}
          />
          <CommentsSection
            commentsWithSentiments={commentsWithSentiments}
            isLoadingComments={isLoadingComments}
            isLoadingSentimentsGlobal={isLoadingSentiments}
            areSentimentsReady={areSentimentsReady}
            errorComments={errorComments}
            initialCommentCount={displayVideoData.Comments}
          />
        </div>

        {/* Right Column (layout remains same) */}
        <div className="w-full lg:w-[360px] xl:w-[402px] flex-shrink-0 lg:sticky lg:top-[calc(theme(spacing.14)_+_theme(spacing.6))] max-h-[calc(100vh_-_theme(spacing.14)_-_theme(spacing.12))] overflow-y-auto custom-scrollbar flex flex-col gap-4">
          <div className="flex-shrink-0">
            <SummarySection
              activeContext={activeSummaryContext}
              setActiveContext={setActiveSummaryContext}
              videoSummary={videoSummary}
              commentSummary={commentSummary}
              isLoadingVideoSummary={isLoadingVideoSummary}
              isLoadingCommentSummary={isLoadingCommentSummary}
              errorVideoSummary={errorVideoSummary}
              errorCommentSummary={errorCommentSummary}
            />
          </div>
          <div className="flex-shrink-0 bg-youtube-dark-secondary rounded-xl p-3">
            <QASection
              videoId={displayVideoData.id}
              activeContext={activeSummaryContext}
              isEnabled={isQAEnabled}
            />
          </div>
          {!isLoadingComments &&
          areSentimentsReady &&
          commentsWithSentiments.length > 0 &&
          !errorSentiments ? (
            <div className="flex-shrink-0">
              <SentimentDistributionChart
                sentiments={commentsWithSentiments
                  .map((c) => c.sentiment)
                  .filter((s) => s !== null)}
              />
            </div>
          ) : !isLoadingComments && isLoadingSentiments ? (
            <SentimentChartSkeleton />
          ) : null}
        </div>
      </main>
    </div>
  );
}
