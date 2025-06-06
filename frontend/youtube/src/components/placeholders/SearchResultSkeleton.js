import React from "react";

export default function SearchResultSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Thumbnail Placeholder */}
      <div className="relative flex-shrink-0 w-full sm:w-[360px] h-[202px]">
        <div className="absolute inset-0 bg-youtube-dark-secondary rounded-lg animate-pulse"></div>
      </div>

      {/* Video Details Placeholder */}
      <div className="flex-grow">
        {/* Title Placeholder */}
        <div className="h-5 bg-youtube-dark-secondary rounded w-3/4 mb-2 animate-pulse"></div>
        <div className="h-5 bg-youtube-dark-secondary rounded w-1/2 mb-3 animate-pulse"></div>

        {/* Views and Upload Time Placeholder */}
        <div className="h-3 bg-youtube-dark-secondary rounded w-1/3 mb-3 animate-pulse"></div>

        {/* Channel Info Placeholder */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-youtube-dark-secondary rounded-full animate-pulse flex-shrink-0"></div>
          <div className="h-3 bg-youtube-dark-secondary rounded w-1/4 animate-pulse"></div>
        </div>

        {/* Description Snippet Placeholder (hidden on small screens, matching SearchResultItem) */}
        <div className="h-3 bg-youtube-dark-secondary rounded w-full mb-1 animate-pulse hidden sm:block"></div>
        <div className="h-3 bg-youtube-dark-secondary rounded w-5/6 animate-pulse hidden sm:block"></div>
      </div>
    </div>
  );
}
