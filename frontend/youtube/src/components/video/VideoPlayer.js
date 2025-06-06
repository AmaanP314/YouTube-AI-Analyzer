import React from "react";

export default function VideoPlayer({ videoId }) {
  if (!videoId) {
    return (
      <div className="aspect-video bg-youtube-dark-tertiary w-full rounded-xl flex items-center justify-center text-youtube-gray-secondary animate-pulse">
        <span>Video ID not provided.</span>
      </div>
    );
  }
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden">
      <iframe
        width="100%"
        height="100%"
        src={embedUrl}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="rounded-xl"
      ></iframe>
    </div>
  );
}
