import React from 'react';
import { useSafeSight } from '../../core/store';
import { SupportedLanguage, UserRole } from '../../core/types';
import {
  Shield,
  Volume2,
  VolumeX,
  AlertOctagon,
  Globe,
  Radio,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    t,
    language,
    setLanguage,
    userRole,
    setUserRole,
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
    <header className="shell-glass sticky top-0 z-50 w-full px-4 h-16 flex items-center">
      <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-md bg-[#FE6E00] text-white">
            <Shield className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">
                SafeSight
              </h1>
              <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] rounded-full bg-white/10 text-white/80">
                EEC Enterprise
              </span>
              {unacknowledgedAlertsCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#FB2C36] text-white">
                  {unacknowledgedAlertsCount} active
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/60 hidden sm:block truncate max-w-md">
              {t.appTagline}
            </p>
          </div>
        </div>

        {/* Action Controls & Multi-Language */}
        <div className="flex items-center gap-2">
          {/* Live Engine Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/10 text-xs font-mono">
            <Radio className="w-3.5 h-3.5 text-[#00C758] animate-pulse" />
            <span className="text-[#00C758] font-semibold">{t.status.live}</span>
            <span className="text-white/40">|</span>
            <span className="text-white/80">94.2% AI</span>
          </div>

          {/* User Role Selector — shell input */}
          <select
            aria-label="User Role"
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as UserRole)}
            className="bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-white rounded-md px-2.5 py-1.5 h-9 focus:outline-none focus:ring-2 focus:ring-[#F97015] cursor-pointer"
          >
            <option value="safety_officer" className="text-[#423D38]">👮 {t.roles.safetyOfficer}</option>
            <option value="worker" className="text-[#423D38]">👷 {t.roles.worker}</option>
            <option value="eec_admin" className="text-[#423D38]">🏛️ {t.roles.eecAdmin}</option>
          </select>

          {/* 5-Language Dropdown — shell input */}
          <div className="relative flex items-center">
            <Globe className="w-4 h-4 text-white/60 absolute left-2.5 pointer-events-none" />
            <select
              aria-label="Language Selector"
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-white rounded-md pl-8 pr-3 py-1.5 h-9 focus:outline-none focus:ring-2 focus:ring-[#F97015] cursor-pointer"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="text-[#423D38]">
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Audio Voice Synthesizer Toggle — shell ghost button */}
          <button
            onClick={toggleAudioMute}
            title={isAudioMuted ? t.vision.voiceAlarmOff : t.vision.voiceAlarmOn}
            className={`p-2 h-9 w-9 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
              isAudioMuted
                ? 'text-white/60 hover:bg-white/10 hover:text-white'
                : 'bg-[#FE6E00] text-white hover:bg-[#FF6B00]'
            }`}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Master Emergency Evacuation Trigger */}
          {evacuation.isActive ? (
            <button
              onClick={cancelEvacuation}
              className="flex items-center gap-1.5 px-3 h-9 rounded-md bg-[#FB2C36] hover:bg-[#D62029] text-white text-xs font-bold cursor-pointer"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>{t.emergency.cancelEvacuation}</span>
            </button>
          ) : (
            <button
              onClick={() => triggerEvacuation('Manual Safety Officer Trigger: High-Risk Alert')}
              className="flex items-center gap-1.5 px-3 h-9 rounded-md text-white/70 hover:bg-white/10 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
            >
              <AlertOctagon className="w-4 h-4" />
              <span className="hidden md:inline">{t.status.evacuate}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
