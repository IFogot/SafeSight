import React from 'react';
import { useSafeSight } from '../../core/store';
import { SupportedLanguage, UserRole } from '../../core/types';
import {
  Shield,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  AlertOctagon,
  Globe,
  Radio,
  UserCheck,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    t,
    language,
    setLanguage,
    userRole,
    setUserRole,
    isDarkTheme,
    setIsDarkTheme,
    isAudioMuted,
    toggleAudioMute,
    evacuation,
    triggerEvacuation,
    cancelEvacuation,
    alerts,
  } = useSafeSight();

  const unacknowledgedAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  const languages: { code: SupportedLanguage; label: string; flag: string }[] = [
    { code: 'th', label: 'ไทย (Thai)', flag: '🇹🇭' },
    { code: 'en', label: 'English (EN)', flag: '🇬🇧' },
    { code: 'my', label: 'မြန်မာ (Burmese)', flag: '🇲🇲' },
    { code: 'km', label: 'ភាសាខ្មែរ (Khmer)', flag: '🇰🇭' },
    { code: 'lo', label: 'ພາສາລາວ (Lao)', flag: '🇱🇦' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/20 text-slate-950">
            <Shield className="w-6 h-6 stroke-[2.5]" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-cyan-300 bg-clip-text text-transparent">
                SafeSight
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                EEC Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block truncate max-w-md">
              {t.appTagline}
            </p>
          </div>
        </div>

        {/* Action Controls & Multi-Language */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Engine Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-semibold">{t.status.live}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">94.2% AI</span>
          </div>

          {/* User Role Selector */}
          <div className="relative">
            <select
              aria-label="User Role"
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as UserRole)}
              className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="safety_officer">👮 {t.roles.safetyOfficer}</option>
              <option value="worker">👷 {t.roles.worker}</option>
              <option value="eec_admin">🏛️ {t.roles.eecAdmin}</option>
            </select>
          </div>

          {/* 5-Language Dropdown */}
          <div className="relative flex items-center">
            <Globe className="w-4 h-4 text-cyan-400 absolute left-2.5 pointer-events-none" />
            <select
              aria-label="Language Selector"
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 text-xs font-medium text-cyan-300 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-slate-900 text-slate-100">
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Audio Voice Synthesizer Toggle */}
          <button
            onClick={toggleAudioMute}
            title={isAudioMuted ? t.vision.voiceAlarmOff : t.vision.voiceAlarmOn}
            className={`p-2 rounded-lg border transition-all ${
              isAudioMuted
                ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-sm shadow-cyan-500/20'
            }`}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            title="Toggle Dark/Light"
            className="p-2 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-amber-400 transition-colors"
          >
            {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Master Emergency Evacuation Trigger */}
          {evacuation.isActive ? (
            <button
              onClick={cancelEvacuation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold animate-pulse shadow-lg shadow-rose-600/40 cursor-pointer"
            >
              <AlertOctagon className="w-4 h-4 animate-spin" />
              <span>{t.emergency.cancelEvacuation}</span>
            </button>
          ) : (
            <button
              onClick={() => triggerEvacuation('Manual Safety Officer Trigger: High-Risk Alert')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/40 text-rose-400 text-xs font-bold transition-all cursor-pointer"
            >
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span className="hidden md:inline">{t.status.evacuate}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
