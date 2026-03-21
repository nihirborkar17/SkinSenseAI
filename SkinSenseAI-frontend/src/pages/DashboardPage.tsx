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
}

interface DashboardStats {
  totalAssessments: number;
  recentAssessments: Assessment[];
  averageConfidence: number;
  urgencyBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
}

interface UrgencyBreakdown {
  high: number;
  medium: number;
  low: number;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { token } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
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
        const assessments = result.data.assessments;

        // Calculate stats
        const totalAssessments = assessments.length;
        const recentAssessments = assessments.slice(0, 3);

        const averageConfidence =
          totalAssessments > 0
            ? assessments.reduce(
                (sum: number, a: Assessment) => sum + a.confidence,
                0,
              ) / totalAssessments
            : 0;

        const urgencyBreakdown = assessments.reduce(
          (acc: UrgencyBreakdown, a: Assessment) => {
            const level = a.urgencyLevel.toLowerCase();
            if (level === "high") acc.high++;
            else if (level === "medium") acc.medium++;
            else if (level === "low") acc.low++;
            return acc;
          },
          { high: 0, medium: 0, low: 0 },
        );

        setStats({
          totalAssessments,
          recentAssessments,
          averageConfidence,
          urgencyBreakdown,
        });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      showToast.error("Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    showToast.success("Logged out successfully");
    navigate("/");
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
                <p className="text-sm text-gray-600">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/history")}
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
              >
                History
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600 font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
          </h1>
          <p className="text-lg text-gray-600">
            Here's an overview of your skin health journey
          </p>
        </div>

        {isLoading ? (
          /* Loading State */
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
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        ) : !stats || stats.totalAssessments === 0 ? (
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Start Your First Assessment
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Upload a photo to get AI-powered insights about your skin health
            </p>
            <button
              onClick={() => navigate("/consent")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Start Assessment
            </button>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Assessments */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    Total Assessments
                  </h3>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600"
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
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalAssessments}
                </p>
              </div>

              {/* Average Confidence */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    Avg. Confidence
                  </h3>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {(stats.averageConfidence * 100).toFixed(0)}%
                </p>
              </div>

              {/* High Urgency */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    High Urgency
                  </h3>
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.urgencyBreakdown.high}
                </p>
              </div>

              {/* Medium Urgency */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    Medium Urgency
                  </h3>
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.urgencyBreakdown.medium}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => navigate("/consent")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-4 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  New Assessment
                </button>
                <button
                  onClick={() => navigate("/history")}
                  className="bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 font-semibold px-6 py-4 rounded-lg transition-all flex items-center justify-center gap-2"
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  View All History
                </button>
                <button
                  onClick={() =>
                    stats.recentAssessments.length > 0 &&
                    navigate(`/chat/${stats.recentAssessments[0].id}`)
                  }
                  disabled={stats.recentAssessments.length === 0}
                  className={`font-semibold px-6 py-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
                    stats.recentAssessments.length === 0
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300"
                  }`}
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
                  Continue Last Chat
                </button>
              </div>
            </div>

            {/* Recent Assessments */}
            {stats.recentAssessments.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Recent Assessments
                  </h2>
                  <button
                    onClick={() => navigate("/history")}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    View All →
                  </button>
                </div>

                <div className="space-y-4">
                  {stats.recentAssessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/chat/${assessment.id}`)}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {assessment.condition}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(assessment.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Confidence</p>
                          <p className="font-semibold text-gray-900">
                            {(assessment.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
