import React, { useState, useEffect } from 'react';
import { X, BarChart2, TrendingUp, Clock, MessageCircle, Brain, ChevronRight, Loader } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { sessionApi } from '../../services/api';

interface AnalysisProps {
  onClose: () => void;
  sessions: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Analysis: React.FC<AnalysisProps> = ({ onClose, sessions }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('insights');
  const [insights, setInsights] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<any>({
    sessionDurations: [],
    messageCounts: [],
    timeOfDay: { morning: 0, afternoon: 0, evening: 0, night: 0 },
    weeklyActivity: Array(7).fill(0)
  });

  const generateInsights = async () => {
    setLoading(true);
    try {
      const data = await sessionApi.analyze();
      setInsights(data.insights);
      
      // Update metrics with the server-provided data
      const newMetrics = {
        sessionDurations: data.metrics.sessionData.map((session: any, index: number) => ({
          session: index + 1,
          duration: session.duration
        })),
        messageCounts: data.metrics.sessionData.map((session: any, index: number) => ({
          session: index + 1,
          count: session.messageCount
        })),
        timeOfDay: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        weeklyActivity: Array(7).fill(0)
      };

      // Calculate time of day distribution
      data.metrics.sessionData.forEach((session: any) => {
        const hour = new Date(session.date).getHours();
        if (hour >= 5 && hour < 12) newMetrics.timeOfDay.morning++;
        else if (hour >= 12 && hour < 17) newMetrics.timeOfDay.afternoon++;
        else if (hour >= 17 && hour < 22) newMetrics.timeOfDay.evening++;
        else newMetrics.timeOfDay.night++;
      });

      // Calculate weekly activity
      data.metrics.sessionData.forEach((session: any) => {
        const day = new Date(session.date).getDay();
        newMetrics.weeklyActivity[day]++;
      });

      setMetrics(newMetrics);
    } catch (error) {
      console.error('Error analyzing sessions:', error);
      setInsights([
        'Unable to generate AI insights at this time.',
        'Please ensure there is sufficient session data for analysis.'
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateInsights();
  }, [sessions]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-white font-medium">Analyzing session data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800/90 backdrop-blur-md z-10 border-b border-gray-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">Therapy Session Analysis</h1>
                <p className="text-gray-400 text-sm">
                  AI-powered insights from {sessions.length} sessions
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-6 mt-6">
              <button
                onClick={() => setActiveTab('insights')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'insights'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Brain className="w-5 h-5" />
                <span>AI Insights</span>
              </button>
              <button
                onClick={() => setActiveTab('metrics')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'metrics'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <BarChart2 className="w-5 h-5" />
                <span>Session Metrics</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'insights' ? (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white mb-4">AI-Generated Insights</h3>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-800 rounded-lg border border-gray-700"
                    >
                      <p className="text-gray-300">{insight}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h4 className="text-gray-400 text-sm">Total Sessions</h4>
                  <p className="text-2xl font-bold text-white mt-1">{metrics.sessionDurations.length}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h4 className="text-gray-400 text-sm">Total Duration</h4>
                  <p className="text-2xl font-bold text-white mt-1">{metrics.sessionDurations.reduce((acc: number, curr: any) => acc + curr.duration, 0)} mins</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h4 className="text-gray-400 text-sm">Avg. Session Length</h4>
                  <p className="text-2xl font-bold text-white mt-1">
                    {Math.round(metrics.sessionDurations.reduce((acc: number, curr: any) => acc + curr.duration, 0) / metrics.sessionDurations.length)} mins
                  </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h4 className="text-gray-400 text-sm">Total Messages</h4>
                  <p className="text-2xl font-bold text-white mt-1">{metrics.messageCounts.reduce((acc: number, curr: any) => acc + curr.count, 0)}</p>
                </div>
              </div>

              {/* Session Duration Trend */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <h4 className="text-white mb-4">Session Duration Trend</h4>
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

              {/* Message Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Message Count per Session */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h4 className="text-white mb-4">Messages per Session</h4>
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
                        <Bar dataKey="count" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Time of Day Distribution */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h4 className="text-white mb-4">Session Time Distribution</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(metrics.timeOfDay).map(([name, value]) => ({
                            name: name.charAt(0).toUpperCase() + name.slice(1),
                            value
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {Object.entries(metrics.timeOfDay).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                          labelStyle={{ color: '#9CA3AF' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analysis; 