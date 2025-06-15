import React, { forwardRef } from "react";
import { useRouter } from "next/router";

const formatViews = (views) => {
  if (!views || isNaN(views)) return "N/A views";
  if (views >= 1000000) return (views / 1000000).toFixed(1) + "M views";
  if (views >= 1000) return (views / 1000).toFixed(0) + "K views";
  return `${views.toLocaleString()} views`;
};

const SearchResultItem = forwardRef(
  ({ video, onHover, isHighlighted }, ref) => {
    const router = useRouter();
    if (!video) return null;

    const videoLink =
      video.id && !video.id.startsWith("http") ? `/watch?v=${video.id}` : "#";

    const handleVideoClick = (e) => {
      e.preventDefault();
      sessionStorage.setItem("currentWatchVideoData", JSON.stringify(video));
      router.push(videoLink);
    };

    return (
      <a
        ref={ref}
        href={videoLink}
        onClick={handleVideoClick}
        onMouseEnter={() => onHover(video.id)}
        onMouseLeave={() => onHover(null)}
        className={`flex flex-col sm:flex-row gap-4 mb-6 group cursor-pointer p-2 rounded-lg transition-all duration-100
        ${
          isHighlighted
            ? "bg-youtube-dark-secondary shadow-lg scale-[1.02]"
            : ""
        }
      `}
      >
        <div className="relative flex-shrink-0 w-full sm:w-[360px] h-[202px]">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={`Thumbnail for ${video.title}`}
              className="absolute inset-0 w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="absolute inset-0 bg-youtube-dark-secondary rounded-lg animate-pulse"></div>
          )}
          {video.duration && (
            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
              {video.duration}
            </span>
          )}
        </div>
        <div className="flex-grow">
          <h3
            className="text-lg font-normal text-youtube-gray-primary mb-1 group-hover:text-white line-clamp-2"
            title={video.title}
          >
            {video.title || "Untitled Video"}
          </h3>
          <div className="text-xs text-youtube-gray-secondary mb-2">
            <span>{formatViews(video.views)}</span>
            <span className="mx-1">•</span>
            <span>{video.uploadTimeFormatted || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden relative bg-youtube-dark-secondary">
              {video.channelThumbnailUrl ? (
                <img
                  src={video.channelThumbnailUrl}
                  alt={`${video.channelName || "Channel"} avatar`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-youtube-dark-tertiary"></div>
              )}
            </div>
            <span className="text-xs text-youtube-gray-secondary">
              {video.channelName || "Unknown Channel"}
            </span>
          </div>
          <p className="text-xs text-youtube-gray-secondary line-clamp-2 hidden sm:block">
            {video.description.length > 100
              ? video.description.slice(0, 100) + "..."
              : video.description || "No description available."}
          </p>
        </div>
      </a>
    );
  }
);

SearchResultItem.displayName = "SearchResultItem";

export default SearchResultItem;
