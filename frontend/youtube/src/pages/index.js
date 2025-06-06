import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Header from "../components/Header";

export default function LandingPage() {
  const router = useRouter();
  const [initialHeaderQuery, setInitialHeaderQuery] = useState("");

  useEffect(() => {
    const lastQuery = sessionStorage.getItem("youtubeLastSearchQuery");
    if (lastQuery) {
      setInitialHeaderQuery(lastQuery);
    }
  }, []);

  const handleLandingPageSearch = (query) => {
    if (query && query.trim() !== "") {
      router.push(`/results?search_query=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="min-h-screen bg-youtube-dark font-inter text-white flex flex-col">
      <Header
        onSearch={handleLandingPageSearch}
        initialQuery={initialHeaderQuery}
      />
      <main className="flex-grow flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-youtube-gray-primary mb-4">
            Welcome to YouTube AI Analyzer
          </h1>
          <p className="text-youtube-gray-secondary">
            Use the search bar above to get started!
          </p>
        </div>
      </main>
    </div>
  );
}
