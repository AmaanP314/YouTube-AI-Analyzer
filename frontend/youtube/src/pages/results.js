import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Header from "../components/Header";
import SearchResultItem from "../components/results/SearchResultItem";
import SearchResultSkeleton from "../components/placeholders/SearchResultSkeleton";
import { Loader2 } from "lucide-react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
// Utility functions (ideally move to a shared utils.js file)
const formatViews = (views) => {
  if (!views || isNaN(views)) return "N/A";
  if (views >= 1000000) return (views / 1000000).toFixed(1) + "M";
  if (views >= 1000) return (views / 1000).toFixed(0) + "K";
  return views.toString();
};

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
    if (diffDays === 1) return `1 day ago`; // FIX: Changed to template literal to fix ' error
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

const MAX_RESULTS_PER_PAGE = 10; //Min 5, Max 50

export default function ResultsPage() {
  const router = useRouter();
  const { search_query } = router.query;

  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [currentQueryForHeader, setCurrentQueryForHeader] = useState("");

  const observerSentinel = useRef(null);

  // Transform API data
  const transformApiData = (videosFromApi) => {
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
        uploadTimeRaw: video.Upload_date,
        uploadTimeFormatted: formatUploadDate(video.Upload_date),
        duration: video.Duration,
        thumbnailUrl: video.Thumbnail,
        channelThumbnailUrl: video.Channel_Thumbnail,
        description: video.Description,
      };
    });
  };

  // Function for initial search
  const performInitialSearch = useCallback(async (query) => {
    if (!query || query.trim() === "") {
      setSearchResults([]);
      setIsLoading(false);
      setError(null);
      setNextPageToken(null);
      setHasMorePages(true);
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
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown server error" }));
        throw new Error(
          `HTTP error! status: ${response.status} - ${
            (errorData.detail || response.statusText)?.replace(/"/g, "&quot;") // FIX: Escape double quotes
          }`
        );
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.results) {
        setSearchResults(transformApiData(data.results.videos || []));
        setNextPageToken(data.results.nextPageToken);
        setHasMorePages(!!data.results.nextPageToken); // If no token, no more pages
        sessionStorage.setItem("youtubeLastSearchQuery", query); // Store query for potential back nav
      } else {
        setSearchResults([]);
        setHasMorePages(false);
      }
    } catch (err) {
      console.error("Initial search API call failed:", err);
      setError(err.message);
      setSearchResults([]);
      setHasMorePages(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to load more results
  const loadMoreResults = useCallback(async () => {
    if (!nextPageToken || isLoadingMore || !hasMorePages) return;

    setIsLoadingMore(true);
    setError(null); // Keep existing error if any from initial search

    const query = Array.isArray(search_query) ? search_query[0] : search_query;
    try {
      const response = await fetch(
        `${apiUrl}/search?query=${encodeURIComponent(
          query
        )}&max_results=${MAX_RESULTS_PER_PAGE}&page_token=${nextPageToken}`
      );
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown server error" }));
        throw new Error(
          `HTTP error! status: ${response.status} - ${
            (errorData.detail || response.statusText)?.replace(/"/g, "&quot;") // FIX: Escape double quotes
          }`
        );
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.results && data.results.videos) {
        setSearchResults((prevResults) => [
          ...prevResults,
          ...transformApiData(data.results.videos),
        ]);
        setNextPageToken(data.results.nextPageToken);
        setHasMorePages(!!data.results.nextPageToken);
      } else {
        setHasMorePages(false); // No more results or videos array missing
      }
    } catch (err) {
      console.error("Load more API call failed:", err);
      setError(err.message); // Show error, but don't clear existing results
      setHasMorePages(false); // Stop trying to load more on error
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPageToken, isLoadingMore, search_query, hasMorePages]);

  // Effect to perform initial search when search_query changes
  useEffect(() => {
    const query = Array.isArray(search_query) ? search_query[0] : search_query;
    if (query) {
      performInitialSearch(query);
    } else {
      // If no query in URL, try to load from session storage (e.g., after back navigation)
      const lastQuery = sessionStorage.getItem("youtubeLastSearchQuery");
      if (lastQuery) {
        setCurrentQueryForHeader(lastQuery);
        performInitialSearch(lastQuery); // This will set searchResults etc.
      } else {
        setSearchResults([]);
        setCurrentQueryForHeader("");
        setIsLoading(false);
        setNextPageToken(null);
        setHasMorePages(true);
      }
    }
  }, [search_query, performInitialSearch]);

  // Effect for infinite scroll using Intersection Observer
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
      { threshold: 1.0 } // Trigger when sentinel is fully visible
    );

    const currentSentinel = observerSentinel.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMorePages, isLoadingMore, loadMoreResults, nextPageToken]);

  // Handler for search initiated from the Header on this results page
  const handleHeaderSearch = (newQuery) => {
    if (newQuery && newQuery.trim() !== "") {
      // Clear previous session storage for specific video if navigating to new search results
      sessionStorage.removeItem("currentWatchVideoData");
      router.push(`/results?search_query=${encodeURIComponent(newQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-youtube-dark font-inter text-white">
      <Header
        onSearch={handleHeaderSearch}
        initialQuery={currentQueryForHeader}
      />
      <main className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading &&
          searchResults.length === 0 && ( // Show skeletons only on initial load and if no results yet
            <div>
              {Array.from({ length: MAX_RESULTS_PER_PAGE }).map((_, index) => (
                <SearchResultSkeleton key={`skel-${index}`} />
              ))}
            </div>
          )}
        {error &&
          searchResults.length === 0 && ( // Show error only if no results are displayed
            <p className="text-center text-lg text-red-500 py-10">
              Error: {error}
            </p>
          )}
        {!isLoading &&
          !error &&
          search_query &&
          searchResults.length === 0 &&
          !hasMorePages && ( // No results found after search
            <p className="text-center text-lg py-10">
              No results found for &quot;{currentQueryForHeader}&quot;. Try a
              different search.
            </p>
          )}
        {!isLoading &&
          !error &&
          !search_query &&
          searchResults.length === 0 && ( // No query in URL and no initial results
            <p className="text-center text-lg py-10">
              Enter a search term above to see results.
            </p>
          )}

        {searchResults.length > 0 && (
          <div>
            {searchResults.map((video) => (
              <SearchResultItem
                key={video.id ? `${video.id}-${Math.random()}` : video.title}
                video={video}
              />
            ))}
          </div>
        )}

        {/* Sentinel for Intersection Observer and "Loading More" spinner */}
        <div
          ref={observerSentinel}
          className="h-10 flex justify-center items-center"
        >
          {isLoadingMore && (
            <div className="flex items-center justify-center text-youtube-gray-secondary">
              <Loader2 size={24} className="animate-spin mr-2" />
              <span>Loading more videos...</span>
            </div>
          )}
          {!isLoadingMore && !hasMorePages && searchResults.length > 0 && (
            <p className="text-sm text-youtube-gray-secondary">
              You&apos;ve reached the end of the results.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
