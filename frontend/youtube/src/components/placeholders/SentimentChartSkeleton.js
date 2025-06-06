import React from "react";

export default function SentimentChartSkeleton() {
  return (
    <div className="p-4 bg-youtube-dark-secondary rounded-xl animate-pulse mt-4">
      {/* Title Placeholder */}
      <div className="h-5 bg-youtube-dark-tertiary rounded w-1/2 mb-4"></div>
      {/* Chart Bars Placeholder */}
      <div className="flex justify-around items-end h-40">
        <div className="h-2/3 w-8 bg-youtube-dark-tertiary rounded-t-sm"></div>
        <div className="h-1/2 w-8 bg-youtube-dark-tertiary rounded-t-sm"></div>
        <div className="h-3/4 w-8 bg-youtube-dark-tertiary rounded-t-sm"></div>
      </div>
      {/* Legend Placeholder */}
      <div className="flex justify-center gap-4 mt-3">
        <div className="h-3 w-12 bg-youtube-dark-tertiary rounded"></div>
        <div className="h-3 w-12 bg-youtube-dark-tertiary rounded"></div>
        <div className="h-3 w-12 bg-youtube-dark-tertiary rounded"></div>
      </div>
    </div>
  );
}
