import React, { useState, useEffect } from 'react';
import { X, BarChart2, TrendingUp, Clock, MessageCircle, Brain, ChevronRight, Loader, ArrowLeft } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { ConversationSession } from '../../types/session';
import { sessionService } from '../../services/sessionService';

interface AnalysisProps {
  sessions?: ConversationSession[];
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI('YOUR_API_KEY');

const Analysis: React.FC<AnalysisProps> = ({ sessions: propSessions }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<string[]>([]);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [metrics, setMetrics] = useState({
    totalSessions: 0,
    averageSessionDuration: "0 minutes",
    totalMessages: 0,
    weeklyProgress: 0,
    sentimentScore: 0,
    lastSessionDate: "",
    commonTopics: [] as { topic: string; percentage: number }[],
    monthlyEngagement: [] as { month: string; sessions: number }[],
    weeklyMoodTrend: [] as { week: string; score: number }[],
    sessionDurations: [] as { session: number; duration: number }[],
    messageCounts: [] as { session: number; count: number }[]
  });

  // Load sessions if not provided as props
  useEffect(() => {
    const loadSessions = async () => {
      if (!propSessions) {
        const allSessions = await sessionService.getAllSessions();
        setSessions(allSessions);
      } else {
        setSessions(propSessions);
      }
    };
    loadSessions();
  }, [propSessions]);

  const analyzeSessionsWithAI = async (sessionsData: ConversationSession[]) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // Prepare session data for analysis
      const sessionSummary = sessionsData.map(session => ({
        id: session.sessionId,
        date: session.startTime,
        duration: new Date(session.endTime).getTime() - new Date(session.startTime).getTime(),
        messages: session.conversation.map(msg => ({
          user: msg.userMessage,
          ai: msg.aiResponse
        }))
      }));

      // Generate AI analysis prompt
      const prompt = `Analyze these therapy sessions and provide insights:
      ${JSON.stringify(sessionSummary)}
      
      Please provide:
      1. Key emotional patterns and trends
      2. Common topics or concerns discussed
      3. Progress indicators and improvements
      4. Recommendations for future sessions
      5. Overall sentiment analysis (0-10 scale)
      
      Format the response as a JSON object with these keys:
      {
        "insights": string[],
        "commonTopics": { topic: string, percentage: number }[],
        "sentimentScore": number,
        "weeklyProgress": number
      }`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysis = JSON.parse(response.text());

      return analysis;
    } catch (error) {
      console.error('Error analyzing sessions with AI:', error);
      return null;
    }
  };

  const processSessionData = async () => {
    if (!sessions.length) {
      setLoading(false);
      return;
    }

    try {
      // Sort sessions by date
      const sortedSessions = [...sessions].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      // Calculate basic metrics
      const totalMessages = sortedSessions.reduce((sum, session) => 
        sum + session.conversation.length, 0
      );

      const averageDuration = sortedSessions.reduce((sum, session) => {
        const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
        return sum + duration;
      }, 0) / sessions.length;

      // Get monthly engagement
      const monthlyData = sortedSessions.reduce((acc: { [key: string]: number }, session) => {
        const month = new Date(session.startTime).toLocaleString('default', { month: 'long' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

      // Get weekly trend (last 4 weeks)
      const weeklyData = sortedSessions.slice(-28).reduce((acc: { [key: string]: number }, session) => {
        const weekNum = Math.floor((new Date(session.startTime).getTime() - new Date(sortedSessions[0].startTime).getTime()) / (7 * 24 * 60 * 60 * 1000));
        acc[`Week ${weekNum + 1}`] = (acc[`Week ${weekNum + 1}`] || 0) + 1;
        return acc;
      }, {});

      // Get AI analysis
      const aiAnalysis = await analyzeSessionsWithAI(sortedSessions);

      setMetrics({
        totalSessions: sessions.length,
        averageSessionDuration: `${Math.round(averageDuration / (1000 * 60))} minutes`,
        totalMessages,
        weeklyProgress: aiAnalysis?.weeklyProgress || 0,
        sentimentScore: aiAnalysis?.sentimentScore || 0,
        lastSessionDate: new Date(sortedSessions[sortedSessions.length - 1].endTime).toLocaleDateString(),
        commonTopics: aiAnalysis?.commonTopics || [],
        monthlyEngagement: Object.entries(monthlyData).map(([month, sessions]) => ({
          month,
          sessions
        })),
        weeklyMoodTrend: Object.entries(weeklyData).map(([week, score]) => ({
          week,
          score: score
        })),
        sessionDurations: sortedSessions.map((session, index) => ({
          session: index + 1,
          duration: Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))
        })),
        messageCounts: sortedSessions.map((session, index) => ({
          session: index + 1,
          count: session.conversation.length
        }))
      });

      if (aiAnalysis?.insights) {
        setInsights(aiAnalysis.insights);
      }

    } catch (error) {
      console.error('Error processing session data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    processSessionData();
  }, [sessions]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        {/* Header */}
      <div className="bg-gray-800/95 border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-white">Session Analysis</h1>
                <p className="text-gray-400 text-sm">AI-Powered Insights from {metrics.totalSessions} Sessions</p>
            </div>
            </div>
            </div>
          </div>
        </div>

      {loading ? (
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <div className="flex flex-col items-center space-y-4">
            <Loader className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-white font-medium">Analyzing session data...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Sessions */}
            <div className="bg-gray-800/80 rounded-xl p-4 hover:bg-gray-800/90 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Sessions</p>
                  <p className="text-white text-xl font-semibold">{metrics.totalSessions}</p>
                </div>
              </div>
            </div>

            {/* Average Duration */}
            <div className="bg-gray-800/80 rounded-xl p-4 hover:bg-gray-800/90 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-400" />
                    </div>
                <div>
                  <p className="text-gray-400 text-sm">Average Duration</p>
                  <p className="text-white text-xl font-semibold">{metrics.averageSessionDuration}</p>
                </div>
              </div>
            </div>

            {/* Total Messages */}
            <div className="bg-gray-800/80 rounded-xl p-4 hover:bg-gray-800/90 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Messages</p>
                  <p className="text-white text-xl font-semibold">{metrics.totalMessages}</p>
                </div>
              </div>
            </div>

            {/* Weekly Progress */}
            <div className="bg-gray-800/80 rounded-xl p-4 hover:bg-gray-800/90 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Weekly Progress</p>
                  <p className="text-white text-xl font-semibold">{metrics.weeklyProgress}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-gray-800/80 rounded-xl p-6 mb-6">
            <h3 className="text-white font-medium mb-4">AI Insights</h3>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-gray-300 text-sm">{insight}</p>
                </div>
              ))}
                </div>
              </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Session Duration Trend */}
            <div className="bg-gray-800/80 rounded-xl p-6">
              <h3 className="text-white font-medium mb-4">Session Duration Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.sessionDurations}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="session" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                        labelStyle={{ color: '#9CA3AF' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="duration"
                        stroke="#3B82F6"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            {/* Message Count Trend */}
            <div className="bg-gray-800/80 rounded-xl p-6">
              <h3 className="text-white font-medium mb-4">Messages per Session</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.messageCounts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="session" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                          labelStyle={{ color: '#9CA3AF' }}
                        />
                    <Bar dataKey="count" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
              </div>
                  </div>
                </div>

          {/* Common Topics */}
          {metrics.commonTopics.length > 0 && (
            <div className="mt-6 bg-gray-800/80 rounded-xl p-6">
              <h3 className="text-white font-medium mb-4">Common Topics</h3>
              <div className="space-y-4">
                {metrics.commonTopics.map((topic, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{topic.topic}</span>
                      <span className="text-gray-400">{topic.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2">
                      <div
                        className="bg-blue-500 rounded-full h-2"
                        style={{ width: `${topic.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Stats */}
          <div className="mt-6 bg-gray-800/80 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Last session: {metrics.lastSessionDate}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Sentiment Score:</span>
                <span className="text-white font-medium">{metrics.sentimentScore}/10</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis; 