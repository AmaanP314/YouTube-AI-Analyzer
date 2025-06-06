import React from "react";

export default function CommentSkeleton() {
  return (
    <div className="flex items-start gap-3 py-4">
      {/* Commenter Avatar Placeholder */}
      <div className="w-10 h-10 bg-youtube-dark-secondary rounded-full animate-pulse flex-shrink-0"></div>
      <div className="flex-grow">
        {/* User Info Placeholder (Name & Time) */}
        <div className="flex items-baseline gap-2 mb-2">
          <div className="h-3 bg-youtube-dark-secondary rounded w-1/4 animate-pulse"></div>
          <div className="h-2 bg-youtube-dark-secondary rounded w-1/6 animate-pulse"></div>
        </div>
        {/* Comment Text Placeholder */}
        <div className="h-3 bg-youtube-dark-secondary rounded w-full mb-1 animate-pulse"></div>
        <div className="h-3 bg-youtube-dark-secondary rounded w-5/6 mb-1 animate-pulse"></div>
        <div className="h-3 bg-youtube-dark-secondary rounded w-2/3 mb-2 animate-pulse"></div>
        {/* Comment Actions Placeholder (Like, Reply) */}
        <div className="flex items-center gap-4">
          <div className="h-4 w-10 bg-youtube-dark-secondary rounded-full animate-pulse"></div>
          <div className="h-4 w-10 bg-youtube-dark-secondary rounded-full animate-pulse"></div>
          <div className="h-4 w-16 bg-youtube-dark-secondary rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
