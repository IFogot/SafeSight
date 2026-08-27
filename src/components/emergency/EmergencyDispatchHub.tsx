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
  ShieldCheck,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { soundEngine } from '../../core/speech';
import { SupportedLanguage } from '../../core/types';

export const EmergencyDispatchHub: React.FC = () => {
  const { t, language, evacuation, triggerEvacuation, cancelEvacuation, isDbConnected } = useSafeSight();
  const [customReason, setCustomReason] = useState<string>(
    'Toxic H2S Gas Leak Spike Detected in Zone A - Immediate Industrial Evacuation'
  );
  const [headcountChecked, setHeadcountChecked] = useState<number>(evacuation.accountedPersonnel);

  // 4-Step Emergency Response Protocol Checklist
  const [checklist, setChecklist] = useState<{ id: string; title: string; done: boolean; responsible: string }[]>([
    { id: 'step-1', title: 'Scrubber Ventilation & Zone A Catalytic Feed Cutoff', done: true, responsible: 'Automation System' },
    { id: 'step-2', title: 'Remote High-Voltage Transformer Safety Trip', done: true, responsible: 'Electrical Control' },
    { id: 'step-3', title: 'EEC Regional 199/1669 Industrial Fire & Rescue Dispatch', done: false, responsible: 'Chief Safety Officer' },
    { id: 'step-4', title: 'Assembly Point A Wind Vector & RFID Verification', done: false, responsible: 'Muster Point Warden' },
  ]);

  useEffect(() => {
    setHeadcountChecked(evacuation.accountedPersonnel);
  }, [evacuation.accountedPersonnel, evacuation.isActive]);

  const handleSimulateCheckIn = () => {
    setHeadcountChecked((prev) => Math.min(evacuation.totalPersonnel, prev + 12));
    soundEngine.playAlertBeep('click');
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
    soundEngine.playAlertBeep('click');
  };

  const emergencyPhrases: Record<SupportedLanguage, { label: string; text: string; flag: string }> = {
    th: {
      label: 'ภาษาไทย (Thai)',
      flag: '🇹🇭',
      text: 'ประกาศฉุกเฉิน! ขอให้พนักงานทุกคนหยุดการทำงานและอพยพไปยังจุดรวมพล A ทันที',
    },
    en: {
      label: 'English',
      flag: '🇬🇧',
      text: 'Emergency evacuation alert! All personnel immediately stop machinery and evacuate to Muster Point A.',
    },
    my: {
      label: 'မြန်မာ (Burmese)',
      flag: '🇲🇲',
      text: 'အရေးပေါ် ရွှေ့ပြောင်းရေး သတိပေးချက်! အလုပ်သမားအားလုံး လူစုဝေးရာနေရာ A သို့ ချက်ချင်း ထွက်ခွာပါ။',
    },
    km: {
      label: 'ភាសាខ្មែរ (Khmer)',
      flag: '🇰🇭',
      text: 'ការជូនដំណឹងជម្លៀសបន្ទាន់! បុគ្គលិកទាំងអស់ត្រូវជម្លៀសទៅកាន់ចំណុចប្រមូលផ្តុំ A ជាបន្ទាន់។',
    },
    lo: {
      label: 'ພາສາລາວ (Lao)',
      flag: '🇱🇦',
      text: 'ປະກາດສຸກເສີນ! ຂໍໃຫ້ພະນັກງານທຸກຄົນອົບພະຍົບໄປຍັງຈຸດລວມພົນ A ທັນທີ.',
    },
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
              Live meteorological telemetry indicates SSW wind (12 kts). Muster Point A remains free of airborne contaminant plumes.
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
            <span className="text-xs font-mono text-cyan-400">4 Dispatch Channels Linked</span>
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
                  Pushed emergency evacuation rich card with interactive multilingual audio in Thai, Burmese, Khmer, and Lao.
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
                  Direct SMS broadcast dispatched to all active shift employee devices across Chonburi & Rayong plants.
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
                  <strong className="text-slate-200">Factory PA Acoustic Horns (110 dB)</strong>
                  <span className="font-mono text-[10px] text-amber-400">
                    {evacuation.isActive ? 'BROADCASTING (110dB)' : 'STANDBY'}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Continuous acoustic broadcast running in Thai, Burmese, Khmer, and Lao.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multilingual Voice Broadcast Preview Console & Emergency Response Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Multilingual Audio Broadcast Console */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" /> 5-Language Voice Announcement Broadcast
            </span>
            <span className="text-[10px] font-mono text-slate-400">Web Speech API</span>
          </div>

          <div className="space-y-2 text-xs">
            {(Object.keys(emergencyPhrases) as SupportedLanguage[]).map((langKey) => {
              const item = emergencyPhrases[langKey];
              return (
                <div
                  key={langKey}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <span>{item.flag}</span>
                      <span>{item.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-sm">{item.text}</p>
                  </div>
                  <button
                    onClick={() => soundEngine.speakText(item.text, langKey)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Play
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. ISO 45001 Emergency Response Checklist */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> ISO 45001 Emergency Protocol Checklist
            </span>
            <span className="text-[10px] font-mono text-emerald-400">
              {checklist.filter((c) => c.done).length} / {checklist.length} Completed
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggleChecklist(item.id)}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all cursor-pointer ${
                  item.done
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-200'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {item.done ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5 flex-1">
                  <div className="font-bold">{item.title}</div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Lead: {item.responsible}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
