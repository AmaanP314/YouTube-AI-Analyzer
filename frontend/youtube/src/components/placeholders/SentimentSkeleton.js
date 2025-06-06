import React from "react";

export default function SentimentSkeleton() {
  return (
    <div className="group relative inline-block ml-2">
      <div className="h-3 w-16 bg-youtube-dark-secondary rounded animate-pulse"></div>
      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-0.5 text-xs text-white bg-black/80 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap">
        Sentiment loading...
      </span>
    </div>
  );
}
