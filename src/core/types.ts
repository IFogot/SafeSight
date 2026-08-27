export type SupportedLanguage = 'th' | 'en' | 'my' | 'km' | 'lo';

export type UserRole = 'safety_officer' | 'worker' | 'eec_admin';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type PPEType = 'helmet' | 'vest' | 'glasses' | 'gloves' | 'boots' | 'mask';

export interface PPEDetectionResult {
  id: string;
  type: PPEType;
  label: string;
  isCompliant: boolean;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height] (normalized 0-1)
  zoneId?: string;
  timestamp: string;
}

export interface BoundingBoxObject {
  id: string;
  class: 'worker' | 'helmet' | 'no_helmet' | 'vest' | 'no_vest' | 'glasses' | 'boots' | 'gloves' | 'mask' | 'forklift' | 'spill' | 'hazard_zone';
  label: string;
  confidence: number;
  color: string;
  x: number; // percentage 0-100
  y: number;
  width: number;
  height: number;
  isViolation: boolean;
}

export interface CCTVChannel {
  id: string;
  name: string;
  location: string;
  zone: string;
  status: 'active' | 'warning' | 'critical' | 'offline';
  fps: number;
  resolution: string;
  peopleCount: number;
  complianceRate: number;
  currentViolations: string[];
  feedType: 'petrochemical' | 'stamping' | 'welding' | 'logistics';
  lastIncidentTime?: string;
}

export interface SafetyAlert {
  id: string;
  timestamp: string;
  title: string;
  zone: string;
  location: string;
  riskLevel: RiskLevel;
  type: 'ppe_violation' | 'restricted_area' | 'fall_detected' | 'gas_leak' | 'high_temp' | 'forklift_proximity' | 'near_miss';
  details: {
    th: string;
    en: string;
    my: string;
    km: string;
    lo: string;
  };
  audioText: {
    th: string;
    en: string;
    my: string;
    km: string;
    lo: string;
  };
  acknowledged: boolean;
  assignedOfficer?: string;
  imageUrl?: string;
  channelId?: string;
}

export interface HazardReport {
  id: string;
  timestamp: string;
  reporterName: string;
  reporterNationality: string;
  language: SupportedLanguage;
  zone: string;
  location: string;
  category: 'spill' | 'electrical' | 'blocked_exit' | 'machine_guard' | 'ppe_missing' | 'height_fall' | 'ergonomics' | 'other';
  title: string;
  descriptionOriginal: string;
  descriptionTranslated: string;
  severity: RiskLevel;
  status: 'pending' | 'investigating' | 'resolved';
  photoUrl?: string;
  audioRecordingUrl?: string;
  upvotes: number;
}

export interface IoTTelemetryPoint {
  id: string;
  zone: string;
  name: string;
  toxicGasH2S: number; // ppm (safe: <10, warn: 10-20, crit: >20)
  toxicGasCO: number; // ppm (safe: <25, warn: 25-50, crit: >50)
  temperature: number; // °C (safe: <38, warn: 38-45, crit: >45)
  humidity: number; // %
  noiseLevel: number; // dBA (safe: <85, warn: 85-95, crit: >95)
  vibration: number; // mm/s (safe: <4.5, warn: 4.5-7.1, crit: >7.1)
  powerConsumption: number; // kW
  interlockActive: boolean;
  status: 'normal' | 'warning' | 'danger';
  lastUpdated: string;
}

export interface EECIndustrialEstate {
  id: string;
  name: string;
  province: 'Chonburi' | 'Rayong' | 'Chachoengsao';
  totalFactories: number;
  monitoredFactories: number;
  totalWorkers: number;
  migrantWorkerRatio: number; // e.g. 0.48
  safetyScore: number; // 0-100
  incidentRatePerThousand: number; // e.g. 4.2
  activeAlerts: number;
  riskStatus: 'low' | 'medium' | 'high';
  coordinates: { x: number; y: number }; // percentage coords on custom EEC map
}

export interface SafetyCourse {
  id: string;
  category: 'basic_ppe' | 'chemical' | 'heights' | 'machinery' | 'fire_evacuation' | 'heat_stress';
  title: {
    th: string;
    en: string;
    my: string;
    km: string;
    lo: string;
  };
  durationMin: number;
  xpPoints: number;
  icon: string;
  completed: boolean;
  score?: number;
  summary: {
    th: string;
    en: string;
    my: string;
    km: string;
    lo: string;
  };
  keyRules: {
    th: string[];
    en: string[];
    my: string[];
    km: string[];
    lo: string[];
  };
  quiz: {
    question: {
      th: string;
      en: string;
      my: string;
      km: string;
      lo: string;
    };
    options: {
      th: string[];
      en: string[];
      my: string[];
      km: string[];
      lo: string[];
    };
    correctIndex: number;
    explanation: {
      th: string;
      en: string;
      my: string;
      km: string;
      lo: string;
    };
  }[];
}

export interface EvacuationPlanState {
  isActive: boolean;
  triggeredAt?: string;
  triggerReason?: string;
  evacuateZones: string[];
  safestAssemblyPoint: string;
  totalPersonnel: number;
  accountedPersonnel: number;
  missingPersonnel: number;
  broadcastChannels: {
    lineOA: boolean;
    smsGateway: boolean;
    factoryPA: boolean;
    iotStrobe: boolean;
  };
}
