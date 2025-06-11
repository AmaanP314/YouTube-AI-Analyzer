import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createRef,
} from "react";
import { useRouter } from "next/router";
import Header from "../components/Header";
import SearchResultItem from "../components/results/SearchResultItem";
import SearchResultSkeleton from "../components/placeholders/SearchResultSkeleton";
import { Loader2 } from "lucide-react";
import ViewsLikesChart from "../components/visualizations/ViewsLikesChart";
import EngagementRateChart from "../components/visualizations/EngagementRateChart";
import CompositeScoreChart from "../components/visualizations/CompositeScoreChart";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const formatUploadDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffSeconds = Math.ceil(diffTime / 1000);
    if (diffSeconds < 60) return "Just now";
    const diffMinutes = Math.ceil(diffSeconds / 60);
    if (diffMinutes < 60)
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    const diffHours = Math.ceil(diffMinutes / 60);
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.ceil(diffHours / 24);
    if (diffDays === 1) return `1 day ago`;
    if (diffDays < 30) return `${diffDays} days ago`;
    const diffMonths = Math.floor(diffDays / 30.44);
    if (diffMonths < 12)
      return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
    const diffYears = Math.floor(diffDays / 365.25);
    return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
  } catch (e) {
    return "Invalid date";
  }
};

const stripHtml = (html) => {
  if (typeof document !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  }
  return html.replace(/<[^>]+>/g, "");
};

const transformApiData = (videosFromApi) => {
  if (!videosFromApi || videosFromApi.length === 0) return [];
  const calculateCompositeScore = (v) => {
    const viewScore = Math.log((v.Views || 0) + 1) * 0.5;
    const likeScore = Math.log((v.Likes || 0) + 1) * 0.3;
    const subscriberScore = Math.log((v.Subscribers || 0) + 1) * 0.2;
    return (viewScore + likeScore + subscriberScore) * 10;
  };
  return videosFromApi.map((video) => {
    let videoId = "";
    try {
      const url = new URL(video.Video_link);
      if (url.searchParams.has("v")) videoId = url.searchParams.get("v");
      else {
        const pathParts = url.pathname.split("/");
        videoId = pathParts.pop() || pathParts.pop();
      }
    } catch (e) {
      const idMatch = video.Video_link.match(
        /(?:[?&]v=|\/embed\/|\/1\/|\/v\/|https?:\/\/(?:www\.)?youtu\.be\/)([^&\n?#]+)/
      );
      if (idMatch && idMatch[1]) videoId = idMatch[1];
      else videoId = video.Video_link;
    }
    return {
      id: videoId,
      title: stripHtml(video.Title),
      channelName: video.Channel,
      subscribers: video.Subscribers,
      views: video.Views,
      likes: video.Likes,
      likesPercentage: video["Likes(%)"],
      uploadTimeRaw: video.Upload_date,
      uploadTimeFormatted: formatUploadDate(video.Upload_date),
      duration: video.Duration,
      thumbnailUrl: video.Thumbnail,
      channelThumbnailUrl: video.Channel_Thumbnail,
      description: video.Description,
      compositeScore: calculateCompositeScore(video),
      Comments: video.Comments,
    };
  });
};

const MAX_RESULTS_PER_PAGE = 10;

export default function ResultsPage() {
  const router = useRouter();
  const { search_query } = router.query;

  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [currentQueryForHeader, setCurrentQueryForHeader] = useState("");
  const [highlightedVideoId, setHighlightedVideoId] = useState(null);
  const videoRefs = useRef({});
  const observerSentinel = useRef(null);

  useEffect(() => {
    searchResults.forEach((video) => {
      if (!videoRefs.current[video.id]) {
        videoRefs.current[video.id] = createRef();
      }
    });
  }, [searchResults]);

  const performInitialSearch = useCallback(async (query) => {
    if (!query || query.trim() === "") {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setSearchResults([]);
    setNextPageToken(null);
    setHasMorePages(true);
    setCurrentQueryForHeader(query);
    try {
      const response = await fetch(
        `${apiUrl}/search?query=${encodeURIComponent(
          query
        )}&max_results=${MAX_RESULTS_PER_PAGE}`
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.results) {
        const transformedData = transformApiData(data.results.videos || []);
        setSearchResults(transformedData);
        setNextPageToken(data.results.nextPageToken);
        setHasMorePages(!!data.results.nextPageToken);
        sessionStorage.setItem(
          "youtubeLastSearchState",
          JSON.stringify({
            query: query,
            results: transformedData,
            nextPageToken: data.results.nextPageToken,
            hasMorePages: !!data.results.nextPageToken,
          })
        );
      } else {
        setSearchResults([]);
        setHasMorePages(false);
      }
    } catch (err) {
      console.error("Initial search failed:", err);
      setError(err.message);
      setSearchResults([]);
      setHasMorePages(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMoreResults = useCallback(async () => {
    if (!nextPageToken || isLoadingMore || !hasMorePages) return;
    setIsLoadingMore(true);
    const query = router.query.search_query;
    try {
      const response = await fetch(
        `${apiUrl}/search?query=${encodeURIComponent(
          query
        )}&max_results=${MAX_RESULTS_PER_PAGE}&page_token=${nextPageToken}`
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.results && data.results.videos) {
        const newTransformedData = transformApiData(data.results.videos);
        setSearchResults((prev) => {
          const updatedResults = [...prev, ...newTransformedData];
          sessionStorage.setItem(
            "youtubeLastSearchState",
            JSON.stringify({
              query: query,
              results: updatedResults,
              nextPageToken: data.results.nextPageToken,
              hasMorePages: !!data.results.nextPageToken,
            })
          );
          return updatedResults;
        });
        setNextPageToken(data.results.nextPageToken);
        setHasMorePages(!!data.results.nextPageToken);
      } else {
        setHasMorePages(false);
      }
    } catch (err) {
      console.error("Load more failed:", err);
      setError(err.message);
      setHasMorePages(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPageToken, isLoadingMore, hasMorePages, router.query.search_query]);

  useEffect(() => {
    if (!router.isReady) return;
    const query = router.query.search_query;
    const storedStateString = sessionStorage.getItem("youtubeLastSearchState");
    let storedState = null;
    if (storedStateString) {
      try {
        storedState = JSON.parse(storedStateString);
      } catch (e) {
        console.error("Failed to parse stored search state");
      }
    }
    if (query) {
      if (storedState && storedState.query === query) {
        setSearchResults(storedState.results);
        setNextPageToken(storedState.nextPageToken);
        setHasMorePages(storedState.hasMorePages);
        setCurrentQueryForHeader(query);
        setIsLoading(false);
      } else {
        performInitialSearch(query);
      }
    } else if (storedState) {
      setSearchResults(storedState.results);
      setNextPageToken(storedState.nextPageToken);
      setHasMorePages(storedState.hasMorePages);
      setCurrentQueryForHeader(storedState.query);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [router.isReady, router.query.search_query, performInitialSearch]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMorePages &&
          !isLoadingMore &&
          nextPageToken
        ) {
          loadMoreResults();
        }
      },
      { threshold: 1.0 }
    );
    const currentSentinel = observerSentinel.current;
    if (currentSentinel) observer.observe(currentSentinel);
    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
    };
  }, [hasMorePages, isLoadingMore, loadMoreResults, nextPageToken]);

  const handleHeaderSearch = (newQuery) => {
    if (newQuery && newQuery.trim() !== "") {
      router.push(`/results?search_query=${encodeURIComponent(newQuery)}`);
    }
  };

  const handleChartClick = (payload) => {
    if (payload && payload.id) {
      const videoRef = videoRefs.current[payload.id];
      if (videoRef && videoRef.current) {
        videoRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        setHighlightedVideoId(payload.id);
        setTimeout(() => setHighlightedVideoId(null), 1500);
      }
    }
  };

  return (
    <div className="min-h-screen bg-youtube-dark font-inter text-white">
      <Header
        onSearch={handleHeaderSearch}
        initialQuery={currentQueryForHeader}
      />
      <main className="w-full px-2 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:flex-grow min-w-0">
          {isLoading && (
            <>
              {" "}
              {Array.from({ length: 5 }).map((_, index) => (
                <SearchResultSkeleton key={`skel-${index}`} />
              ))}{" "}
            </>
          )}
          {searchResults.length > 0 && (
            <div>
              {searchResults.map((video) => (
                <SearchResultItem
                  key={video.id}
                  ref={videoRefs.current[video.id]}
                  video={video}
                  onHover={setHighlightedVideoId}
                  isHighlighted={video.id === highlightedVideoId}
                />
              ))}
            </div>
          )}
          <div
            ref={observerSentinel}
            className="h-10 flex justify-center items-center"
          >
            {isLoadingMore && (
              <div className="flex items-center justify-center text-youtube-gray-secondary">
                <Loader2 size={24} className="animate-spin mr-2" />
                <span>Loading...</span>
              </div>
            )}
            {!isLoadingMore && !hasMorePages && searchResults.length > 0 && (
              <p className="text-sm text-youtube-gray-secondary">
                End of results.
              </p>
            )}
          </div>
        </div>

        <div className="w-full lg:w-[360px] xl:w-[402px] flex-shrink-0 lg:sticky lg:top-[calc(theme(spacing.14)_+_theme(spacing.6))] max-h-[calc(100vh_-_theme(spacing.14)_-_theme(spacing.12))] overflow-y-auto custom-scrollbar flex flex-col gap-4 overflow-x-hidden">
          {searchResults.length > 0 ? (
            <>
              <ViewsLikesChart
                videoData={searchResults}
                onBarClick={handleChartClick}
                highlightedVideoId={highlightedVideoId}
              />
              <EngagementRateChart
                videoData={searchResults}
                onBarClick={handleChartClick}
                highlightedVideoId={highlightedVideoId}
              />
              <CompositeScoreChart
                videoData={searchResults}
                onBarClick={handleChartClick}
                highlightedVideoId={highlightedVideoId}
              />
            </>
          ) : (
            !isLoading && (
              <div className="p-4 bg-youtube-dark-secondary rounded-xl text-center text-sm text-youtube-gray-secondary">
                Search for videos to see analytics.
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
