import React, { useEffect, useState } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, Brain, Target, Lightbulb } from 'lucide-react';

const TREND_COLOR = { improving: '#10b981', declining: '#ef4444', stable: '#6366f1' };

export default function AnalyticsPage() {
  const [activities, setActivities] = useState([]);
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => { fetchAll(); }, [period]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [actRes, patRes] = await Promise.all([
        API.get(`/activities?period=${period}&limit=90`),
        API.get('/predictions/patterns')
      ]);
      setActivities(actRes.data.activities.reverse());
      setPatterns(patRes.data.patterns);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  };

  const chartData = activities.map(a => ({
    date: format(new Date(a.date), 'MMM d'),
    study: a.studyHours,
    sleep: a.sleepHours,
    exercise: Math.round(a.exerciseMinutes / 6),  // scale to 0-20 for visibility
    screen: a.screenTimeHours,
    score: a.productivityScore
  }));

  const radarData = patterns ? [
    { metric: 'Study',    value: Math.min((patterns.averages.study / 8) * 100, 100) },
    { metric: 'Sleep',    value: Math.min((patterns.averages.sleep / 9) * 100, 100) },
    { metric: 'Exercise', value: Math.min((patterns.averages.exercise / 60) * 100, 100) },
    { metric: 'Focus',    value: Math.max(0, 100 - (patterns.averages.screen / 8) * 100) },
    { metric: 'Score',    value: patterns.averages.score }
  ] : [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics & Patterns</h1>
          <p className="text-slate-400 text-sm mt-0.5">Deep insights powered by machine learning</p>
        </div>
        <div className="flex gap-2">
          {['7','14','30','60'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${period === p ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-white/10'}`}>
              {p}d
            </button>
          ))}
        </div>
      </div>

      {activities.length < 3 ? (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-12 text-center">
          <Brain size={40} className="text-indigo-400 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg">Not enough data</p>
          <p className="text-slate-400 mt-1">Log at least 3 activities to see analytics</p>
        </div>
      ) : (
        <>
          {/* ML Pattern summary */}
          {patterns && (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                    <Brain size={18} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Avg Score</p>
                    <p className="text-slate-400 text-xs">Last {period} days</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{patterns.averages.score.toFixed(0)}<span className="text-slate-400 text-sm">/100</span></p>
              </div>

              <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    patterns.trend === 'improving' ? 'bg-emerald-600/20' :
                    patterns.trend === 'declining' ? 'bg-red-600/20' : 'bg-slate-700'
                  }`}>
                    {patterns.trend === 'improving' ? <TrendingUp size={18} className="text-emerald-400" /> :
                     patterns.trend === 'declining' ? <TrendingDown size={18} className="text-red-400" /> :
                     <Minus size={18} className="text-slate-400" />}
                  </div>
                  <div>
                    <p className="text-white font-medium">Trend</p>
                    <p className="text-slate-400 text-xs">Score direction</p>
                  </div>
                </div>
                <p className={`text-2xl font-bold capitalize ${TREND_COLOR[patterns.trend] ? '' : 'text-white'}`}
                   style={{ color: TREND_COLOR[patterns.trend] || '#fff' }}>
                  {patterns.trend}
                </p>
              </div>

              <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
                    <Target size={18} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Days Tracked</p>
                    <p className="text-slate-400 text-xs">Total logs</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{patterns.totalDaysTracked}</p>
              </div>
            </div>
          )}

          {/* Area chart - score over time */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
            <p className="text-white font-semibold mb-4">Productivity Score Over Time</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="score" stroke="#6366f1" fill="url(#scoreGrad)" strokeWidth={2.5} name="Score" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Two column: multi-line + radar */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Activity trends */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
              <p className="text-white font-semibold mb-4">Activity Trends</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="study"    name="Study (h)"    stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="sleep"    name="Sleep (h)"    stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="screen"   name="Screen (h)"   stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Radar chart */}
            {radarData.length > 0 && (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                <p className="text-white font-semibold mb-4">Habit Balance Radar</p>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} />
                    <Radar name="You" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} formatter={v => [`${v.toFixed(0)}%`, 'Score']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bar chart comparison */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
            <p className="text-white font-semibold mb-4">Study vs Screen Time Comparison</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="study"  name="Study (h)"  fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="screen" name="Screen (h)" fill="#f59e0b" radius={[4,4,0,0]} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* AI Suggestions */}
          {patterns?.suggestions?.length > 0 && (
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
              <p className="text-white font-semibold mb-4 flex items-center gap-2">
                <Lightbulb size={18} className="text-amber-400" /> Personalized AI Insights
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                {patterns.suggestions.map((s, i) => (
                  <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${
                    s.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
                    s.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                    s.type === 'danger'  ? 'bg-red-500/10 border-red-500/20' :
                    'bg-indigo-500/10 border-indigo-500/20'
                  }`}>
                    <span className="text-2xl leading-none">{s.icon}</span>
                    <p className="text-slate-300 text-sm leading-relaxed">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
