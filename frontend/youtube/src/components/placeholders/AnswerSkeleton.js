import React from "react";

export default function AnswerSkeleton() {
  return (
    <div className="mt-4 p-3 bg-youtube-dark-tertiary rounded-lg animate-pulse">
      <div className="space-y-2">
        <div className="h-3 bg-youtube-dark-secondary rounded w-full"></div>
        <div className="h-3 bg-youtube-dark-secondary rounded w-5/6"></div>
        <div className="h-3 bg-youtube-dark-secondary rounded w-full"></div>
        <div className="h-3 bg-youtube-dark-secondary rounded w-4/6"></div>
      </div>
    </div>
  );
}
