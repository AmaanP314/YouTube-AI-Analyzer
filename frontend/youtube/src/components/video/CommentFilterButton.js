import React, { useState, useEffect, useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
import FilterDropdownMenu from "./FilterDropdownMenu";

export default function CommentFilterButton({
  activePrimarySort,
  activeSentimentFilter,
  onPrimarySortChange,
  onSentimentFilterChange,
  areSentimentsReady,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);
  const closeDropdown = () => setIsDropdownOpen(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        ref={buttonRef}
        id="comment-filter-button"
        onClick={toggleDropdown}
        className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-youtube-gray-primary hover:bg-youtube-dark-secondary px-2 py-1 rounded-md"
        aria-haspopup="true"
        aria-expanded={isDropdownOpen}
      >
        <SlidersHorizontal size={18} className="text-youtube-gray-secondary" />
        Sort by
      </button>
      <FilterDropdownMenu
        isOpen={isDropdownOpen}
        activePrimarySort={activePrimarySort}
        activeSentimentFilter={activeSentimentFilter}
        onPrimarySortChange={onPrimarySortChange}
        onSentimentFilterChange={onSentimentFilterChange}
        areSentimentsReady={areSentimentsReady}
        onClose={closeDropdown}
      />
    </div>
  );
}
