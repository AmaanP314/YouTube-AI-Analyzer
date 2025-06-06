import React, { useState, useMemo } from "react";

const linkifyText = (text) => {
  if (!text) return [];
  const urlRegex =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
  let lastIndex = 0;
  const parts = [];
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const urlStartIndex = match.index;

    // Add text part before the URL
    if (urlStartIndex > lastIndex) {
      parts.push(text.substring(lastIndex, urlStartIndex));
    }

    // Add the link
    const href = url.startsWith("www.") ? `http://${url}` : url;
    parts.push(
      <a
        key={url + urlStartIndex}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 hover:underline"
      >
        {url}
      </a>
    );
    lastIndex = urlRegex.lastIndex;
  }

  // Add remaining text part
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts;
};

export default function DescriptionBox({
  videoInfo,
  formattedViews,
  formattedAbsoluteDate,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Call useMemo unconditionally
  const processedDescription = useMemo(
    () => (videoInfo ? linkifyText(videoInfo.description) : []), // Handle videoInfo being null initially
    [videoInfo?.description] // Depend on videoInfo.description safely
  );

  const toggleExpand = () => setIsExpanded(!isExpanded);

  // Show only a few lines initially if description is long
  const needsExpansion =
    videoInfo?.description?.split("\n").length > 3 ||
    videoInfo?.description?.length > 200;

  if (!videoInfo) {
    return (
      <div className="mt-4 p-3 bg-youtube-dark-secondary rounded-xl animate-pulse h-24">
        Loading description...
      </div>
    );
  }

  return (
    <div
      className="mt-3 p-3 bg-youtube-dark-secondary rounded-xl text-sm text-youtube-gray-primary hover:bg-[#383838] transition-colors cursor-pointer"
      onClick={!isExpanded ? toggleExpand : undefined}
    >
      <div className="font-medium mb-1 flex items-center gap-x-2 flex-wrap">
        <span className="font-bold">{formattedViews || "N/A views"}</span>
        <span>•</span>
        <span className="font-bold">{formattedAbsoluteDate || "N/A"}</span>
        {videoInfo.hashtags?.map((tag) => (
          <a
            key={tag}
            href={`/search?query=${encodeURIComponent(tag)}`}
            className="text-blue-400 hover:text-blue-300 ml-1"
          >
            {tag}
          </a>
        ))}
      </div>
      <div
        className={`whitespace-pre-line break-words ${
          !isExpanded && needsExpansion ? "line-clamp-2 sm:line-clamp-3" : ""
        }`}
      >
        {processedDescription}
      </div>
      {needsExpansion && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand();
          }}
          className="font-semibold mt-2 hover:text-white text-youtube-gray-primary block w-full text-left"
        >
          {isExpanded ? "Show less" : "...more"}
        </button>
      )}
    </div>
  );
}
