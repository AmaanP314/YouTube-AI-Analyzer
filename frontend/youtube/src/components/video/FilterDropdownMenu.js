import React from "react";

const FilterOptionButton = ({
  label,
  onClick,
  isActive,
  disabled = false,
  isRadio = false,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    role={isRadio ? "radio" : "checkbox"}
    aria-checked={isActive}
    className={`w-full text-left px-4 py-2.5 text-sm transition-colors
      ${
        isActive
          ? "bg-youtube-gray-border text-white"
          : "text-youtube-gray-primary hover:bg-youtube-dark-secondary"
      }
      ${disabled ? "opacity-50 cursor-not-allowed hover:bg-transparent" : ""}
    `}
  >
    {label}
  </button>
);

export default function FilterDropdownMenu({
  isOpen,
  activePrimarySort,
  activeSentimentFilter,
  onPrimarySortChange,
  onSentimentFilterChange,
  areSentimentsReady,
  onClose,
}) {
  if (!isOpen) return null;

  const sentimentFilters = ["Positive", "Neutral", "Negative"];

  return (
    <div
      className="absolute z-20 mt-1 right-0 sm:left-0 sm:right-auto w-48 bg-[#282828] border border-youtube-gray-border rounded-md shadow-xl py-1"
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="comment-filter-button"
    >
      <div className="px-4 py-2 text-xs text-youtube-gray-secondary border-b border-youtube-gray-border">
        Sort by
      </div>
      <FilterOptionButton
        label="Top comments"
        onClick={() => {
          onPrimarySortChange("relevance");
          onClose();
        }}
        isActive={activePrimarySort === "relevance"}
        isRadio={true}
      />
      <FilterOptionButton
        label="Newest first"
        onClick={() => {
          onPrimarySortChange("time");
          onClose();
        }}
        isActive={activePrimarySort === "time"}
        isRadio={true}
      />

      {areSentimentsReady && (
        <>
          <div className="px-4 py-2 text-xs text-youtube-gray-secondary border-b border-t border-youtube-gray-border mt-1">
            Filter by sentiment
          </div>
          {sentimentFilters.map((sentiment) => (
            <FilterOptionButton
              key={sentiment}
              label={sentiment}
              onClick={() => {
                onSentimentFilterChange(
                  sentiment === activeSentimentFilter ? null : sentiment
                );
                onClose();
              }}
              isActive={sentiment === activeSentimentFilter}
              disabled={!areSentimentsReady}
              isRadio={false}
            />
          ))}
        </>
      )}
    </div>
  );
}
