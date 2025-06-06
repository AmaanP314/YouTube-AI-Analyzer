import React from "react";
import ReactMarkdown from "react-markdown";
import SummarySkeleton from "../placeholders/SummarySkeleton";

const customRenderers = {
  p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => (
    <strong className="font-semibold" {...props} />
  ),
  em: ({ node, ...props }) => <em className="italic" {...props} />,
  ul: ({ node, ...props }) => (
    <ul className="list-disc list-inside space-y-1 my-2 pl-2" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal list-inside space-y-1 my-2 pl-2" {...props} />
  ),
  li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
  a: ({ node, ...props }) => (
    <a
      className="text-blue-400 hover:text-blue-300 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
};

export default function SummarySection({
  activeContext,
  setActiveContext,
  videoSummary,
  commentSummary,
  isLoadingVideoSummary,
  isLoadingCommentSummary,
  errorVideoSummary,
  errorCommentSummary,
}) {
  return (
    <div className="bg-youtube-dark-secondary rounded-xl p-0 overflow-hidden h-full flex flex-col">
      {" "}
      {/* Ensure h-full and flex-col */}
      {/* Toggle Buttons */}
      <div className="flex border-b border-youtube-gray-border flex-shrink-0">
        {" "}
        {/* flex-shrink-0 for toggle */}
        <button
          onClick={() => setActiveContext("video")}
          className={`flex-1 py-2.5 px-4 text-sm font-medium focus:outline-none transition-colors duration-150
            ${
              activeContext === "video"
                ? "bg-[#3f3f3f] text-white border-b-2 border-white"
                : "text-youtube-gray-secondary hover:bg-[#383838] hover:text-white"
            }`}
        >
          Video Summary
        </button>
        <button
          onClick={() => setActiveContext("comments")}
          className={`flex-1 py-2.5 px-4 text-sm font-medium focus:outline-none transition-colors duration-150
            ${
              activeContext === "comments"
                ? "bg-[#3f3f3f] text-white border-b-2 border-white"
                : "text-youtube-gray-secondary hover:bg-[#383838] hover:text-white"
            }`}
        >
          Comment Summary
        </button>
      </div>
      {/* Summary Content - This area needs to scroll independently */}
      <div className="p-4 text-xs sm:text-sm text-youtube-gray-primary overflow-y-auto flex-grow custom-scrollbar min-h-[100px]">
        {" "}
        {activeContext === "video" &&
          (isLoadingVideoSummary ? (
            <SummarySkeleton />
          ) : errorVideoSummary || !videoSummary ? (
            <p className="text-youtube-gray-secondary">No summary found.</p>
          ) : (
            <ReactMarkdown components={customRenderers}>
              {videoSummary}
            </ReactMarkdown>
          ))}
        {activeContext === "comments" &&
          (isLoadingCommentSummary ? (
            <SummarySkeleton />
          ) : errorCommentSummary || !commentSummary ? (
            <p className="text-youtube-gray-secondary">No summary found.</p>
          ) : (
            <ReactMarkdown components={customRenderers}>
              {commentSummary}
            </ReactMarkdown>
          ))}
      </div>
    </div>
  );
}
