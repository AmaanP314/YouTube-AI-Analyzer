import React from "react";
import Image from "next/image";
import {
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Download,
  UserCircle,
} from "lucide-react";

const formatLikes = (likes) => {
  if (likes === undefined || likes === null || isNaN(likes)) return "Like"; // Default text if no likes
  if (likes < 1000) return likes.toString();
  if (likes < 1000000) {
    // For thousands, truncate to a whole number
    return Math.floor(likes / 1000) + "K";
  }
  // For millions, truncate to a whole number
  return Math.floor(likes / 1000000) + "M";
};

const formatSubscribers = (subs) => {
  if (subs === undefined || subs === null || isNaN(subs)) return "N/A";
  if (subs < 1000) return subs.toString();
  if (subs < 1000000) return (subs / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return (subs / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
};

export default function VideoDetails({ videoInfo }) {
  if (!videoInfo) {
    return (
      <div className="mt-4 p-3 bg-youtube-dark-secondary rounded-xl animate-pulse h-40">
        Loading details...
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h1 className="text-xl sm:text-2xl font-semibold text-youtube-gray-primary mb-2 break-words">
        {videoInfo.title || "Untitled Video"}
      </h1>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Channel Info & Subscribe */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden relative bg-youtube-dark-secondary">
            {videoInfo.channelThumbnailUrl ? (
              <Image
                src={videoInfo.channelThumbnailUrl}
                alt={`${videoInfo.channelName || "Channel"} avatar`}
                fill
                style={{ objectFit: "cover" }}
                sizes="40px"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <UserCircle
                size={40}
                className="text-youtube-gray-secondary absolute inset-0"
              />
            )}
            {!videoInfo.channelThumbnailUrl && (
              <UserCircle
                size={40}
                className="text-youtube-gray-secondary absolute inset-0"
              />
            )}
          </div>
          <div>
            <div className="text-sm sm:text-base font-medium text-youtube-gray-primary flex items-center gap-1.5">
              {videoInfo.channelName || "Unknown Channel"}
              {videoInfo.verified && (
                <CheckCircle
                  size={14}
                  className="text-youtube-gray-secondary"
                />
              )}
            </div>
            <div className="text-xs text-youtube-gray-secondary">
              {formatSubscribers(videoInfo.subscribers) || "N/A"} subscribers
            </div>
          </div>
          <button className="ml-2 sm:ml-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-black rounded-full text-xs sm:text-sm font-medium hover:bg-gray-200 whitespace-nowrap">
            Subscribe
          </button>
        </div>

        {/* Action Buttons (Like, Dislike, Share, etc.) */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <div className="flex items-center bg-youtube-dark-secondary rounded-full">
            <button className="flex items-center gap-1 sm:gap-1.5 pl-3 pr-2 sm:pl-4 sm:pr-3 py-1.5 sm:py-2 hover:bg-[#3f3f3f] rounded-l-full">
              <ThumbsUp size={18} smSize={20} className="text-white" />
              <span className="text-xs sm:text-sm font-medium text-white">
                {formatLikes(videoInfo.likes)}
              </span>
            </button>
            <div className="w-px h-5 sm:h-6 bg-[#555]"></div> {/* Separator */}
            <button className="px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-[#3f3f3f] rounded-r-full">
              <ThumbsDown size={18} smSize={20} className="text-white" />
            </button>
          </div>
          <button className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-youtube-dark-secondary rounded-full hover:bg-[#3f3f3f]">
            <Share2 size={18} smSize={20} className="text-white" />
            <span className="text-xs sm:text-sm font-medium text-white">
              Share
            </span>
          </button>
          <button className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-youtube-dark-secondary rounded-full hover:bg-[#3f3f3f]">
            <Download size={20} className="text-white" />
            <span className="text-sm font-medium text-white">Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}
