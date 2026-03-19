import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { showToast } from "../utils/toast.utils";

interface LocationState {
  assessmentId: string;
  condition: string;
  confidence: number;
  urgencyLevel: string;
  description: string;
  chatAvailable: boolean;
  uploadedImage: string;
  timestamp: string;
}

interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
}

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();

  const state = location.state as LocationState;

  // Redirect if no state (direct URL access)
  useEffect(() => {
    if (!state) {
      showToast.error("No assessment data found");
      navigate("/assessment");
    }
  }, [state, navigate]);

  // Chat state
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  // Fetch chat history on mount
  useEffect(() => {
    if (state?.assessmentId) {
      fetchChatHistory();
    }
  }, [state?.assessmentId]);

  const fetchChatHistory = async () => {
    setIsFetchingHistory(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/chat/${state.assessmentId}`,
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
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      showToast.error("Please enter a question");
      return;
    }

    console.log("State:", state);
    console.log("Assessment ID:", state.assessmentId);

    setIsLoadingChat(true);

    try {
      const requestBody = {
        disease: state.condition.toLowerCase(),
        question: question,
        assessmentId: state.assessmentId,
        consentId: "from-assessment",
      };
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      // LOG Response
      console.log("Response status: ", response.status);

      const result = await response.json();

      // Log the Parsed result
      console.log("Parsed result: ", result);

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

        // clear input
        setQuestion("");
        showToast.success("Answer generated!");
      } else {
        throw new Error(result.message || "Failed to get answer");
      }
    } catch (error) {
      console.error("Chat error:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to get answer",
      );
    } finally {
      setIsLoadingChat(false);
    }
  };

  if (!state) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img
                src="/SkinSenseAI-Logo.png"
                alt="SkinSense AI Logo"
                className="w-10 h-10"
              />
              <span className="text-2xl font-bold text-gray-900">
                SkinSense AI
              </span>
            </div>
            <button
              onClick={() => navigate("/assessment")}
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
            >
              New Assessment
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Results Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Analysis Results
          </h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Image */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Uploaded Image
              </h3>
              <div className="rounded-xl overflow-hidden border-2 border-gray-200">
                <img
                  src={state.uploadedImage}
                  alt="Uploaded skin"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Analysis Details */}
            <div className="space-y-6">
              {/* Condition */}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Disease/Condition Identified
                </label>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {state.condition}
                </p>
              </div>

              {/* Confidence */}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Confidence Level
                </label>
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-semibold text-gray-900">
                      {(state.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${state.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Urgency Level */}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Urgency Level
                </label>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                      state.urgencyLevel === "high"
                        ? "bg-red-100 text-red-800"
                        : state.urgencyLevel === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {state.urgencyLevel.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Description
                </label>
                <p className="text-gray-700 mt-2 leading-relaxed">
                  {state.description}
                </p>
              </div>

              {/* Timestamp */}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Analysis Date
                </label>
                <p className="text-gray-700 mt-1">
                  {new Date(state.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Section */}
        {state.chatAvailable && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Ask Questions About Your Results
            </h2>

            <button
              onClick={() => navigate(`/chat/${state.assessmentId}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Open Full Chat
            </button>
            {/* Chat History */}
            <div className="mb-6 max-h-96 overflow-y-auto space-y-4">
              {isFetchingHistory ? (
                <p className="text-center text-gray-500">
                  Loading chat history...
                </p>
              ) : chatHistory.length === 0 ? (
                <p className="text-center text-gray-500">
                  No questions yet. Ask anything about {state.condition}!
                </p>
              ) : (
                chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className="border-l-4 border-blue-600 pl-4 py-2"
                  >
                    <p className="font-semibold text-gray-900 mb-2">
                      Q: {chat.question}
                    </p>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {chat.answer}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(chat.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Question Input */}
            <form onSubmit={handleAskQuestion} className="space-y-4">
              <div>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={`Ask a question about ${state.condition}...`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  rows={3}
                  disabled={isLoadingChat}
                />
              </div>
              <button
                type="submit"
                disabled={isLoadingChat || !question.trim()}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
                  isLoadingChat || !question.trim()
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl"
                }`}
              >
                {isLoadingChat ? (
                  <span className="flex items-center justify-center gap-2">
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
                    Getting answer...
                  </span>
                ) : (
                  "Ask Question"
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default ResultsPage;
