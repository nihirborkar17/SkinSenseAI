import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { showToast } from "../utils/toast.utils";

interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
}

interface AssessmentInfo {
  condition: string;
  confidence: number;
  timestamp: string;
}

interface Assessment {
  id: string;
  condition: string;
  confidence: number;
  urgencyLevel: string;
  timestamp: string;
  imageUrl: string;
  description: string;
}

const ChatPage = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const messageEndRef = useRef<HTMLDivElement>(null);

  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);

  // Scroll to botton when new message arrives
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Fetch assessment info and chat history on mount
  useEffect(() => {
    if (assessmentId) {
      fetchAssessmentInfo();
      fetchChatHistory();
    }
  }, [assessmentId]);

  const fetchAssessmentInfo = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/analyze/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (result.success && result.data.assessments) {
        const currentAssessment = result.data.assessments.find(
          (a: Assessment) => a.id === assessmentId,
        );

        if (currentAssessment) {
          setAssessment({
            condition: currentAssessment.condition,
            confidence: currentAssessment.confidence,
            timestamp: currentAssessment.timestamp,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch assessment:", error);
    }
  };

  const fetchChatHistory = async () => {
    setIsFetchingHistory(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/chat/${assessmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (result.success && result.data.history) {
        setChatHistory(result.data.history);
      }
    } catch (error) {
      console.error("Failed to fetch chat history: ", error);
      showToast.error("Failed to load chat history");
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim() || !assessment) {
      showToast.error("Please enter a question");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          disease: assessment.condition.split("(")[0].trim().toLowerCase(),
          question: question,
          assessmentId: assessmentId,
          consentId: "from-chat",
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Add to chat history
        setChatHistory([
          ...chatHistory,
          {
            id: result.data.chatId,
            question: result.data.question,
            answer: result.data.answer,
            timestamp: result.data.savedAt,
          },
        ]);
        setQuestion("");
      } else {
        throw new Error(result.message || "Failed toget answer");
      }
    } catch (error) {
      console.error("Chat error: ", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to get answer",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>

              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Chat About Your Assessment
                </h1>
                {assessment && (
                  <p className="text-sm text-gray-600">
                    {assessment.condition} •{" "}
                    {(assessment.confidence * 100).toFixed(0)}% confidence
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate("/assessment")}
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors text-sm"
            >
              New Assessment
            </button>
          </div>
        </div>
      </header>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isFetchingHistory ? (
            <div className="text-center py-12">
              <svg
                className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-gray-600">Loading conversation...</p>
            </div>
          ) : chatHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Start the Conversation
              </h3>
              <p className="text-gray-600">
                Ask anything about {assessment?.condition || "your condition"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {chatHistory.map((chat, index) => (
                <div key={chat.id || index} className="space-y-4">
                  {/* User Question */}
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-6 py-3 max-w-2xl shadow-md">
                      <p className="whitespace-pre-wrap">{chat.question}</p>
                    </div>
                  </div>

                  {/* AI Answer */}
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-6 py-4 max-w-2xl shadow-sm">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {chat.answer}
                      </p>
                      <p className="text-xs text-gray-400 mt-3">
                        {new Date(chat.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div ref={messageEndRef} />
        </div>
      </div>

      {/* Input Area - Sticky Bottom */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder={`Ask a question about ${assessment?.condition || "your condition"}...`}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              rows={2}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className={`px-6 py-3 rounded-xl font-semibold text-white transition-all self-end ${
                isLoading || !question.trim()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"
              }`}
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
