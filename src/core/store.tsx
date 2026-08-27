import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { createAlert as dbCreateAlert, getAlerts as dbGetAlerts, acknowledgeAlert as dbAcknowledgeAlert, clearAllAlerts as dbClearAllAlerts } from '@/actions/alerts';
import { createHazardReport as dbCreateHazardReport, getHazardReports as dbGetHazardReports, upvoteHazardReport as dbUpvoteHazardReport } from '@/actions/hazards';
import { createAuditEntry as dbCreateAuditEntry } from '@/actions/audit';
import { addWorkerPoints as dbAddWorkerPoints } from '@/actions/workers';
import { recordIoTReading as dbRecordIoTReading } from '@/actions/iot';

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
  isDbConnected: boolean;
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
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);

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

  // 1. Initial Data Sync from NeonDB on Client Mount
  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseState() {
      try {
        const [dbAlerts, dbHazards] = await Promise.all([
          dbGetAlerts(50).catch(() => []),
          dbGetHazardReports(50).catch(() => []),
        ]);

        if (isMounted) {
          if (dbAlerts && dbAlerts.length > 0) {
            setIsDbConnected(true);
            const mappedAlerts: SafetyAlert[] = dbAlerts.map((a) => {
              const d = (a.details as Record<string, string>) || {};
              const aud = (a.audioText as Record<string, string>) || {};
              return {
                id: a.alertId,
                title: a.title,
                zone: a.zone,
                location: a.location || `${a.zone} Station`,
                riskLevel: a.riskLevel as SafetyAlert['riskLevel'],
                type: a.type as SafetyAlert['type'],
                details: {
                  th: d.th || a.title,
                  en: d.en || a.title,
                  my: d.my || a.title,
                  km: d.km || a.title,
                  lo: d.lo || a.title,
                },
                audioText: {
                  th: aud.th || a.title,
                  en: aud.en || a.title,
                  my: aud.my || a.title,
                  km: aud.km || a.title,
                  lo: aud.lo || a.title,
                },
                acknowledged: Boolean(a.acknowledged),
                timestamp: a.createdAt ? new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
              };
            });
            setAlerts(mappedAlerts);
          }

          if (dbHazards && dbHazards.length > 0) {
            setIsDbConnected(true);
            const mappedHazards: HazardReport[] = dbHazards.map((h) => ({
              id: h.reportId,
              reporterName: h.reporterName,
              reporterNationality: h.reporterNationality || 'Thailand',
              language: h.language as SupportedLanguage,
              zone: h.zone,
              location: h.location || h.zone,
              category: h.category as HazardReport['category'],
              title: h.title,
              descriptionOriginal: h.descriptionOriginal || '',
              descriptionTranslated: h.descriptionTranslated || '',
              severity: h.severity as HazardReport['severity'],
              status: (h.status as HazardReport['status']) || 'pending',
              upvotes: h.upvotes || 0,
              timestamp: h.createdAt ? new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
            }));
            setHazardReports(mappedHazards);
          }
        }
      } catch (err) {
        console.warn('NeonDB initial fetch notice (using local state):', err);
      }
    }

    loadDatabaseState();

    return () => {
      isMounted = false;
    };
  }, []);

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

  // Add Alert with Optimistic UI + NeonDB Persistence + Audit Logging
  const addAlert = useCallback((alertData: Omit<SafetyAlert, 'id' | 'timestamp'>) => {
    const alertId = `alt-${Date.now().toString().slice(-4)}`;
    const newAlert: SafetyAlert = {
      ...alertData,
      id: alertId,
      timestamp: 'Just now',
    };
    setAlerts((prev) => [newAlert, ...prev]);

    // Asynchronously persist to NeonDB & Audit Log
    dbCreateAlert({
      title: alertData.title,
      zone: alertData.zone,
      location: alertData.location,
      riskLevel: alertData.riskLevel,
      type: alertData.type,
      details: alertData.details,
      audioText: alertData.audioText,
    }).catch((e) => console.warn('DB alert persist warning:', e));

    dbCreateAuditEntry({
      actor: 'AI Vision Engine / IoT Sentinel',
      action: `Safety Alert Generated: ${alertData.title}`,
      module: 'Live Monitor',
      zone: alertData.zone,
      severity: alertData.riskLevel,
      details: `Alert type: ${alertData.type} in ${alertData.zone}. Multilingual audio broadcast dispatched.`,
      isoReference: 'ISO 45001:2018 §8.1.2',
    }).catch(() => {});

    // Trigger audio alarm & speech
    if (!isAudioMuted) {
      soundEngine.playAlertBeep(newAlert.riskLevel === 'critical' ? 'critical' : 'warning');
      const spokenText = newAlert.audioText[language] || newAlert.audioText.th;
      setTimeout(() => {
        soundEngine.speakText(spokenText, language);
      }, 300);
    }
  }, [isAudioMuted, language]);

  // Acknowledge Alert with Optimistic UI + NeonDB Persistence
  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
    dbAcknowledgeAlert(id).catch(() => {});
    dbCreateAuditEntry({
      actor: `Safety Officer (${userRole})`,
      action: `Acknowledged Safety Alert #${id}`,
      module: 'Alerts Hub',
      severity: 'low',
      details: `User verified protocol compliance for alert ${id}.`,
      isoReference: 'ISO 45001 §8.2',
    }).catch(() => {});
    soundEngine.playAlertBeep('click');
  };

  const clearAlerts = () => {
    setAlerts([]);
    dbClearAllAlerts().catch(() => {});
    soundEngine.playAlertBeep('click');
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

  // Add Hazard Report with Optimistic UI + NeonDB Persistence + Audit Logging
  const addHazardReport = (
    reportData: Omit<HazardReport, 'id' | 'timestamp' | 'upvotes'>
  ) => {
    const reportId = `HZ-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newReport: HazardReport = {
      ...reportData,
      id: reportId,
      timestamp: 'Just now',
      upvotes: 1,
    };
    setHazardReports((prev) => [newReport, ...prev]);
    soundEngine.playAlertBeep('success');

    // Async DB persist
    dbCreateHazardReport({
      reporterName: reportData.reporterName,
      reporterNationality: reportData.reporterNationality,
      language: reportData.language,
      zone: reportData.zone,
      location: reportData.location,
      category: reportData.category,
      title: reportData.title,
      descriptionOriginal: reportData.descriptionOriginal,
      descriptionTranslated: reportData.descriptionTranslated,
      severity: reportData.severity,
    }).catch((e) => console.warn('DB hazard persist notice:', e));

    dbCreateAuditEntry({
      actor: reportData.reporterName,
      action: `Submitted Hazard Report: ${reportData.title}`,
      module: 'Hazard Reporter',
      zone: reportData.zone,
      severity: reportData.severity,
      details: `Near-miss ticket logged in ${reportData.zone} (${reportData.category}). Auto-translation generated.`,
      isoReference: 'Thai OSH Act B.E. 2554 §32',
    }).catch(() => {});
  };

  const upvoteHazardReport = (id: string) => {
    setHazardReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r))
    );
    dbUpvoteHazardReport(id).catch(() => {});
    soundEngine.playAlertBeep('click');
  };

  const updateTelemetry = (zone: string, data: Partial<IoTTelemetryPoint>) => {
    setIotTelemetry((prev) =>
      prev.map((item) => {
        if (item.zone === zone) {
          const updated = { ...item, ...data, lastUpdated: 'Just now' };

          // If dangerous readings are updated, record to DB
          if (data.toxicGasH2S !== undefined || data.temperature !== undefined) {
            dbRecordIoTReading({
              sensorId: `SENS-${zone.replace(/\s+/g, '-').toUpperCase()}`,
              sensorType: data.toxicGasH2S !== undefined ? 'h2s' : 'temp',
              zone,
              value: data.toxicGasH2S !== undefined ? (data.toxicGasH2S as number) : (data.temperature as number),
              unit: data.toxicGasH2S !== undefined ? 'ppm' : '°C',
              isAlarm: updated.status === 'danger',
            }).catch(() => {});
          }

          return updated;
        }
        return item;
      })
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

    // Persist to NeonDB Audit
    dbCreateAuditEntry({
      actor: `Emergency Dispatch Coordinator (${userRole})`,
      action: `CRITICAL INDUSTRIAL EVACUATION INITIATED`,
      module: 'Emergency Hub',
      zone: 'ALL ZONES (A-D)',
      severity: 'critical',
      details: `Reason: ${reason}. Automated multi-channel broadcast activated across LINE OA, SMS, Factory PA Horns.`,
      isoReference: 'ISO 45001:2018 §8.2 Emergency Preparedness',
    }).catch(() => {});

    const emergencySpeech: Record<SupportedLanguage, string> = {
      th: 'ประกาศฉุกเฉิน! ขอให้พนักงานทุกคนหยุดการทำงานและอพยพไปยังจุดรวมพล A ทันที',
      en: 'Emergency evacuation alert! All personnel immediately evacuate to Muster Point A',
      my: 'အရေးပေါ် ရွှေ့ပြောင်းရေး သတိပေးချက်! အလုပ်သမားအားလုံး လူစုဝေးရာနေရာ A သို့ ချက်ချင်း ထွက်ခွာပါ',
      km: 'ការជូនដំណឹងជម្លៀសបន្ទាន់! បុគ្គលិកទាំងអស់ត្រូវជម្លៀសទៅកាន់ចំណុចប្រមូលផ្តុំ A ជាបន្ទាន់',
      lo: 'ປະກາດສຸກເສີນ! ຂໍໃຫ້ພະນັກງານທຸກຄົນອົບພະຍົບໄປຍັງຈຸດລວມພົນ A ທັນທີ',
    };

    setTimeout(() => {
      soundEngine.speakText(emergencySpeech[language] || emergencySpeech.th, language);
    }, 1200);
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

    dbCreateAuditEntry({
      actor: `Safety Commander (${userRole})`,
      action: `Evacuation Cleared — Facility Returned to Normal Operations`,
      module: 'Emergency Hub',
      zone: 'ALL ZONES',
      severity: 'low',
      details: 'All personnel safely accounted at Muster Points. Hazard contained.',
      isoReference: 'ISO 45001 §8.2',
    }).catch(() => {});
  };

  const addPoints = (pts: number) => {
    setUserPoints((prev) => prev + pts);
    dbAddWorkerPoints(1, pts).catch(() => {});
    soundEngine.playAlertBeep('success');
  };

  // Periodic realistic IoT fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setIotTelemetry((prev) =>
        prev.map((pt) => {
          const deltaGas = (Math.random() - 0.5) * 0.2;
          const deltaTemp = (Math.random() - 0.5) * 0.15;
          const deltaNoise = (Math.random() - 0.5) * 1.2;
          const deltaPower = (Math.random() - 0.5) * 1.5;

          const newGas = Math.max(0, parseFloat((pt.toxicGasH2S + deltaGas).toFixed(1)));
          const newTemp = Math.max(20, parseFloat((pt.temperature + deltaTemp).toFixed(1)));
          const newNoise = Math.max(60, parseFloat((pt.noiseLevel + deltaNoise).toFixed(1)));
          const newPower = Math.max(10, parseFloat((pt.powerConsumption + deltaPower).toFixed(1)));

          const isDanger = newGas > 15 || newTemp > 42 || newNoise > 92;
          const isWarning = newGas > 10 || newTemp > 38 || newNoise > 85;

          return {
            ...pt,
            toxicGasH2S: newGas,
            temperature: newTemp,
            noiseLevel: newNoise,
            powerConsumption: newPower,
            status: isDanger ? 'danger' : isWarning ? 'warning' : 'normal',
          };
        })
      );
    }, 4000);

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
        isDbConnected,
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
