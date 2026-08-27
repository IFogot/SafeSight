import React, { useState, useEffect } from 'react';
import { useSafeSight } from '../../core/store';
import {
  BellRing,
  AlertOctagon,
  Users,
  MessageSquare,
  Smartphone,
  Radio,
  CheckCircle2,
  Volume2,
} from 'lucide-react';
import { soundEngine } from '../../core/speech';

export const EmergencyDispatchHub: React.FC = () => {
  const { t, language, evacuation, triggerEvacuation, cancelEvacuation } = useSafeSight();
  const [customReason, setCustomReason] = useState<string>(
    'Toxic Gas Leak Detected in Zone A - Evacuate Immediately'
  );
  const [headcountChecked, setHeadcountChecked] = useState<number>(evacuation.accountedPersonnel);

  // FIX BUG-03: Sync headcount when evacuation state changes
  useEffect(() => {
    setHeadcountChecked(evacuation.accountedPersonnel);
  }, [evacuation.accountedPersonnel, evacuation.isActive]);

  const handleSimulateCheckIn = () => {
    setHeadcountChecked((prev) => Math.min(evacuation.totalPersonnel, prev + 12));
    soundEngine.playAlertBeep('click');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          evacuation.isActive
            ? 'bg-rose-950/40 border-rose-500/80 shadow-2xl shadow-rose-600/20 animate-emergency'
            : 'glass-panel border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl border ${
                evacuation.isActive
                  ? 'bg-rose-600 text-white animate-bounce'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}
            >
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  {t.emergency.title}
                </h2>
                {evacuation.isActive && (
                  <span className="px-2.5 py-0.5 text-[10px] font-mono font-extrabold rounded-full bg-rose-600 text-white animate-pulse">
                    ALARM ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">{t.emergency.subtitle}</p>
            </div>
          </div>

          {/* Trigger / Cancel Button */}
          {evacuation.isActive ? (
            <button
              onClick={cancelEvacuation}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-extrabold text-xs shadow-xl transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{t.emergency.cancelEvacuation}</span>
            </button>
          ) : (
            <button
              onClick={() => triggerEvacuation(customReason)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>{t.emergency.triggerEvacuation}</span>
            </button>
          )}
        </div>
      </div>

      {/* Headcount Tracker & Evacuation Route Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Personnel Headcount (Left col) */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" /> Muster Point A Headcount
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              Total: {evacuation.totalPersonnel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
              <span className="text-[11px] text-slate-400 block">{t.emergency.accountedWorkers}</span>
              <span className="text-2xl font-mono font-extrabold text-emerald-400">
                {evacuation.isActive ? headcountChecked : evacuation.totalPersonnel}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1">
              <span className="text-[11px] text-slate-400 block">{t.emergency.missingWorkers}</span>
              <span className="text-2xl font-mono font-extrabold text-rose-400">
                {evacuation.isActive
                  ? Math.max(0, evacuation.totalPersonnel - headcountChecked)
                  : 0}
              </span>
            </div>
          </div>

          {evacuation.isActive && (
            <button
              onClick={handleSimulateCheckIn}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
            >
              + Simulate RFID Gate Badge Check-In (+12)
            </button>
          )}

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
            <span className="font-bold text-slate-200 block">
              Primary Assembly: {evacuation.safestAssemblyPoint}
            </span>
            <p className="text-[11px] text-slate-400">
              Current wind direction (SSW 12 knots) makes North Gate Muster Point A the safest gathering location.
            </p>
          </div>
        </div>

        {/* Multi-Channel Automated Broadcast Dispatch Log (Right 2 cols) */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              {t.emergency.dispatchLog}
            </h3>
            <span className="text-xs font-mono text-cyan-400">4 Gateways Active</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* LINE OA Broadcast */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-200">LINE Official Account (Worker Push)</strong>
                  <span className="font-mono text-[10px] text-emerald-400">SENT (3,420 USERS)</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Pushed rich emergency card with multilingual voice clip & exit map in TH, MM, KM, LO.
                </p>
              </div>
            </div>

            {/* SMS Emergency Gateway */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-200">National SMS Gateway (EEC Regional)</strong>
                  <span className="font-mono text-[10px] text-emerald-400">DISPATCHED</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Direct SMS broadcast to all registered factory shift personnel phones.
                </p>
              </div>
            </div>

            {/* Factory PA Multilingual Acoustic Speakers */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-200">Factory PA Horn Speakers (110 dB)</strong>
                  <span className="font-mono text-[10px] text-amber-400">
                    {evacuation.isActive ? 'BROADCASTING' : 'STANDBY'}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Looping synthesized evacuation voice prompts in Thai, Burmese, Khmer, and Lao.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
