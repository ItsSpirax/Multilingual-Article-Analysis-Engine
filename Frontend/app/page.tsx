"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      setError("Please enter a URL");
      return;
    }
    
    if (!url.startsWith("http")) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.summary);
      setShowSummary(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize article");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-6 font-[family-name:var(--font-geist-sans)]">
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-bold mb-2">Article Summarizer</h1>
        <p className="text-lg opacity-80">Get concise summaries from any article</p>
      </header>

      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <div className="card mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url-input" className="block text-sm font-medium mb-1">
                Article URL
              </label>
              <input
                id="url-input"
                type="text"
                className="input"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            {error && <p className="text-[var(--error)] text-sm">{error}</p>}
            
            <button
              type="submit"
              className="btn-primary rounded-full py-2 px-6 font-medium w-full sm:w-auto"
              disabled={isLoading}
            >
              {isLoading ? "Summarizing..." : "Summarize Article"}
            </button>
          </form>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
          </div>
        )}

        {showSummary && !isLoading && (
          <div className="summary-container rounded p-6 mb-8 space-y-4">
            <h2 className="text-xl font-bold flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path>
              </svg>
              Summary Result
            </h2>
            <p className="whitespace-pre-line text-base leading-relaxed">{summary}</p>
          </div>
        )}
      </main>

      <footer className="mt-auto pt-8 pb-4 text-center text-sm opacity-70">
        <p>Multilingual Article Analysis Engine &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
