import React from "react";

const SortButton = ({ label, onClick, isActive, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors
      ${
        isActive
          ? "bg-white text-youtube-dark"
          : "bg-youtube-dark-secondary text-youtube-gray-primary hover:bg-[#3f3f3f]"
      }
      ${disabled ? "opacity-50 cursor-not-allowed" : ""}
    `}
  >
    {label}
  </button>
);

export default function SortFilterControls({
  activePrimarySort, // 'relevance' or 'time'
  activeSentimentFilter, // 'Positive', 'Neutral', 'Negative', or null
  onPrimarySortChange,
  onSentimentFilterChange,
  areSentimentsReady, // boolean
}) {
  const sentimentFilters = ["Positive", "Neutral", "Negative"];

  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-4">
      {/* Primary Sort Buttons */}
      <div className="flex items-center gap-2 p-0.5 bg-youtube-dark-secondary rounded-full">
        <SortButton
          label="Top comments"
          onClick={() => onPrimarySortChange("relevance")}
          isActive={activePrimarySort === "relevance"}
        />
        <SortButton
          label="Newest first"
          onClick={() => onPrimarySortChange("time")}
          isActive={activePrimarySort === "time"}
        />
      </div>
      <div className="h-5 w-px bg-youtube-gray-border hidden sm:block"></div>{" "}
      {/* Separator */}
      {/* Sentiment Filter Buttons */}
      <div className="flex items-center gap-2 p-0.5 bg-youtube-dark-secondary rounded-full">
        {sentimentFilters.map((sentiment) => (
          <SortButton
            key={sentiment}
            label={sentiment}
            onClick={() =>
              onSentimentFilterChange(
                sentiment === activeSentimentFilter ? null : sentiment
              )
            }
            isActive={sentiment === activeSentimentFilter}
            disabled={!areSentimentsReady}
          />
        ))}
      </div>
    </div>
  );
}
