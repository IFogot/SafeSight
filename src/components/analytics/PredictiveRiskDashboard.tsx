import React, { useState } from 'react';
import { useSafeSight } from '../../core/store';
import {
  TrendingUp,
  Sliders,
  ShieldCheck,
  Zap,
  Activity,
  AlertOctagon,
  Award,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { HISTORICAL_ACCIDENT_DATA, PILOT_TRIAL_STATS } from '../../core/mockData';
import { riskPredictor } from '../../engine/riskPredictor';

export const PredictiveRiskDashboard: React.FC = () => {
  const { t, language } = useSafeSight();

  // What-If Simulation Sliders
  const [shiftHours, setShiftHours] = useState<number>(9);
  const [temperature, setTemperature] = useState<number>(33);
  const [fatigueIndex, setFatigueIndex] = useState<number>(35);
  const [workerDensity, setWorkerDensity] = useState<number>(8);

  const predictionResult = riskPredictor.calculateShiftRisk({
    shiftHours,
    ambientTemperature: temperature,
    workerFatigueIndex: fatigueIndex,
    zoneWorkerDensity: workerDensity,
    machineVibration: 3.2,
    nearMissCountLast7Days: 2,
  });

  const paretoData = [
    { name: 'Missing PPE (Helmet/Vest)', count: 48, fill: '#F59E0B' },
    { name: 'Slip, Trip & Fall', count: 32, fill: '#EF4444' },
    { name: 'Machinery Pinch Point', count: 24, fill: '#06B6D4' },
    { name: 'Chemical Splash / Fumes', count: 18, fill: '#8B5CF6' },
    { name: 'High-Bay Stacking Risk', count: 14, fill: '#10B981' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              {t.predictive.title}
            </h2>
            <p className="text-xs text-slate-400">{t.predictive.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Hero KPIs Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">{t.predictive.aiAccuracy}</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-extrabold text-emerald-400">
              {PILOT_TRIAL_STATS.modelAccuracy}%
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              F1: {PILOT_TRIAL_STATS.f1Score}%
            </span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">
            {t.predictive.accidentReduction}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-extrabold text-amber-400">
              {PILOT_TRIAL_STATS.accidentReduction}%
            </span>
            <span className="text-[10px] font-mono text-emerald-400">2 Pilot Plants</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">
            {t.predictive.avgResponseTime}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-extrabold text-cyan-400">
              {PILOT_TRIAL_STATS.responseTimeReduction}%
            </span>
            <span className="text-[10px] font-mono text-slate-400">Avg 6.8 Mins</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">
            {t.predictive.verifiedAlerts}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-extrabold text-purple-400">
              {PILOT_TRIAL_STATS.verifiedAlerts} Incidents
            </span>
            <span className="text-[10px] font-mono text-emerald-400">95.3% Recall</span>
          </div>
        </div>
      </div>

      {/* Main Historical Trend Chart & ML Scenario Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Historical Trend Chart (Left 2 cols) */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Workplace Accidents: Before vs After SafeSight Deployment
              </h3>
              <p className="text-xs text-slate-400">
                Tracking 6-month trial across 2 manufacturing plants in Chonburi & Rayong
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-bold">
              -37% Overall Reduction
            </span>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HISTORICAL_ACCIDENT_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBefore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorAfter" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} fontFamily="JetBrains Mono" />
                <YAxis stroke="#64748B" fontSize={11} fontFamily="JetBrains Mono" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="before"
                  name="Before SafeSight (Monthly Accidents)"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorBefore)"
                />
                <Area
                  type="monotone"
                  dataKey="after"
                  name="With SafeSight AI (Protected)"
                  stroke="#10B981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAfter)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* What-If Machine Learning Risk Simulator (Right col) */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4" /> {t.predictive.whatIfSimulator}
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                predictionResult.riskCategory === 'critical'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : predictionResult.riskCategory === 'high'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {predictionResult.riskCategory.toUpperCase()} RISK
            </span>
          </div>

          {/* Sliders */}
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">{t.predictive.shiftLength}</span>
                <span className="font-mono font-bold text-amber-300">{shiftHours} Hours</span>
              </div>
              <input
                type="range"
                min="6"
                max="14"
                value={shiftHours}
                onChange={(e) => setShiftHours(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">{t.predictive.ambientTemp}</span>
                <span className="font-mono font-bold text-cyan-300">{temperature}°C</span>
              </div>
              <input
                type="range"
                min="24"
                max="44"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">{t.predictive.fatigueLevel}</span>
                <span className="font-mono font-bold text-purple-300">{fatigueIndex}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={fatigueIndex}
                onChange={(e) => setFatigueIndex(Number(e.target.value))}
                className="w-full accent-purple-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">{t.predictive.zoneCongestion}</span>
                <span className="font-mono font-bold text-slate-200">{workerDensity} Workers</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={workerDensity}
                onChange={(e) => setWorkerDensity(Number(e.target.value))}
                className="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Output Score Box */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{t.predictive.calculatedRisk}</span>
              <span className="font-mono font-bold text-lg text-amber-400">
                {predictionResult.overallRiskIndex} / 100
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              Estimated Injury Probability:{' '}
              <strong className="text-rose-400">
                {predictionResult.predictedInjuryProbabilityPct}%
              </strong>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-bold text-cyan-400 block mb-1">
                AI Proactive Action:
              </span>
              <ul className="text-[11px] text-slate-300 space-y-1 list-disc pl-4">
                {(
                  predictionResult.recommendations[language] ||
                  predictionResult.recommendations.th
                ).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Root Cause Distribution */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-slate-100">
          Root Cause Incident Classification (EEC Pilot Dataset)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {paretoData.map((item, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1"
            >
              <span className="text-xs text-slate-400 font-medium block truncate">
                {item.name}
              </span>
              <span className="text-lg font-mono font-bold" style={{ color: item.fill }}>
                {item.count} Cases
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
