import React from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { MoreVertical, CheckCircle, UserCircle } from "lucide-react";

export default function SearchResultItem({ video }) {
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
      href={videoLink}
      onClick={handleVideoClick}
      className="flex flex-col sm:flex-row gap-4 mb-6 group cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-full sm:w-[360px] h-[202px]">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt={`Thumbnail for ${video.title}`}
            layout="fill"
            objectFit="cover"
            className="rounded-lg group-hover:rounded-none transition-all duration-200"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-youtube-dark-secondary rounded-lg animate-pulse flex items-center justify-center text-sm text-youtube-gray-secondary">
            No Thumbnail
          </div>
        )}
        {video.duration && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
            {video.duration}
          </span>
        )}
      </div>

      {/* Video Details */}
      <div className="flex-grow">
        <h3
          className="text-lg font-normal text-youtube-gray-primary mb-1 group-hover:text-white line-clamp-2"
          title={video.title}
        >
          {video.title || "Untitled Video"}
        </h3>
        <div className="text-xs text-youtube-gray-secondary mb-2">
          {/* Display formatted views and upload time from the video object */}
          <span>{formatViews(video.views) || "N/A views"}</span>
          <span className="mx-1">•</span>
          <span>{video.uploadTimeFormatted || "N/A"}</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden relative bg-youtube-dark-secondary">
            {video.channelThumbnailUrl ? (
              <Image
                src={video.channelThumbnailUrl}
                alt={`${video.channelName || "Channel"} avatar`}
                layout="fill"
                objectFit="cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <UserCircle
                size={24}
                className="text-youtube-gray-secondary absolute inset-0 m-auto"
              />
            )}
          </div>
          <span className="text-xs text-youtube-gray-secondary flex items-center gap-1">
            {video.channelName || "Unknown Channel"}
            {video.verified && (
              <CheckCircle size={12} className="text-youtube-gray-secondary" />
            )}
          </span>
        </div>
        <p className="text-xs text-youtube-gray-secondary line-clamp-2 hidden sm:block">
          {video.description.length > 100
            ? video.description.slice(0, 100) + "..."
            : video.description || "No description available."}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("More options clicked for video ID:", video.id);
        }}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 self-start mt-1 ml-auto sm:ml-0 p-1 rounded-full hover:bg-youtube-dark-secondary"
        aria-label="More options"
      >
        <MoreVertical size={20} className="text-white" />
      </button>
    </a>
  );
}

const formatViews = (views) => {
  if (!views || isNaN(views)) return "N/A";
  if (views >= 1000000) return (views / 1000000).toFixed(1) + "M";
  if (views >= 1000) return (views / 1000).toFixed(0) + "K";
  return views.toString();
};
