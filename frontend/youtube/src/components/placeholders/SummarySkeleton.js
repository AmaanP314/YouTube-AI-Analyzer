import React from "react";

export default function SummarySkeleton() {
  return (
    <div className="p-3 bg-youtube-dark-secondary rounded-xl animate-pulse">
      {/* Title Placeholder */}
      <div className="h-5 bg-youtube-dark-tertiary rounded w-1/3 mb-4"></div>
      {/* Text Lines Placeholder */}
      <div className="space-y-2">
        <div className="h-3 bg-youtube-dark-tertiary rounded w-full"></div>
        <div className="h-3 bg-youtube-dark-tertiary rounded w-5/6"></div>
        <div className="h-3 bg-youtube-dark-tertiary rounded w-full"></div>
        <div className="h-3 bg-youtube-dark-tertiary rounded w-4/6"></div>
        <div className="h-3 bg-youtube-dark-tertiary rounded w-full sm:hidden"></div>{" "}
        {/* Extra line for varying length */}
        <div className="h-3 bg-youtube-dark-tertiary rounded w-1/2 sm:hidden"></div>
      </div>
    </div>
  );
}
