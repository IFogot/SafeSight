import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SupportedLanguage,
  UserRole,
  SafetyAlert,
  HazardReport,
  CCTVChannel,
  IoTTelemetryPoint,
  EvacuationPlanState,
} from './types';
import {
  INITIAL_CCTV_CHANNELS,
  INITIAL_SAFETY_ALERTS,
  INITIAL_HAZARD_REPORTS,
  INITIAL_IOT_TELEMETRY,
} from './mockData';
import { soundEngine } from './speech';
import { translations, TranslationDict } from './i18n';

interface SafeSightContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: TranslationDict;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isDarkTheme: boolean;
  setIsDarkTheme: (isDark: boolean) => void;
  isAudioMuted: boolean;
  toggleAudioMute: () => void;
  alerts: SafetyAlert[];
  addAlert: (alert: Omit<SafetyAlert, 'id' | 'timestamp'>) => void;
  acknowledgeAlert: (id: string) => void;
  clearAlerts: () => void;
  channels: CCTVChannel[];
  updateChannelStatus: (channelId: string, status: CCTVChannel['status'], violations?: string[]) => void;
  hazardReports: HazardReport[];
  addHazardReport: (report: Omit<HazardReport, 'id' | 'timestamp' | 'upvotes'>) => void;
  upvoteHazardReport: (id: string) => void;
  iotTelemetry: IoTTelemetryPoint[];
  updateTelemetry: (zone: string, data: Partial<IoTTelemetryPoint>) => void;
  evacuation: EvacuationPlanState;
  triggerEvacuation: (reason: string) => void;
  cancelEvacuation: () => void;
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;
  userPoints: number;
  addPoints: (points: number) => void;
}

const SafeSightContext = createContext<SafeSightContextType | null>(null);

export const SafeSightProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('safesight_lang') as SupportedLanguage) || 'th';
    }
    return 'th';
  });

  const [userRole, setUserRole] = useState<UserRole>('safety_officer');
  const [isDarkTheme, setIsDarkThemeState] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<SafetyAlert[]>(INITIAL_SAFETY_ALERTS);
  const [channels, setChannels] = useState<CCTVChannel[]>(INITIAL_CCTV_CHANNELS);
  const [hazardReports, setHazardReports] = useState<HazardReport[]>(INITIAL_HAZARD_REPORTS);
  const [iotTelemetry, setIotTelemetry] = useState<IoTTelemetryPoint[]>(INITIAL_IOT_TELEMETRY);
  const [activeNavTab, setActiveNavTab] = useState<string>('vision');
  const [userPoints, setUserPoints] = useState<number>(350);

  const [evacuation, setEvacuation] = useState<EvacuationPlanState>({
    isActive: false,
    safestAssemblyPoint: 'Muster Point A (North Gate)',
    evacuateZones: [],
    totalPersonnel: 184,
    accountedPersonnel: 184,
    missingPersonnel: 0,
    broadcastChannels: {
      lineOA: true,
      smsGateway: true,
      factoryPA: true,
      iotStrobe: true,
    },
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safesight_lang', lang);
    }
  };

  const setIsDarkTheme = (isDark: boolean) => {
    setIsDarkThemeState(isDark);
    if (typeof window !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const toggleAudioMute = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    soundEngine.isMuted = nextMuted;
  };

  const addAlert = (alertData: Omit<SafetyAlert, 'id' | 'timestamp'>) => {
    const newAlert: SafetyAlert = {
      ...alertData,
      id: `alt-${Date.now().toString().slice(-4)}`,
      timestamp: 'Just now',
    };
    setAlerts((prev) => [newAlert, ...prev]);

    // Trigger audio alarm & speech
    if (!isAudioMuted) {
      soundEngine.playAlertBeep(newAlert.riskLevel === 'critical' ? 'critical' : 'warning');
      const spokenText = newAlert.audioText[language] || newAlert.audioText.th;
      setTimeout(() => {
        soundEngine.speakText(spokenText, language);
      }, 300);
    }
  };

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const updateChannelStatus = (
    channelId: string,
    status: CCTVChannel['status'],
    violations?: string[]
  ) => {
    setChannels((prev) =>
      prev.map((c) =>
        c.id === channelId
          ? {
              ...c,
              status,
              currentViolations: violations !== undefined ? violations : c.currentViolations,
            }
          : c
      )
    );
  };

  const addHazardReport = (
    reportData: Omit<HazardReport, 'id' | 'timestamp' | 'upvotes'>
  ) => {
    const newReport: HazardReport = {
      ...reportData,
      id: `HZ-2026-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: 'Just now',
      upvotes: 1,
    };
    setHazardReports((prev) => [newReport, ...prev]);
    soundEngine.playAlertBeep('success');
  };

  const upvoteHazardReport = (id: string) => {
    setHazardReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r))
    );
    soundEngine.playAlertBeep('click');
  };

  const updateTelemetry = (zone: string, data: Partial<IoTTelemetryPoint>) => {
    setIotTelemetry((prev) =>
      prev.map((item) =>
        item.zone === zone ? { ...item, ...data, lastUpdated: 'Just now' } : item
      )
    );
  };

  const triggerEvacuation = (reason: string) => {
    setEvacuation({
      isActive: true,
      triggeredAt: new Date().toLocaleTimeString(),
      triggerReason: reason,
      evacuateZones: ['Zone A', 'Zone B', 'Zone C', 'Zone D'],
      safestAssemblyPoint: 'Muster Point A (North Gate, Safe Wind Vector)',
      totalPersonnel: 184,
      accountedPersonnel: 42,
      missingPersonnel: 142,
      broadcastChannels: {
        lineOA: true,
        smsGateway: true,
        factoryPA: true,
        iotStrobe: true,
      },
    });

    soundEngine.startEvacuationSiren();

    const emergencySpeech: Record<SupportedLanguage, string> = {
      th: 'ประกาศฉุกเฉิน! ขอให้พนักงานทุกคนหยุดการทำงานและอพยพไปยังจุดรวมพล A ทันที',
      en: 'Emergency evacuation alert! All personnel immediately evacuate to Muster Point A',
      my: 'အရေးပေါ် ရွှေ့ပြောင်းရေး သတိပေးချက်! အလုပ်သမားအားလုံး လူစုဝေးရာနေရာ A သို့ ချက်ချင်း ထွက်ခွာပါ',
      km: 'ការជូនដំណឹងជម្លៀសបន្ទាន់! បុគ្គលិកទាំងអស់ត្រូវជម្លៀសទៅកាន់ចំណុចប្រមូលផ្តុំ A ជាបន្ទាន់',
      lo: 'ປະກາດສຸກເສີນ! ຂໍໃຫ້ພະນັກງານທຸກຄົນອົບພະຍົບໄປຍັງຈຸດລວມພົນ A ທັນທີ',
    };

    setTimeout(() => {
      soundEngine.speakText(emergencySpeech[language] || emergencySpeech.th, language);
    }, 1500);
  };

  const cancelEvacuation = () => {
    setEvacuation((prev) => ({
      ...prev,
      isActive: false,
      accountedPersonnel: prev.totalPersonnel,
      missingPersonnel: 0,
    }));
    soundEngine.stopEvacuationSiren();
    soundEngine.playAlertBeep('success');
  };

  const addPoints = (pts: number) => {
    setUserPoints((prev) => prev + pts);
    soundEngine.playAlertBeep('success');
  };

  // Periodic simulated IoT fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setIotTelemetry((prev) =>
        prev.map((pt) => {
          const deltaGas = (Math.random() - 0.5) * 0.3;
          const deltaTemp = (Math.random() - 0.5) * 0.2;
          const deltaNoise = (Math.random() - 0.5) * 1.5;
          const deltaPower = (Math.random() - 0.5) * 2.0;

          return {
            ...pt,
            toxicGasH2S: Math.max(0, parseFloat((pt.toxicGasH2S + deltaGas).toFixed(1))),
            temperature: Math.max(20, parseFloat((pt.temperature + deltaTemp).toFixed(1))),
            noiseLevel: Math.max(60, parseFloat((pt.noiseLevel + deltaNoise).toFixed(1))),
            powerConsumption: Math.max(10, parseFloat((pt.powerConsumption + deltaPower).toFixed(1))),
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const t = translations[language] || translations.th;

  return (
    <SafeSightContext.Provider
      value={{
        language,
        setLanguage,
        t,
        userRole,
        setUserRole,
        isDarkTheme,
        setIsDarkTheme,
        isAudioMuted,
        toggleAudioMute,
        alerts,
        addAlert,
        acknowledgeAlert,
        clearAlerts,
        channels,
        updateChannelStatus,
        hazardReports,
        addHazardReport,
        upvoteHazardReport,
        iotTelemetry,
        updateTelemetry,
        evacuation,
        triggerEvacuation,
        cancelEvacuation,
        activeNavTab,
        setActiveNavTab,
        userPoints,
        addPoints,
      }}
    >
      {children}
    </SafeSightContext.Provider>
  );
};

export const useSafeSight = () => {
  const context = useContext(SafeSightContext);
  if (!context) {
    throw new Error('useSafeSight must be used within a SafeSightProvider');
  }
  return context;
};
