import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  ThumbsUp,
  ThumbsDown,
  UserCircle,
  Smile,
  Meh,
  Frown,
  Search,
} from "lucide-react";
import CommentSkeleton from "../placeholders/CommentSkeleton";
import SentimentSkeleton from "../placeholders/SentimentSkeleton";
import SortFilterControls from "./SortFilterControls";

const linkifyText = (text) => {
  if (!text) return [text];
  const urlRegex =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
  let lastIndex = 0;
  const parts = [];
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const urlStartIndex = match.index;
    if (urlStartIndex > lastIndex)
      parts.push(text.substring(lastIndex, urlStartIndex));
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
  if (lastIndex < text.length) parts.push(text.substring(lastIndex));
  return parts.length > 0 ? parts : [text];
};

const HighlightedText = ({ textParts, query }) => {
  if (!query || !textParts || textParts.length === 0) {
    return <>{textParts}</>;
  }

  const queryLower = query.toLowerCase();

  return (
    <>
      {textParts.map((part, i) => {
        if (typeof part === "string") {
          const subParts = part.split(new RegExp(`(${query})`, "gi"));
          return (
            <React.Fragment key={i}>
              {subParts.map((subPart, j) =>
                subPart.toLowerCase() === queryLower ? (
                  <span
                    key={`${i}-${j}`}
                    className="bg-yellow-500/30 text-yellow-200 rounded px-0.5"
                  >
                    {subPart}
                  </span>
                ) : (
                  subPart
                )
              )}
            </React.Fragment>
          );
        }
        return part;
      })}
    </>
  );
};

function CommentItem({
  comment,
  isLoadingSentimentsGlobal,
  commentSearchQuery,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_LENGTH = 600;
  const needsReadMore =
    comment.CommentText && comment.CommentText.length > MAX_LENGTH;

  const formatLikes = (likes) => {
    if (likes === undefined || likes === null || isNaN(likes) || likes === 0)
      return "";
    if (likes < 1000) return likes.toString();
    if (likes < 1000000)
      return (likes / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return (likes / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  };
  const formatCommentDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffSeconds = Math.ceil(diffTime / 1000);
      if (diffSeconds < 60) return "Just now";
      const diffMinutes = Math.ceil(diffSeconds / 60);
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.ceil(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.ceil(diffHours / 24);
      if (diffDays === 1) return `1d ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      const diffMonths = Math.floor(diffDays / 30.44);
      if (diffMonths < 12) return `${diffMonths}mo ago`;
      const diffYears = Math.floor(diffDays / 365.25);
      return `${diffYears}y ago`;
    } catch (e) {
      return "Invalid date";
    }
  };

  // Memoize linkified and highlighted text
  const renderedCommentText = useMemo(() => {
    const textToDisplay =
      isExpanded || !needsReadMore
        ? comment.CommentText
        : `${comment.CommentText.slice(0, MAX_LENGTH)}...`;
    const linkifiedParts = linkifyText(textToDisplay);
    return (
      <HighlightedText textParts={linkifiedParts} query={commentSearchQuery} />
    );
  }, [comment.CommentText, isExpanded, needsReadMore, commentSearchQuery]);

  const renderedAuthor = useMemo(() => {
    const linkifiedAuthor = linkifyText(comment.Author || "Unknown User"); // linkify might not be needed for author, but harmless
    return (
      <HighlightedText textParts={linkifiedAuthor} query={commentSearchQuery} />
    );
  }, [comment.Author, commentSearchQuery]);

  const getSentimentStyles = (sentimentText) => {
    if (!sentimentText)
      return {
        color: "text-youtube-gray-secondary",
        Icon: Meh,
        label: "Neutral",
      };
    switch (sentimentText.toLowerCase()) {
      case "positive":
        return { color: "text-green-400", Icon: Smile, label: "Positive" };
      case "neutral":
        return { color: "text-yellow-400", Icon: Meh, label: "Neutral" };
      case "negative":
        return { color: "text-red-400", Icon: Frown, label: "Negative" };
      default:
        return {
          color: "text-youtube-gray-secondary",
          Icon: Meh,
          label: "Neutral",
        };
    }
  };
  const {
    color: sentimentColor,
    Icon: SentimentIcon,
    label: sentimentLabel,
  } = getSentimentStyles(comment.sentiment);

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 overflow-hidden relative bg-youtube-dark-secondary">
        {comment.AuthorLogoUrl ? (
          <Image
            src={comment.AuthorLogoUrl}
            alt={`${comment.Author || "User"}'s avatar`}
            layout="fill"
            objectFit="cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <UserCircle
            size={40}
            className="text-youtube-gray-secondary absolute inset-0 m-auto"
          />
        )}
        {!comment.AuthorLogoUrl && (
          <UserCircle
            size={40}
            className="text-youtube-gray-secondary absolute inset-0 m-auto"
          />
        )}
      </div>
      <div className="flex-grow">
        <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
          <span className="text-xs sm:text-sm font-medium text-white">
            {renderedAuthor}
          </span>
          <span className="text-xs text-youtube-gray-secondary">
            {formatCommentDate(comment.PublishDate)}
          </span>
          {isLoadingSentimentsGlobal && !comment.sentiment ? (
            <SentimentSkeleton />
          ) : comment.sentiment ? (
            <span
              className={`text-xs font-medium flex items-center gap-1 ${sentimentColor}`}
              title={sentimentLabel}
            >
              <SentimentIcon size={14} />
              {sentimentLabel}
            </span>
          ) : null}
        </div>
        <div className="text-sm text-youtube-gray-primary whitespace-pre-line break-words">
          {renderedCommentText}
          {needsReadMore && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs text-youtube-gray-secondary hover:text-white ml-1 block mt-1 font-semibold"
            >
              Read more
            </button>
          )}
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-xs text-youtube-gray-secondary hover:text-white ml-1 block mt-1 font-semibold"
            >
              Read less
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-youtube-gray-secondary mt-2">
          <button className="flex items-center gap-1 hover:text-white">
            <ThumbsUp size={14} smSize={16} />
            <span className="text-xs font-medium">
              {formatLikes(comment.LikeCount)}
            </span>
          </button>
          <button className="hover:text-white">
            <ThumbsDown size={14} smSize={16} />
          </button>
          <button className="text-xs font-medium hover:bg-[#3f3f3f] px-2 py-1 rounded-full">
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommentsSection({
  commentsWithSentiments,
  isLoadingComments,
  isLoadingSentimentsGlobal,
  areSentimentsReady,
  errorComments,
  initialCommentCount,
}) {
  const [activePrimarySort, setActivePrimarySort] = useState("relevance");
  const [activeSentimentFilter, setActiveSentimentFilter] = useState(null);
  const [commentSearchQuery, setCommentSearchQuery] = useState("");

  const displayedComments = useMemo(() => {
    if (!commentsWithSentiments) return [];

    let workingList;

    // 1. Apply Search Filter (on the original full list)
    if (commentSearchQuery.trim() !== "") {
      const searchTerm = commentSearchQuery.toLowerCase();
      workingList = commentsWithSentiments.filter(
        (comment) =>
          (comment.CommentText &&
            comment.CommentText.toLowerCase().includes(searchTerm)) ||
          (comment.Author && comment.Author.toLowerCase().includes(searchTerm))
      );
    } else {
      workingList = [...commentsWithSentiments]; // No search, use all comments
    }

    // 2. Apply Primary Sort to the (potentially searched) list
    let sortedForPrimary = [...workingList]; // Create a new array for sorting
    if (activePrimarySort === "time") {
      // Filter for 'time' sort type from API and then sort by date
      sortedForPrimary = sortedForPrimary
        .filter((c) => c.SortBy === "time")
        .sort((a, b) => new Date(b.PublishDate) - new Date(a.PublishDate));
      // If no comments are 'time' type, this could be empty.
      // To ensure something is shown if user selects "Newest First" and search has results:
      if (sortedForPrimary.length === 0 && workingList.length > 0) {
        sortedForPrimary = workingList.sort(
          (a, b) => new Date(b.PublishDate) - new Date(a.PublishDate)
        );
      }
    } else {
      // 'relevance'
      sortedForPrimary = sortedForPrimary.filter(
        (c) => c.SortBy === "relevance"
      );
      // If no comments are 'relevance' type, sort all by likes as fallback for "Top Comments"
      if (sortedForPrimary.length === 0 && workingList.length > 0) {
        sortedForPrimary = workingList.sort(
          (a, b) => (b.LikeCount || 0) - (a.LikeCount || 0)
        );
      }
      // Assuming API already sorts 'relevance' items if any. If not, sort by LikeCount here for those.
      else if (sortedForPrimary.length > 0) {
        sortedForPrimary.sort(
          (a, b) => (b.LikeCount || 0) - (a.LikeCount || 0)
        );
      }
    }
    workingList = sortedForPrimary;

    // 3. Apply Sentiment Filter to the result of search and primary sort
    if (areSentimentsReady && activeSentimentFilter) {
      workingList = workingList.filter(
        (comment) =>
          comment.sentiment &&
          comment.sentiment.toLowerCase() ===
            activeSentimentFilter.toLowerCase()
      );
    }

    return workingList;
  }, [
    commentsWithSentiments,
    activePrimarySort,
    activeSentimentFilter,
    areSentimentsReady,
    commentSearchQuery,
  ]);

  if (isLoadingComments) {
    return (
      <div className="mt-6">
        <div className="h-5 bg-youtube-dark-secondary rounded w-1/4 mb-6 animate-pulse"></div>
        {Array.from({ length: 3 }).map((_, index) => (
          <CommentSkeleton key={index} />
        ))}
      </div>
    );
  }
  if (errorComments) {
    return (
      <div className="mt-6 text-red-400 p-4 bg-red-900/20 rounded-lg">
        Error loading comments: {errorComments}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <h2 className="text-lg font-bold text-white whitespace-nowrap">
          {initialCommentCount
            ? `${Number(initialCommentCount).toLocaleString()} Comments`
            : commentsWithSentiments.length > 0
            ? `${commentsWithSentiments.length.toLocaleString()} Comments`
            : "Comments"}
        </h2>
        {/* Reverted to SortFilterControls */}
        <SortFilterControls
          activePrimarySort={activePrimarySort}
          activeSentimentFilter={activeSentimentFilter}
          onPrimarySortChange={setActivePrimarySort}
          onSentimentFilterChange={setActiveSentimentFilter}
          areSentimentsReady={areSentimentsReady}
        />
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3 py-2 border-youtube-gray-border">
        <div className="w-10 h-10 rounded-full bg-youtube-dark-tertiary flex-shrink-0 flex items-center justify-center">
          <Search size={20} className="text-youtube-gray-secondary" />
        </div>
        <input
          type="text"
          placeholder="Search comments by text or author..."
          value={commentSearchQuery}
          onChange={(e) => setCommentSearchQuery(e.target.value)}
          className="w-full bg-transparent border-b-2 border-youtube-gray-border focus:border-white transition-colors text-sm text-white placeholder-youtube-gray-secondary outline-none pb-1.5"
        />
      </div>

      <div className="space-y-1">
        {displayedComments.length > 0 ? (
          displayedComments.map((comment, index) => (
            <CommentItem
              key={(comment.Author || "c") + (comment.PublishDate || index)}
              comment={comment}
              isLoadingSentimentsGlobal={
                isLoadingSentimentsGlobal && !comment.sentiment
              }
              commentSearchQuery={commentSearchQuery} // Pass search query for highlighting
            />
          ))
        ) : (
          <p className="text-youtube-gray-secondary py-4 text-center">
            {commentSearchQuery.trim() !== ""
              ? "No comments match your search."
              : activePrimarySort !== "relevance" || activeSentimentFilter
              ? "No comments match your current filters."
              : "No comments yet."}
          </p>
        )}
      </div>
    </div>
  );
}
