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
      badgeColor: 'bg-[#00C758]/20 text-[#00C758]',
    },
    {
      id: 'digitalTwin',
      label: t.nav.digitalTwin,
      icon: Layers,
      badge: '2.5D',
      badgeColor: 'bg-white/10 text-white/70',
    },
    {
      id: 'eecMap',
      label: t.nav.eecRegional,
      icon: MapPin,
      badge: 'EEC',
      badgeColor: 'bg-[#FE6E00]/20 text-[#FFB74D]',
    },
    {
      id: 'hazard',
      label: t.nav.hazardReporter,
      icon: AlertTriangle,
      badge: unackAlerts > 0 ? `${unackAlerts}` : undefined,
      badgeColor: 'bg-[#FB2C36] text-white',
    },
    {
      id: 'predictive',
      label: t.nav.predictiveAi,
      icon: TrendingUp,
      badge: 'ML -37%',
      badgeColor: 'bg-white/10 text-white/70',
    },
    {
      id: 'iot',
      label: t.nav.iotSensors,
      icon: Activity,
      badge: 'IoT',
      badgeColor: 'bg-white/10 text-white/70',
    },
    {
      id: 'academy',
      label: t.nav.workerAcademy,
      icon: GraduationCap,
      badge: `${userPoints} XP`,
      badgeColor: 'bg-[#FE6E00]/20 text-[#FFB74D]',
    },
    {
      id: 'emergency',
      label: t.nav.emergencyHub,
      icon: BellRing,
      badge: evacuation.isActive ? 'ALARM' : undefined,
      badgeColor: 'bg-[#FB2C36] text-white animate-pulse',
    },
    {
      id: 'mobile',
      label: t.nav.workerMobile,
      icon: Smartphone,
      badge: 'Mobile',
      badgeColor: 'bg-white/10 text-white/70',
    },
    {
      id: 'audit',
      label: t.nav.auditLog,
      icon: FileCheck2,
      badge: 'ISO',
      badgeColor: 'bg-white/10 text-white/70',
    },
  ];

  return (
    <aside className="shell-glass w-full md:w-64 shrink-0 rounded-xl p-3 flex flex-col justify-between">
      <div className="space-y-0.5">
        <div className="px-3 py-2 text-[11px] uppercase tracking-[0.05em] text-white/50 font-semibold">
          {t.appName}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNavTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveNavTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#FE6E00] text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Safety Status Card */}
      <div className="mt-4 p-3 rounded-lg bg-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/60 font-medium">EEC Safety Index</span>
          <span className="font-mono font-bold text-[#00C758] flex items-center gap-1">
            94.2%
          </span>
        </div>
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#FE6E00] h-full w-[94.2%]" />
        </div>
        <div className="text-[10px] text-white/50 font-mono flex justify-between">
          <span>Target: Zero Accident</span>
          <span className="text-[#FFB74D]">-37% YTD</span>
        </div>
      </div>
    </aside>
  );
};
