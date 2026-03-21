import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { showToast } from "../utils/toast.utils";

interface Assessment {
  id: string;
  condition: string;
  confidence: number;
  urgencyLevel: string;
  timestamp: string;
  imageUrl: string;
  description: string;
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAssessmentHistory();
  }, []);

  const fetchAssessmentHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        "http://localhost:8000/api/analyze/history",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (result.success && result.data.assessments) {
        setAssessments(result.data.assessments);
      } else {
        throw new Error("Failed to fetch history");
      }
    } catch (error) {
      console.error("Failed to fetch assessment history:", error);
      showToast.error("Failed to load assessment history");
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
              <div>
                <span className="text-2xl font-bold text-gray-900">
                  SkinSense AI
                </span>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate("/assessment")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                New Assessment
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Assessment History
          </h1>
          <p className="text-lg text-gray-600">
            View all your past skin assessments
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-20">
            <svg
              className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
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
            <p className="text-gray-600">Loading your assessments...</p>
          </div>
        ) : assessments.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No Assessments Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start your first skin health assessment to see results here
            </p>
            <button
              onClick={() => navigate("/assessment")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              Start First Assessment
            </button>
          </div>
        ) : (
          /* Assessment Grid */
          <>
            <div className="mb-4 text-sm text-gray-600">
              {assessments.length} assessment
              {assessments.length !== 1 ? "s" : ""} found
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900 flex-1">
                        {assessment.condition}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(
                          assessment.urgencyLevel,
                        )}`}
                      >
                        {assessment.urgencyLevel.toUpperCase()}
                      </span>
                    </div>

                    {/* Confidence */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">
                          Confidence
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {(assessment.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${assessment.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Date */}
                    <p className="text-sm text-gray-500">
                      {new Date(assessment.timestamp).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </p>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-gray-50 flex gap-2">
                    <button
                      onClick={() => navigate(`/chat/${assessment.id}`)}
                      className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
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
                      Chat
                    </button>
                    <button
                      onClick={() =>
                        navigate("/results", {
                          state: {
                            assessmentId: assessment.id,
                            condition: assessment.condition,
                            confidence: assessment.confidence,
                            urgencyLevel: assessment.urgencyLevel,
                            description: assessment.description,
                            chatAvailable: true,
                            uploadedImage: "", // No image stored
                            timestamp: assessment.timestamp,
                          },
                        })
                      }
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
