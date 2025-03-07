import React, { useState, useEffect } from 'react';
import { X, BarChart2, TrendingUp, Clock, MessageCircle, Brain, ChevronRight, Loader, ArrowLeft, Sparkles, Zap, Target, Lightbulb } from 'lucide-react';
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

// Initialize Gemini AI with proper configuration
const genAI = new GoogleGenerativeAI('AIzaSyCT43QYBuN8a4dA8Pq6i9wxXmgHPPnO8a0');

// Add interface for emotional insight
interface EmotionalInsight {
  category: string;
  score: number;
}

// Add these interfaces near the top of the file, after the existing interfaces
interface AnalysisResponse {
  insights: string[];
  commonTopics: Array<{ topic: string; percentage: number }>;
  sentimentScore: number;
  weeklyProgress: number;
  emotionalInsights: Array<{ category: string; score: number }>;
  progressMetrics: Array<{ metric: string; value: number; target: number }>;
  keywordAnalysis: Array<{ word: string; frequency: number; sentiment: number }>;
  weeklyMoodTrend: Array<{ week: string; score: number }>;
}

// Add these interfaces near the top of the file
interface AnalysisCache {
  timestamp: number;
  sessionIds: string[];
  metrics: any;
  insights: string[];
}

const POLLING_INTERVAL = 30000; // Check for new sessions every 30 seconds

const Analysis: React.FC<AnalysisProps> = ({ sessions: propSessions }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<string[]>([]);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [sessionIds, setSessionIds] = useState<Set<string>>(new Set());
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
    messageCounts: [] as { session: number; count: number }[],
    emotionalInsights: [] as { category: string; score: number }[],
    progressMetrics: [] as { metric: string; value: number; target: number }[],
    keywordAnalysis: [] as { word: string; frequency: number; sentiment: number }[]
  });

  // Check for new sessions
  const checkForNewSessions = async () => {
    try {
      const currentSessions = await sessionService.getAllSessions();
      const currentSessionIds = new Set(currentSessions.map(s => s.sessionId));
      
      // Check if we have new sessions or if any sessions were removed
      const hasChanges = currentSessions.length !== sessions.length ||
        currentSessions.some(s => !sessionIds.has(s.sessionId)) ||
        sessions.some(s => !currentSessionIds.has(s.sessionId));

      if (hasChanges) {
        console.log('Session changes detected, updating analysis...');
        setSessions(currentSessions);
        setSessionIds(currentSessionIds);
        setLastUpdate(new Date());
        
        // Clear cache to force new analysis
        localStorage.removeItem('analysisCache');
        
        // Process new data
        await processSessionData(currentSessions);
      }
    } catch (error) {
      console.error('Error checking for new sessions:', error);
    }
  };

  // Load initial sessions
  useEffect(() => {
    const loadInitialSessions = async () => {
      if (!propSessions) {
        const allSessions = await sessionService.getAllSessions();
        setSessions(allSessions);
        setSessionIds(new Set(allSessions.map(s => s.sessionId)));
      } else {
        setSessions(propSessions);
        setSessionIds(new Set(propSessions.map(s => s.sessionId)));
      }
    };
    loadInitialSessions();
  }, [propSessions]);

  // Set up polling for new sessions
  useEffect(() => {
    const pollInterval = setInterval(checkForNewSessions, POLLING_INTERVAL);
    return () => clearInterval(pollInterval);
  }, [sessions, sessionIds]);

  // Load cached analysis if available
  const loadCachedAnalysis = () => {
    try {
      const cached = localStorage.getItem('analysisCache');
      if (cached) {
        const cache: AnalysisCache = JSON.parse(cached);
        const now = Date.now();
        
        // Cache is valid for 24 hours and only if the session IDs match exactly
        const cachedSessionIds = new Set(cache.sessionIds);
        const currentSessionIds = new Set(sessions.map(s => s.sessionId));
        
        const isValid = 
          (now - cache.timestamp) < 24 * 60 * 60 * 1000 &&
          sessions.length === cache.sessionIds.length &&
          sessions.every(session => cachedSessionIds.has(session.sessionId)) &&
          cache.sessionIds.every(id => currentSessionIds.has(id));
        
        if (isValid) {
          console.log('Loading analysis from cache');
          setMetrics(cache.metrics);
          setInsights(cache.insights);
          setLoading(false);
          return true;
        }
      }
    } catch (error) {
      console.error('Error loading cached analysis:', error);
    }
    return false;
  };

  // Save analysis to cache
  const saveAnalysisToCache = (metrics: any, insights: string[]) => {
    try {
      const cache: AnalysisCache = {
        timestamp: Date.now(),
        sessionIds: sessions.map(s => s.sessionId),
        metrics,
        insights
      };
      localStorage.setItem('analysisCache', JSON.stringify(cache));
      console.log('Analysis cached successfully');
    } catch (error) {
      console.error('Error caching analysis:', error);
    }
  };

  const analyzeSessionsWithAI = async (sessionsData: ConversationSession[]) => {
    try {
      console.log('Starting AI analysis with sessions:', sessionsData.length);
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.0-pro",
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent results
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048,
        },
      });

      // Prepare detailed session data for analysis
      const sessionSummary = sessionsData.map(session => {
        const messages = session.conversation.map(msg => ({
          role: msg.userMessage ? 'user' : 'ai',
          content: msg.userMessage || msg.aiResponse,
          timestamp: msg.timestamp || new Date(session.startTime).toISOString()
        }));

        // Calculate message sentiment indicators
        const userMessages = messages
          .filter(m => m.role === 'user')
          .map(m => m.content);

        return {
          id: session.sessionId,
          date: session.startTime,
          duration: new Date(session.endTime).getTime() - new Date(session.startTime).getTime(),
          messages: messages,
          messageCount: messages.length,
          userMessages,
          summary: userMessages.join(" ")
        };
      });

      const dateRange = {
        start: new Date(Math.min(...sessionSummary.map(s => new Date(s.date).getTime()))).toISOString(),
        end: new Date(Math.max(...sessionSummary.map(s => new Date(s.date).getTime()))).toISOString()
      };

      console.log('Prepared session summary:', {
        sessionCount: sessionSummary.length,
        totalMessages: sessionSummary.reduce((sum, session) => sum + session.messageCount, 0),
        dateRange
      });

      const prompt = `You are an expert therapy session analyzer with deep understanding of emotional patterns and therapeutic progress.

      Analyze these ${sessionSummary.length} therapy sessions from ${dateRange.start} to ${dateRange.end}.
      Session Data: ${JSON.stringify(sessionSummary)}

      Key Analysis Requirements:
      1. Analyze emotional patterns and themes across ALL sessions chronologically
      2. Identify specific progress indicators in communication style
      3. Extract and quantify key discussion topics
      4. Track emotional state changes throughout the therapy journey
      5. Highlight concrete areas of improvement with examples
      6. Evaluate therapeutic relationship development

      Analysis Guidelines:
      - Focus on actual content from the sessions
      - Use specific examples when possible
      - Track changes over time
      - Consider both explicit and implicit emotional indicators
      - Evaluate engagement levels and depth of discussions
      - Identify breakthrough moments or key insights
      - Assess overall therapy effectiveness

      Response Format:
      Provide a clean JSON object with these exact fields (no markdown or additional text):
      {
        "insights": [
          "3-5 specific, evidence-based insights about patterns and progress",
          "Include concrete examples from sessions",
          "Focus on meaningful changes and developments"
        ],
        "commonTopics": [
          {"topic": "specific topic from sessions", "percentage": number 0-100}
        ],
        "sentimentScore": number 0-10 (overall emotional state),
        "weeklyProgress": number 0-100 (therapy progress percentage),
        "emotionalInsights": [
          {"category": "specific emotion/aspect", "score": number 0-10}
        ],
        "progressMetrics": [
          {"metric": "specific progress area", "value": number, "target": number}
        ],
        "keywordAnalysis": [
          {"word": "significant term", "frequency": number, "sentiment": number -1 to 1}
        ],
        "weeklyMoodTrend": [
          {"week": "Week X", "score": number 0-10}
        ]
      }

      Important:
      - Base all analysis on actual session content
      - Provide specific, actionable insights
      - Ensure numeric values are within specified ranges
      - Focus on meaningful patterns and changes
      - Include evidence for conclusions`;

      console.log('Sending prompt to Gemini AI...');
      
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();
        console.log('Raw AI Response:', responseText);

        // Clean the response text by removing any markdown formatting
        const cleanedResponse = responseText
          .replace(/```json\n?/g, '')  // Remove ```json
          .replace(/```\n?/g, '')      // Remove closing ```
          .trim();                     // Remove any extra whitespace

        console.log('Cleaned response:', cleanedResponse);

        try {
          const analysis = JSON.parse(cleanedResponse) as AnalysisResponse;
          console.log('Parsed AI Analysis:', analysis);

          // Validate and normalize the analysis data
          const validatedAnalysis = {
            insights: (Array.isArray(analysis.insights) ? analysis.insights : [])
              .slice(0, 5)
              .filter((insight: string) => typeof insight === 'string'),
            
            commonTopics: (Array.isArray(analysis.commonTopics) ? analysis.commonTopics : [])
              .slice(0, 5)
              .map((topic: { topic: string; percentage: number }) => ({
                topic: String(topic.topic),
                percentage: Math.min(100, Math.max(0, Number(topic.percentage) || 0))
              })),
            
            sentimentScore: Math.min(10, Math.max(0, Number(analysis.sentimentScore) || 7)),
            weeklyProgress: Math.min(100, Math.max(0, Number(analysis.weeklyProgress) || 0)),
            
            emotionalInsights: (Array.isArray(analysis.emotionalInsights) ? analysis.emotionalInsights : [])
              .slice(0, 6)
              .map((insight: { category: string; score: number }) => ({
                category: String(insight.category),
                score: Math.min(10, Math.max(0, Number(insight.score) || 0))
              })),
            
            progressMetrics: (Array.isArray(analysis.progressMetrics) ? analysis.progressMetrics : [])
              .slice(0, 4)
              .map((metric: { metric: string; value: number; target: number }) => ({
                metric: String(metric.metric),
                value: Math.max(0, Number(metric.value) || 0),
                target: Math.max(1, Number(metric.target) || 10)
              })),
            
            keywordAnalysis: (Array.isArray(analysis.keywordAnalysis) ? analysis.keywordAnalysis : [])
              .slice(0, 10)
              .map((keyword: { word: string; frequency: number; sentiment: number }) => ({
                word: String(keyword.word),
                frequency: Math.max(1, Number(keyword.frequency) || 1),
                sentiment: Math.min(1, Math.max(-1, Number(keyword.sentiment) || 0))
              })),
            
            weeklyMoodTrend: (Array.isArray(analysis.weeklyMoodTrend) ? analysis.weeklyMoodTrend : [])
              .map((trend: { week: string; score: number }) => ({
                week: String(trend.week),
                score: Math.min(10, Math.max(0, Number(trend.score) || 5))
              }))
          };

          // Ensure all numeric values are within valid ranges
          validatedAnalysis.sentimentScore = Math.min(10, Math.max(0, validatedAnalysis.sentimentScore));
          validatedAnalysis.weeklyProgress = Math.min(100, Math.max(0, validatedAnalysis.weeklyProgress));
          
          validatedAnalysis.emotionalInsights = validatedAnalysis.emotionalInsights.map((insight: EmotionalInsight) => ({
            ...insight,
            score: Math.min(10, Math.max(0, insight.score))
          }));

          console.log('Validated Analysis:', validatedAnalysis);
          return validatedAnalysis;
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          throw new Error('Failed to parse AI response');
        }
      } catch (generateError) {
        console.error('Error generating content:', generateError);
        throw new Error('Failed to generate AI analysis');
      }
    } catch (error) {
      console.error('Error in AI analysis:', error);
      throw error;
    }
  };

  // Process session data with enhanced analytics
  const processSessionData = async (currentSessions = sessions) => {
    console.log('Starting session data processing...');
    if (!currentSessions.length) {
      console.log('No sessions found, skipping analysis');
      setLoading(false);
      return;
    }

    // Try to load from cache first
    if (loadCachedAnalysis()) {
      return;
    }

    try {
      console.log('Total sessions to process:', currentSessions.length);
      const sortedSessions = [...currentSessions].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      // Calculate basic metrics first
      const totalMessages = sortedSessions.reduce((sum, session) => 
        sum + session.conversation.length, 0
      );
      console.log('Total messages across all sessions:', totalMessages);

      const averageDuration = sortedSessions.reduce((sum, session) => {
        const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
        return sum + duration;
      }, 0) / sessions.length;
      console.log('Average session duration (ms):', averageDuration);

      // Get AI analysis
      console.log('Requesting AI analysis...');
      const aiAnalysis = await analyzeSessionsWithAI(sortedSessions);
      console.log('AI Analysis completed:', aiAnalysis);

      // Calculate weekly mood trend if not provided by AI
      const weeklyMoodTrend = aiAnalysis.weeklyMoodTrend.length > 0 ? 
        aiAnalysis.weeklyMoodTrend : 
        calculateWeeklyMoodTrend(sortedSessions);
      console.log('Weekly mood trend:', weeklyMoodTrend);

      // Calculate monthly engagement
      const monthlyData = sortedSessions.reduce((acc: { [key: string]: number }, session) => {
        const month = new Date(session.startTime).toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});
      console.log('Monthly engagement data:', monthlyData);

      const newMetrics = {
        totalSessions: sessions.length,
        averageSessionDuration: `${Math.round(averageDuration / (1000 * 60))} minutes`,
        totalMessages,
        weeklyProgress: aiAnalysis.weeklyProgress,
        sentimentScore: aiAnalysis.sentimentScore,
        lastSessionDate: new Date(sortedSessions[sortedSessions.length - 1].endTime).toLocaleDateString(),
        commonTopics: aiAnalysis.commonTopics,
        monthlyEngagement: Object.entries(monthlyData).map(([month, sessions]) => ({
          month,
          sessions
        })),
        weeklyMoodTrend,
        sessionDurations: sortedSessions.map((session, index) => ({
          session: index + 1,
          duration: Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))
        })),
        messageCounts: sortedSessions.map((session, index) => ({
          session: index + 1,
          count: session.conversation.length
        })),
        emotionalInsights: aiAnalysis.emotionalInsights,
        progressMetrics: aiAnalysis.progressMetrics,
        keywordAnalysis: aiAnalysis.keywordAnalysis
      };

      console.log('Final processed metrics:', newMetrics);
      setMetrics(newMetrics);
      setInsights(aiAnalysis.insights);

      // Cache the analysis results
      saveAnalysisToCache(newMetrics, aiAnalysis.insights);

    } catch (error) {
      console.error('Error in processSessionData:', error);
      console.log('Falling back to basic metrics calculation...');
      const basicMetrics = calculateBasicMetrics(sessions);
      console.log('Basic metrics calculated:', basicMetrics);
      const newMetrics = {
        ...metrics,
        ...basicMetrics
      };
      setMetrics(newMetrics);
      saveAnalysisToCache(newMetrics, []); // Cache even basic metrics
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate basic metrics when AI analysis fails
  const calculateBasicMetrics = (sessions: ConversationSession[]) => {
    console.log('Calculating basic metrics for', sessions.length, 'sessions');
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Extract all user messages for basic sentiment analysis
    const userMessages = sessions.flatMap(session => 
      session.conversation.map(msg => msg.userMessage)
    );
    console.log('Total user messages:', userMessages.length);

    // Basic keyword frequency analysis
    const keywords = new Map<string, number>();
    userMessages.forEach(message => {
      const words = message.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          keywords.set(word, (keywords.get(word) || 0) + 1);
        }
      });
    });
    console.log('Keyword frequency map size:', keywords.size);

    // Get top keywords
    const topKeywords = Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, frequency]) => ({
        word,
        frequency,
        sentiment: 0
      }));
    console.log('Top keywords:', topKeywords);

    const basicMetrics = {
      weeklyProgress: Math.round((sortedSessions.length / 12) * 100),
      sentimentScore: 7,
      commonTopics: [
        { topic: "Session Topics", percentage: 100 }
      ],
      emotionalInsights: [
        { category: "Engagement", score: sortedSessions.length > 3 ? 8 : 6 }
      ],
      progressMetrics: [
        { metric: "Session Completion", value: sortedSessions.length, target: 12 }
      ],
      keywordAnalysis: topKeywords,
      weeklyMoodTrend: calculateWeeklyMoodTrend(sortedSessions)
    };

    console.log('Calculated basic metrics:', basicMetrics);
    return basicMetrics;
  };

  // Helper function to calculate weekly mood trend
  const calculateWeeklyMoodTrend = (sessions: ConversationSession[]) => {
    const weeks = Math.min(8, Math.ceil(sessions.length / 2));
    return Array.from({ length: weeks }, (_, i) => {
        const weekSessions = sessions.slice(i * 2, (i + 1) * 2);
        const avgMessages = weekSessions.reduce((sum, session) => 
            sum + session.conversation.length, 0) / weekSessions.length;
        
        return {
            week: `Week ${i + 1}`,
            score: Math.min(10, Math.max(5, avgMessages / 2 + 5))
        };
    });
  };

  // Update analysis when sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      processSessionData();
    }
  }, [sessions]);

  // Auto-rotate insights
  useEffect(() => {
    if (insights.length > 0) {
      const timer = setInterval(() => {
        setActiveInsightIndex((prev) => (prev + 1) % insights.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [insights]);

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
                  Session Analysis
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
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 animate-spin">
                <div className="absolute top-0 left-0 w-4 h-4 rounded-full bg-indigo-500"></div>
              </div>
            </div>
            <p className="text-white font-medium">Analyzing session data with Gemini AI...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Add last update timestamp */}
          <div className="text-gray-400 text-sm mb-4">
            Last updated: {lastUpdate.toLocaleString()}
          </div>

          {/* AI Insight Banner */}
          <div className="mb-8 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-xl p-6 border border-indigo-500/20">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-medium mb-2">AI Insight</h3>
                <p className="text-gray-300 leading-relaxed">
                  {insights[activeInsightIndex] || "No insights available yet"}
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Sessions */}
            <div className="bg-[#12121A]/80 rounded-xl p-6 hover:bg-[#12121A]/90 transition-all duration-300 transform hover:scale-[1.02]">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Sessions</p>
                  <p className="text-white text-2xl font-semibold">{metrics.totalSessions}</p>
                </div>
              </div>
            </div>

            {/* Average Duration */}
            <div className="bg-[#12121A]/80 rounded-xl p-6 hover:bg-[#12121A]/90 transition-all duration-300 transform hover:scale-[1.02]">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Average Duration</p>
                  <p className="text-white text-2xl font-semibold">{metrics.averageSessionDuration}</p>
                </div>
              </div>
            </div>

            {/* Progress Score */}
            <div className="bg-[#12121A]/80 rounded-xl p-6 hover:bg-[#12121A]/90 transition-all duration-300 transform hover:scale-[1.02]">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Progress Score</p>
                  <p className="text-white text-2xl font-semibold">{metrics.weeklyProgress}%</p>
                </div>
              </div>
            </div>

            {/* Sentiment Score */}
            <div className="bg-[#12121A]/80 rounded-xl p-6 hover:bg-[#12121A]/90 transition-all duration-300 transform hover:scale-[1.02]">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Sentiment Score</p>
                  <p className="text-white text-2xl font-semibold">{metrics.sentimentScore}/10</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Emotional Insights Radar Chart */}
            <div className="bg-[#12121A]/80 rounded-xl p-6">
              <h3 className="text-white font-medium mb-4">Emotional Analysis</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={metrics.emotionalInsights}>
                    <PolarGrid stroke="#2A2A35" />
                    <PolarAngleAxis dataKey="category" stroke="#9CA3AF" />
                    <PolarRadiusAxis stroke="#9CA3AF" />
                    <Radar
                      name="Emotional Score"
                      dataKey="score"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly Mood Trend */}
            <div className="bg-[#12121A]/80 rounded-xl p-6">
              <h3 className="text-white font-medium mb-4">Weekly Mood Trend</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.weeklyMoodTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" />
                    <XAxis dataKey="week" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#8B5CF6"
                      fill="url(#colorScore)"
                    />
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Common Topics */}
            <div className="bg-[#12121A]/80 rounded-xl p-6">
              <h3 className="text-white font-medium mb-4">Common Topics</h3>
              <div className="space-y-4">
                {metrics.commonTopics.map((topic, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{topic.topic}</span>
                      <span className="text-gray-400">{topic.percentage}%</span>
                    </div>
                    <div className="w-full bg-[#2A2A35] rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full h-2"
                        style={{ width: `${topic.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Metrics */}
            <div className="bg-[#12121A]/80 rounded-xl p-6">
              <h3 className="text-white font-medium mb-4">Progress Indicators</h3>
              <div className="space-y-6">
                {metrics.progressMetrics.map((metric, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">{metric.metric}</span>
                      <span className="text-gray-400">{metric.value}/{metric.target}</span>
                    </div>
                    <div className="w-full bg-[#2A2A35] rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full h-3 transition-all duration-500"
                        style={{ width: `${(metric.value / metric.target) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Keyword Analysis */}
          <div className="bg-[#12121A]/80 rounded-xl p-6">
            <h3 className="text-white font-medium mb-4">Keyword Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {metrics.keywordAnalysis.map((keyword, index) => (
                <div
                  key={index}
                  className="bg-[#2A2A35]/50 rounded-lg p-4 flex items-center justify-between"
                >
                  <span className="text-gray-300">{keyword.word}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">×{keyword.frequency}</span>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        keyword.sentiment > 0.5 ? 'bg-emerald-400' :
                        keyword.sentiment < -0.5 ? 'bg-rose-400' :
                        'bg-amber-400'
                      }`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis; 