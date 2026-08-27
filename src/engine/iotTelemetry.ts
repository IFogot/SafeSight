import { IoTTelemetryPoint } from '../core/types';

export interface SensorProfile {
  toxicGasH2S: { baseline: number; variance: number };
  toxicGasCO: { baseline: number; variance: number };
  temperature: { baseline: number; variance: number };
  humidity: { baseline: number; variance: number };
  noiseLevel: { baseline: number; variance: number };
  vibration: { baseline: number; variance: number };
  powerConsumption: { baseline: number; variance: number };
}

export interface ZoneProfile {
  zone: string;
  name: string;
  sensor: SensorProfile;
}

export interface TelemetryReading {
  toxicGasH2S: number;
  toxicGasCO: number;
  temperature: number;
  humidity: number;
  noiseLevel: number;
  vibration: number;
  powerConsumption: number;
  status: 'normal' | 'warning' | 'danger';
}

const ZONE_PROFILES: ZoneProfile[] = [
  {
    zone: 'Zone A',
    name: 'Reactor: Catalytic Cracking Unit',
    sensor: {
      toxicGasH2S: { baseline: 3.8, variance: 0.6 },
      toxicGasCO: { baseline: 18, variance: 4 },
      temperature: { baseline: 34.5, variance: 1.2 },
      humidity: { baseline: 62, variance: 5 },
      noiseLevel: { baseline: 78, variance: 3 },
      vibration: { baseline: 2.1, variance: 0.4 },
      powerConsumption: { baseline: 42, variance: 3 },
    },
  },
  {
    zone: 'Zone B',
    name: 'Stamping Press Bay',
    sensor: {
      toxicGasH2S: { baseline: 1.2, variance: 0.3 },
      toxicGasCO: { baseline: 8, variance: 2 },
      temperature: { baseline: 31.0, variance: 0.8 },
      humidity: { baseline: 55, variance: 4 },
      noiseLevel: { baseline: 88, variance: 4 },
      vibration: { baseline: 3.8, variance: 0.7 },
      powerConsumption: { baseline: 68, variance: 5 },
    },
  },
  {
    zone: 'Zone C',
    name: 'Welding & Robotic Enclosure',
    sensor: {
      toxicGasH2S: { baseline: 2.1, variance: 0.4 },
      toxicGasCO: { baseline: 22, variance: 5 },
      temperature: { baseline: 36.2, variance: 1.5 },
      humidity: { baseline: 48, variance: 6 },
      noiseLevel: { baseline: 82, variance: 3 },
      vibration: { baseline: 1.9, variance: 0.3 },
      powerConsumption: { baseline: 54, variance: 4 },
    },
  },
  {
    zone: 'Zone D',
    name: 'Logistics & High-Bay Warehouse',
    sensor: {
      toxicGasH2S: { baseline: 0.8, variance: 0.2 },
      toxicGasCO: { baseline: 6, variance: 1.5 },
      temperature: { baseline: 29.5, variance: 0.7 },
      humidity: { baseline: 58, variance: 4 },
      noiseLevel: { baseline: 72, variance: 3 },
      vibration: { baseline: 1.4, variance: 0.3 },
      powerConsumption: { baseline: 36, variance: 3 },
    },
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gaussianNoise(): number {
  // Box-Muller transform for realistic sensor noise
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2.0 * Math.PI * u2);
}

function round1(value: number): number {
  return parseFloat(value.toFixed(1));
}

function deriveStatus(reading: TelemetryReading): TelemetryReading['status'] {
  if (
    reading.toxicGasH2S > 20 ||
    reading.toxicGasCO > 50 ||
    reading.temperature > 45 ||
    reading.noiseLevel > 95 ||
    reading.vibration > 7.1
  ) {
    return 'danger';
  }
  if (
    reading.toxicGasH2S >= 10 ||
    reading.toxicGasCO >= 25 ||
    reading.temperature >= 38 ||
    reading.noiseLevel >= 85 ||
    reading.vibration >= 4.5
  ) {
    return 'warning';
  }
  return 'normal';
}

export function createDefaultTelemetryPoints(): IoTTelemetryPoint[] {
  return ZONE_PROFILES.map((profile, idx) => ({
    id: `iot-${idx + 1}`,
    zone: profile.zone,
    name: profile.name,
    toxicGasH2S: round1(profile.sensor.toxicGasH2S.baseline),
    toxicGasCO: round1(profile.sensor.toxicGasCO.baseline),
    temperature: round1(profile.sensor.temperature.baseline),
    humidity: round1(profile.sensor.humidity.baseline),
    noiseLevel: round1(profile.sensor.noiseLevel.baseline),
    vibration: round1(profile.sensor.vibration.baseline),
    powerConsumption: round1(profile.sensor.powerConsumption.baseline),
    interlockActive: false,
    status: 'normal',
    lastUpdated: 'Just now',
  }));
}

export function generateNextReading(
  current: IoTTelemetryPoint,
  overrides: Partial<TelemetryReading> = {}
): TelemetryReading {
  const profile = ZONE_PROFILES.find((p) => p.zone === current.zone);
  if (!profile) {
    return {
      toxicGasH2S: current.toxicGasH2S,
      toxicGasCO: current.toxicGasCO,
      temperature: current.temperature,
      humidity: current.humidity,
      noiseLevel: current.noiseLevel,
      vibration: current.vibration,
      powerConsumption: current.powerConsumption,
      status: current.status,
    };
  }

  const s = profile.sensor;
  const next: TelemetryReading = {
    toxicGasH2S:
      overrides.toxicGasH2S !== undefined
        ? overrides.toxicGasH2S
        : clamp(
            round1(current.toxicGasH2S + gaussianNoise() * s.toxicGasH2S.variance * 0.5),
            0,
            50
          ),
    toxicGasCO:
      overrides.toxicGasCO !== undefined
        ? overrides.toxicGasCO
        : clamp(
            round1(current.toxicGasCO + gaussianNoise() * s.toxicGasCO.variance * 0.5),
            0,
            120
          ),
    temperature:
      overrides.temperature !== undefined
        ? overrides.temperature
        : clamp(
            round1(current.temperature + gaussianNoise() * s.temperature.variance * 0.5),
            20,
            70
          ),
    humidity:
      overrides.humidity !== undefined
        ? overrides.humidity
        : clamp(
            round1(current.humidity + gaussianNoise() * s.humidity.variance * 0.5),
            20,
            95
          ),
    noiseLevel:
      overrides.noiseLevel !== undefined
        ? overrides.noiseLevel
        : clamp(
            round1(current.noiseLevel + gaussianNoise() * s.noiseLevel.variance * 0.5),
            50,
            110
          ),
    vibration:
      overrides.vibration !== undefined
        ? overrides.vibration
        : clamp(
            round1(current.vibration + gaussianNoise() * s.vibration.variance * 0.5),
            0,
            12
          ),
    powerConsumption:
      overrides.powerConsumption !== undefined
        ? overrides.powerConsumption
        : clamp(
            round1(current.powerConsumption + gaussianNoise() * s.powerConsumption.variance * 0.5),
            5,
            120
          ),
    status: 'normal',
  };

  next.status = deriveStatus(next);
  return next;
}

export type TelemetryUpdateCallback = (points: IoTTelemetryPoint[]) => void;

export interface IoTTelemetryEngine {
  start: (tickMs?: number) => void;
  stop: () => void;
  injectSpike: (zone: string, type: 'gas' | 'temp' | 'noise' | 'normal') => void;
}

export function createIoTTelemetryEngine(
  getPoints: () => IoTTelemetryPoint[],
  onUpdate: TelemetryUpdateCallback
): IoTTelemetryEngine {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const tick = () => {
    const points = getPoints().map((pt) => {
      const next = generateNextReading(pt);
      return {
        ...pt,
        ...next,
        lastUpdated: 'Just now',
      };
    });
    onUpdate(points);
  };

  return {
    start(tickMs = 4000) {
      if (intervalId) return;
      tick();
      intervalId = setInterval(tick, tickMs);
    },
    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    injectSpike(zone, type) {
      const points = getPoints().map((pt) => {
        if (pt.zone !== zone) return pt;
        let overrides: Partial<TelemetryReading> = {};
        if (type === 'gas') {
          overrides = { toxicGasH2S: 18.8, status: 'danger' };
        } else if (type === 'temp') {
          overrides = { temperature: 46.5, status: 'warning' };
        } else if (type === 'noise') {
          overrides = { noiseLevel: 96.2, status: 'warning' };
        } else {
          const profile = ZONE_PROFILES.find((p) => p.zone === zone);
          overrides = profile
            ? {
                toxicGasH2S: round1(profile.sensor.toxicGasH2S.baseline),
                temperature: round1(profile.sensor.temperature.baseline),
                noiseLevel: round1(profile.sensor.noiseLevel.baseline),
                vibration: round1(profile.sensor.vibration.baseline),
                status: 'normal',
              }
            : { status: 'normal' };
        }
        const next = generateNextReading(pt, overrides);
        return { ...pt, ...next, lastUpdated: 'Just now' };
      });
      onUpdate(points);
    },
  };
}
