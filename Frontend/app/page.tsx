"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    const getInitialResponse = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/'}chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            history: [],
            analytics: {},
            message: "initial_greeting"
          }),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.chat_history) {
          const assistantMessages = data.chat_history.filter(msg => msg.role === "assistant");
          if (assistantMessages.length > 0) {
            setChatHistory(assistantMessages);
          }
        } else if (data.response) {
          setChatHistory([{ role: "assistant", content: data.response }]);
        }
      } catch (err) {
        console.error("Failed to get initial AI response:", err);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialResponse();
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = { role: "user", content: message };
    setChatHistory((prev) => [...prev, userMessage]);
    const currentMessage = message;
    setMessage("");

    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/'}chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          history: [...chatHistory, userMessage],
          analytics: analytics || {},
          message: currentMessage
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.chat_history) {
        const filteredHistory = data.chat_history.filter(msg => msg.role !== "system");
        const uniqueUserMessages = filteredHistory.filter((msg, index) => {
          return msg.role !== "user" || (msg.role === "user" && filteredHistory[index - 1]?.role !== "user");
        });
        setChatHistory(uniqueUserMessages);
      }

      if (data.analytics) {
        setAnalytics(data.analytics);
        setSummary(data.analytics.summary || "");
      }

      if (data.url) {
        setUrl(data.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setChatHistory(prev => prev.filter((_, idx) => idx !== prev.length - 1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        :root {
          --primary: #4cc9f0;
          --primary-light: #57d1ff;
          --primary-dark: #3a97d4;
          --secondary: #7209b7;
          --accent: #f72585;
          --success: #4ade80;
          --error: #f43f5e;
          --bg-primary: #121212;
          --bg-secondary: #1e1e1e;
          --bg-tertiary: #252525;
          --bg-card: #2a2a2a;
          --bg-input: #333333;
          --bg-hover: #353535;
          --text-primary: #ffffff;
          --text-secondary: #d0d0d0;
          --text-tertiary: #a0a0a0;
          --border-color: #444444;
          --border-light: #363636;
          --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
          --transition: all 0.2s ease-in-out;
        }
        body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
        }
        .card {
          background: var(--bg-card);
          border-radius: 0.75rem;
          box-shadow: var(--card-shadow);
          transition: var(--transition);
          border: 1px solid var(--border-light);
        }
        .card:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
        }
        .input {
          background-color: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          transition: var(--transition);
          color: var(--text-primary);
        }
        .input::placeholder {
          color: var(--text-tertiary);
        }
        .input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(76, 201, 240, 0.3);
          outline: none;
        }
        .btn-primary {
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          color: var(--bg-primary);
          font-weight: 500;
          border: none;
          transition: var(--transition);
        }
        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--primary-light), var(--primary));
          transform: translateY(-1px);
        }
        .btn-primary:disabled {
          opacity: 0.7;
        }
      `}</style>

      <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)]">
        <header className="bg-gradient-to-r from-[var(--primary-dark)] to-[var(--secondary)] text-[var(--text-primary)] p-5 shadow-lg">
          <h1 className="text-2xl font-bold text-center">Multilingual Article Analysis Engine</h1>
        </header>

        <main className="flex flex-1 overflow-hidden">
          <div className="flex flex-col w-1/2 border-r border-[var(--border-color)]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--bg-secondary)]">
              {chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-secondary)]">
                  <svg className="w-16 h-16 mb-4 text-[var(--primary)] opacity-60" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"></path>
                  </svg>
                  <p className="text-lg font-medium">Start a conversation</p>
                  <p className="max-w-sm mt-2">Send a message or paste an article URL to analyze</p>
                </div>
              ) : (
                chatHistory.filter(msg => msg.role !== "system").map((msg, index) => (
                  <div 
                    key={index} 
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg p-3 shadow-sm ${
                        msg.role === "user" 
                          ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-[var(--bg-primary)]" 
                          : "bg-[var(--bg-tertiary)] border border-[var(--border-light)] text-[var(--text-primary)]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="border-t border-[var(--border-color)] p-4 bg-[var(--bg-tertiary)]">
              <form onSubmit={sendMessage} className="flex space-x-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Type a message or paste an article URL..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="btn-primary rounded-full w-10 h-10 flex items-center justify-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-[var(--bg-primary)] rounded-full border-t-transparent" />
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                    </svg>
                  )}
                </button>
              </form>
              {error && <p className="text-[var(--error)] text-sm mt-2">{error}</p>}
            </div>
          </div>
          
          <div className="w-1/2 overflow-y-auto p-6 bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)]">
            <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Article Analytics</h2>
            
            {!analytics ? (
              <div className="text-center py-10 text-[var(--text-secondary)]">
                <svg className="w-16 h-16 mx-auto mb-4 text-[var(--primary)] opacity-60" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
                </svg>
                <p className="text-lg font-medium">No article analyzed yet</p>
                <p className="max-w-sm mx-auto mt-2">
                  Share an article URL in the chat to see analytics
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="card p-4 border-l-4 border-[var(--primary)]">
                  <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">{analytics.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {analytics.keywords?.map((keyword, index) => (
                      <span key={index} className="bg-[var(--primary)] bg-opacity-20 text-white font-medium text-xs rounded-full px-3 py-1 border border-[var(--primary)] border-opacity-40">
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <span className="inline-flex items-center mr-3">
                      <svg className="w-4 h-4 mr-1 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                      </svg>
                      Author: {analytics.author}
                    </span>
                  <div className="text-sm text-[var(--text-secondary)]">
                    <span className="inline-flex items-center mr-3">
                      <svg className="w-4 h-4 mr-1 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd"></path>
                      </svg>
                      Language: {analytics.language?.toUpperCase()}
                    </span>
                    <span className="inline-flex items-center mr-3">
                      <svg className="w-4 h-4 mr-1 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                      </svg>
                      Tone: {analytics.tone}
                    </span>
                    <span className="inline-flex items-center">
                      <svg className="w-4 h-4 mr-1 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                      Style: {analytics.style}
                    </span>
                  </div>
                </div>
                
                <div className="card p-4">
                  <h3 className="text-lg font-semibold mb-2 flex items-center text-[var(--text-primary)]">
                    <svg className="w-5 h-5 mr-2 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path>
                    </svg>
                    Summary
                  </h3>
                  <p className="whitespace-pre-line text-base leading-relaxed text-[var(--text-secondary)]">{analytics.summary}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="card p-4 border-t-2 border-[var(--accent)] bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-tertiary)]">
                    <h3 className="text-lg font-semibold mb-3 text-[var(--text-primary)]">Reliability Analysis</h3>
                    {analytics.fake_news ? (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[var(--text-secondary)]">Reliability Assessment:</span>
                        <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${
                          (typeof analytics.fake_news === 'string' && analytics.fake_news === "Real") ||
                          (typeof analytics.fake_news === 'object' && 
                            (analytics.fake_news.result === "Real" || Object.values(analytics.fake_news)[0] === "Real"))
                            ? "bg-green-500 bg-opacity-20 text-white border border-green-500 border-opacity-30" 
                            : "bg-red-500 bg-opacity-20 text-white border border-red-500 border-opacity-30"
                        }`}>
                          {typeof analytics.fake_news === 'string' 
                            ? analytics.fake_news 
                            : analytics.fake_news.result || Object.values(analytics.fake_news)[0] || "Unknown"}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--text-secondary)]">No reliability data available</p>
                    )}
                  </div>
                  
                  <div className="card p-4 border-t-2 border-[var(--primary)] bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-tertiary)]">
                    <h3 className="text-lg font-semibold mb-3 text-[var(--text-primary)]">Content Analysis</h3>
                    <div className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-[var(--text-secondary)]">Readability Score</span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{analytics.readability_score?.toFixed(2) || "N/A"}</span>
                      </div>
                      <div className="w-full bg-[var(--border-color)] rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] h-2 rounded-full" 
                          style={{width: `${Math.min(100, analytics.readability_score * 10)}%`}}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--text-secondary)]">Sentiment</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                        analytics.sentiment === "Positive" 
                          ? "bg-[var(--success)] bg-opacity-30 text-white" 
                          : analytics.sentiment === "Negative"
                            ? "bg-[var(--error)] bg-opacity-30 text-white"
                            : "bg-[var(--primary)] bg-opacity-30 text-white"
                      }`}>
                        {analytics.sentiment}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="bg-[var(--bg-tertiary)] py-4 px-6 text-center text-sm text-[var(--text-secondary)] border-t border-[var(--border-color)]">
          <p>Multilingual Article Analysis Engine &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    </>
  );
}
