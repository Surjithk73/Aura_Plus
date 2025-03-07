import React, { useState, useEffect } from 'react';
import { X, BarChart2, TrendingUp, Clock, MessageCircle, Brain, ChevronRight, Loader, ArrowLeft, Sparkles, Heart, Target, Zap } from 'lucide-react';
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
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { ConversationSession } from '../../types/session';
import { sessionService } from '../../services/sessionService';

interface AnalysisProps {
  sessions?: ConversationSession[];
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY || '');

interface AIAnalysis {
  insights: string[];
  commonTopics: { topic: string; percentage: number }[];
  sentimentScore: number;
  weeklyProgress: number;
  emotionalPatterns: { emotion: string; intensity: number }[];
  keyThemes: { theme: string; frequency: number; description: string }[];
  recommendations: string[];
  riskFactors: { factor: string; level: 'low' | 'medium' | 'high' }[];
  progressMetrics: {
    category: string;
    score: number;
    change: number;
  }[];
}

const Analysis: React.FC<AnalysisProps> = ({ sessions: propSessions }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysis | null>(null);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);
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

      const sessionSummary = sessionsData.map(session => ({
        id: session.sessionId,
        date: session.startTime,
        duration: new Date(session.endTime).getTime() - new Date(session.startTime).getTime(),
        messages: session.conversation.map(msg => ({
          user: msg.userMessage,
          ai: msg.aiResponse
        }))
      }));

      const prompt = `As an expert AI therapist, analyze these therapy sessions in detail:
      ${JSON.stringify(sessionSummary)}
      
      Provide a comprehensive analysis including:
      1. Deep emotional patterns and psychological trends
      2. Key therapeutic themes and their significance
      3. Detailed progress indicators with quantified improvements
      4. Specific recommendations for future sessions
      5. Risk assessment and areas needing attention
      6. Overall mental well-being score (0-10)
      7. Emotional resilience patterns
      8. Communication style analysis
      
      Format the response as a JSON object with these keys:
      {
        "insights": string[], // Key therapeutic insights
        "commonTopics": { topic: string, percentage: number }[], // Discussion themes
        "sentimentScore": number, // Overall well-being score
        "weeklyProgress": number, // Progress percentage
        "emotionalPatterns": { emotion: string, intensity: number }[], // Emotional analysis
        "keyThemes": { theme: string, frequency: number, description: string }[], // Therapeutic themes
        "recommendations": string[], // Specific action items
        "riskFactors": { factor: string, level: "low" | "medium" | "high" }[], // Areas needing attention
        "progressMetrics": { category: string, score: number, change: number }[] // Detailed progress
      }`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysis = JSON.parse(response.text());

      return analysis as AIAnalysis;
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
      const sortedSessions = [...sessions].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      const totalMessages = sortedSessions.reduce((sum, session) => 
        sum + session.conversation.length, 0
      );

      const averageDuration = sortedSessions.reduce((sum, session) => {
        const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
        return sum + duration;
      }, 0) / sessions.length;

      const monthlyData = sortedSessions.reduce((acc: { [key: string]: number }, session) => {
        const month = new Date(session.startTime).toLocaleString('default', { month: 'long' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

      const weeklyData = sortedSessions.slice(-28).reduce((acc: { [key: string]: number }, session) => {
        const weekNum = Math.floor((new Date(session.startTime).getTime() - new Date(sortedSessions[0].startTime).getTime()) / (7 * 24 * 60 * 60 * 1000));
        acc[`Week ${weekNum + 1}`] = (acc[`Week ${weekNum + 1}`] || 0) + 1;
        return acc;
      }, {});

      const analysis = await analyzeSessionsWithAI(sortedSessions);
      setAIAnalysis(analysis);

      setMetrics({
        totalSessions: sessions.length,
        averageSessionDuration: `${Math.round(averageDuration / (1000 * 60))} minutes`,
        totalMessages,
        weeklyProgress: analysis?.weeklyProgress || 0,
        sentimentScore: analysis?.sentimentScore || 0,
        lastSessionDate: new Date(sortedSessions[sortedSessions.length - 1].endTime).toLocaleDateString(),
        commonTopics: analysis?.commonTopics || [],
        monthlyEngagement: Object.entries(monthlyData).map(([month, sessions]) => ({
          month,
          sessions
        })),
        weeklyMoodTrend: Object.entries(weeklyData).map(([week, score]) => ({
          week,
          score
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

    } catch (error) {
      console.error('Error processing session data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    processSessionData();
  }, [sessions]);

  // Auto-rotate insights
  useEffect(() => {
    if (aiAnalysis?.insights.length) {
      const timer = setInterval(() => {
        setActiveInsightIndex((current) => 
          current === aiAnalysis.insights.length - 1 ? 0 : current + 1
        );
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [aiAnalysis?.insights]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0F] to-[#1A1A23]">
      {/* Header */}
      <div className="bg-[#12121A]/95 border-b border-[#2A2A35]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 hover:bg-[#2A2A35]/50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-white flex items-center">
                  Deep Analysis
                  <Sparkles className="w-5 h-5 ml-2 text-indigo-400" />
                </h1>
                <p className="text-gray-400 text-sm">AI-Powered Insights from {metrics.totalSessions} Sessions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
              <div className="absolute inset-0 w-8 h-8 rounded-full border-2 border-indigo-500/20"></div>
            </div>
            <p className="text-white font-medium">Analyzing session data with Gemini AI...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* AI Insights Carousel */}
          {aiAnalysis?.insights && (
            <div className="mb-8 bg-[#12121A]/60 rounded-2xl p-6 backdrop-blur-lg border border-[#2A2A35]/20">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/20 to-violet-600/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-white mb-2">AI Insight</h3>
                  <p className="text-gray-300 text-lg leading-relaxed transition-all duration-500">
                    {aiAnalysis.insights[activeInsightIndex]}
                  </p>
                  <div className="flex mt-4 space-x-1">
                    {aiAnalysis.insights.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          index === activeInsightIndex 
                            ? 'w-8 bg-indigo-500' 
                            : 'w-2 bg-gray-600'
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Sentiment Score */}
            <div className="bg-[#12121A]/60 rounded-xl p-6 hover:bg-[#12121A]/80 transition-all duration-300 backdrop-blur-lg border border-[#2A2A35]/20">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Mental Well-being</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-white text-2xl font-semibold">{metrics.sentimentScore}/10</p>
                    <span className="text-emerald-400 text-sm">+{metrics.weeklyProgress}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Score */}
            <div className="bg-[#12121A]/60 rounded-xl p-6 hover:bg-[#12121A]/80 transition-all duration-300 backdrop-blur-lg border border-[#2A2A35]/20">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Progress Score</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-white text-2xl font-semibold">{metrics.weeklyProgress}%</p>
                    <span className="text-violet-400 text-sm">Last 7 days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Stats */}
            <div className="bg-[#12121A]/60 rounded-xl p-6 hover:bg-[#12121A]/80 transition-all duration-300 backdrop-blur-lg border border-[#2A2A35]/20">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Average Duration</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-white text-2xl font-semibold">{metrics.averageSessionDuration}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Engagement */}
            <div className="bg-[#12121A]/60 rounded-xl p-6 hover:bg-[#12121A]/80 transition-all duration-300 backdrop-blur-lg border border-[#2A2A35]/20">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600/20 to-orange-600/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Interactions</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-white text-2xl font-semibold">{metrics.totalMessages}</p>
                    <span className="text-amber-400 text-sm">messages</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Emotional Patterns Radar */}
            {aiAnalysis?.emotionalPatterns && (
              <div className="bg-[#12121A]/60 rounded-xl p-6 backdrop-blur-lg border border-[#2A2A35]/20">
                <h3 className="text-lg font-medium text-white mb-4">Emotional Patterns</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={aiAnalysis.emotionalPatterns}>
                      <PolarGrid stroke="#2A2A35" />
                      <PolarAngleAxis dataKey="emotion" stroke="#9CA3AF" />
                      <PolarRadiusAxis stroke="#9CA3AF" />
                      <Radar
                        name="Intensity"
                        dataKey="intensity"
                        stroke="#8B5CF6"
                        fill="#8B5CF6"
                        fillOpacity={0.2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Progress Metrics */}
            {aiAnalysis?.progressMetrics && (
              <div className="bg-[#12121A]/60 rounded-xl p-6 backdrop-blur-lg border border-[#2A2A35]/20">
                <h3 className="text-lg font-medium text-white mb-4">Progress Metrics</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={aiAnalysis.progressMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" />
                      <XAxis dataKey="category" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#12121A', border: 'none' }}
                        labelStyle={{ color: '#9CA3AF' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#8B5CF6"
                        fill="url(#progressGradient)"
                      />
                      <defs>
                        <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Key Themes and Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Themes */}
            {aiAnalysis?.keyThemes && (
              <div className="bg-[#12121A]/60 rounded-xl p-6 backdrop-blur-lg border border-[#2A2A35]/20">
                <h3 className="text-lg font-medium text-white mb-4">Key Therapeutic Themes</h3>
                <div className="space-y-4">
                  {aiAnalysis.keyThemes.map((theme, index) => (
                    <div key={index} className="bg-[#2A2A35]/20 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-white font-medium">{theme.theme}</h4>
                        <span className="text-sm text-indigo-400">
                          {theme.frequency}%
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">{theme.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {aiAnalysis?.recommendations && (
              <div className="bg-[#12121A]/60 rounded-xl p-6 backdrop-blur-lg border border-[#2A2A35]/20">
                <h3 className="text-lg font-medium text-white mb-4">AI Recommendations</h3>
                <div className="space-y-3">
                  {aiAnalysis.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-indigo-400 text-sm font-medium">{index + 1}</span>
                      </div>
                      <p className="text-gray-300">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis; 