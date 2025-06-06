import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2 } from "lucide-react";
import AnswerSkeleton from "../placeholders/AnswerSkeleton";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
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

export default function QASection({ videoId, activeContext, isEnabled }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [errorAnswer, setErrorAnswer] = useState(null);

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || !isEnabled || isLoadingAnswer) return;

    setIsLoadingAnswer(true);
    setErrorAnswer(null);
    setAnswer("");

    const endpoint =
      activeContext === "video"
        ? `/video/qa/${videoId}?question=${encodeURIComponent(question.trim())}`
        : `/comments/qa/${videoId}?question=${encodeURIComponent(
            question.trim()
          )}`;

    try {
      const res = await fetch(`${apiUrl}${endpoint}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            data.detail ||
            `Error: ${res.status} ${res.statusText}`
        );
      }

      if (data.results) {
        setAnswer(data.results);
      } else {
        setAnswer("No answer found for your question.");
      }
    } catch (err) {
      console.error(`Error fetching ${activeContext} Q&A:`, err);
      setErrorAnswer(err.message);
      setAnswer("Sorry, I couldn't find an answer to that question right now.");
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  const placeholderText = isEnabled
    ? `Ask about the ${activeContext}...`
    : `Q&A disabled (summary unavailable)`;

  return (
    <div className={`pt-3 ${!isEnabled ? "opacity-60" : ""}`}>
      {" "}
      {/* Removed top border, will be handled by parent */}
      <form onSubmit={handleSubmitQuestion} className="flex items-center gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholderText}
          className="flex-grow px-3 py-2 bg-youtube-dark-tertiary border border-youtube-gray-border rounded-lg focus:outline-none focus:border-blue-500 text-youtube-gray-primary placeholder-youtube-gray-secondary text-sm disabled:cursor-not-allowed"
          disabled={!isEnabled || isLoadingAnswer}
        />
        <button
          type="submit"
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10 flex-shrink-0"
          disabled={!isEnabled || isLoadingAnswer || !question.trim()}
        >
          {isLoadingAnswer ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </form>
      {/* Display Answer or Skeleton */}
      {isLoadingAnswer && <AnswerSkeleton />}
      {!isLoadingAnswer && answer && (
        <div className="mt-3 p-3 bg-youtube-dark-tertiary rounded-lg text-xs sm:text-sm text-youtube-gray-primary custom-scrollbar overflow-y-auto max-h-60">
          {" "}
          {/* max-h for answer area scroll */}
          <ReactMarkdown components={customRenderers}>{answer}</ReactMarkdown>
        </div>
      )}
      {!isLoadingAnswer && errorAnswer && (
        <div className="mt-3 p-3 bg-red-900/30 text-red-400 rounded-lg text-xs sm:text-sm">
          <p>{errorAnswer}</p>
        </div>
      )}
    </div>
  );
}
