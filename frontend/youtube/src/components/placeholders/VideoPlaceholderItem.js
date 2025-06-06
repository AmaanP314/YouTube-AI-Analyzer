import React from "react";

const VideoPlaceholderItem = () => {
  return (
    <div className="flex flex-col sm:flex-row items-start w-full space-x-0 sm:space-x-4 py-3 mb-4 border-b border-youtube-gray-border last:border-b-0 last:mb-0">
      {/* Thumbnail Placeholder */}
      <div className="w-full sm:w-48 md:w-60 lg:w-72 xl:w-80 h-auto aspect-video bg-gray-700 rounded-lg animate-pulse mb-3 sm:mb-0 flex-shrink-0"></div>

      <div className="flex-1 space-y-2.5 w-full pr-2">
        {/* Title Placeholder */}
        <div className="h-5 bg-gray-700 rounded animate-pulse w-full sm:w-5/6"></div>
        <div className="h-5 bg-gray-700 rounded animate-pulse w-full sm:w-3/4"></div>

        {/* Metadata Placeholder (Views, Date) */}
        <div className="flex items-center space-x-2 pt-1">
          <div className="h-3.5 bg-gray-700 rounded animate-pulse w-24 sm:w-32"></div>
          <div className="h-3.5 bg-gray-700 rounded animate-pulse w-16 sm:w-20"></div>
        </div>

        {/* Channel Thumbnail and Name Placeholder */}
        <div className="flex items-center space-x-2 pt-2">
          <div className="w-7 h-7 bg-gray-700 rounded-full animate-pulse flex-shrink-0"></div>
          <div className="h-3.5 bg-gray-700 rounded animate-pulse w-20 sm:w-28"></div>
        </div>

        {/* Description Placeholder (Optional, usually short) */}
        <div className="h-3.5 bg-gray-700 rounded animate-pulse w-full sm:w-11/12 pt-1.5"></div>
        <div className="h-3.5 bg-gray-700 rounded animate-pulse w-full sm:w-10/12"></div>
      </div>
    </div>
  );
};

export default VideoPlaceholderItem;
