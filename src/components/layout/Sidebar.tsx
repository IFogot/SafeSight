import React from 'react';
import { useSafeSight } from '../../core/store';
import {
  Camera,
  Layers,
  MapPin,
  AlertTriangle,
  TrendingUp,
  Activity,
  GraduationCap,
  BellRing,
  Smartphone,
  FileCheck2,
  Zap,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeNavTab, setActiveNavTab, t, alerts, userPoints, evacuation } = useSafeSight();

  const unackAlerts = alerts.filter((a) => !a.acknowledged).length;

  const navItems = [
    {
      id: 'vision',
      label: t.nav.liveVision,
      icon: Camera,
      badge: 'LIVE',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    },
    {
      id: 'digitalTwin',
      label: t.nav.digitalTwin,
      icon: Layers,
      badge: '2.5D',
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    },
    {
      id: 'eecMap',
      label: t.nav.eecRegional,
      icon: MapPin,
      badge: 'EEC',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    },
    {
      id: 'hazard',
      label: t.nav.hazardReporter,
      icon: AlertTriangle,
      badge: unackAlerts > 0 ? `${unackAlerts}` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    },
    {
      id: 'predictive',
      label: t.nav.predictiveAi,
      icon: TrendingUp,
      badge: 'ML -37%',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    },
    {
      id: 'iot',
      label: t.nav.iotSensors,
      icon: Activity,
      badge: 'IoT',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    },
    {
      id: 'academy',
      label: t.nav.workerAcademy,
      icon: GraduationCap,
      badge: `${userPoints} XP`,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    },
    {
      id: 'emergency',
      label: t.nav.emergencyHub,
      icon: BellRing,
      badge: evacuation.isActive ? 'ALARM' : undefined,
      badgeColor: 'bg-rose-600 text-white animate-pulse',
    },
    {
      id: 'mobile',
      label: t.nav.workerMobile,
      icon: Smartphone,
      badge: 'Mobile',
      badgeColor: 'bg-slate-700 text-slate-300',
    },
    {
      id: 'audit',
      label: t.nav.auditLog,
      icon: FileCheck2,
      badge: 'ISO',
      badgeColor: 'bg-slate-700 text-slate-300',
    },
  ];

  return (
    <aside className="w-full md:w-64 shrink-0 glass-panel border-r border-slate-800/80 p-3 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
          {t.appName}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNavTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveNavTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-cyan-500/10 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-amber-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md border ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Safety Status Card */}
      <div className="mt-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">EEC Safety Index</span>
          <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
            <Zap className="w-3 h-3" /> 94.2%
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full w-[94.2%]" />
        </div>
        <div className="text-[10px] text-slate-400 font-mono flex justify-between">
          <span>Target: Zero Accident</span>
          <span className="text-amber-400">-37% YTD</span>
        </div>
      </div>
    </aside>
  );
};
