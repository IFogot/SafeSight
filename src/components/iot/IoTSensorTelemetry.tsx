import React from 'react';
import { useSafeSight } from '../../core/store';
import {
  Activity,
  Gauge,
  Thermometer,
  Volume2,
  Zap,
  ShieldAlert,
  Power,
  RefreshCw,
  Flame,
} from 'lucide-react';
import { soundEngine } from '../../core/speech';

export const IoTSensorTelemetry: React.FC = () => {
  const { t, iotTelemetry, updateTelemetry } = useSafeSight();

  const handleToggleInterlock = (zone: string, currentState: boolean) => {
    updateTelemetry(zone, { interlockActive: !currentState });
    soundEngine.playAlertBeep('click');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              {t.iot.title}
            </h2>
            <p className="text-xs text-slate-400">{t.iot.subtitle}</p>
          </div>
        </div>

        <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          MQTT WebSocket Telemetry 100Hz
        </span>
      </div>

      {/* 4-Zone Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {iotTelemetry.map((sensor) => {
          const isH2SWarn = sensor.toxicGasH2S >= 10;
          const isTempWarn = sensor.temperature >= 38;
          const isNoiseWarn = sensor.noiseLevel >= 85;
          const isVibWarn = sensor.vibration >= 4.5;

          return (
            <div
              key={sensor.id}
              className={`glass-panel p-5 rounded-2xl border space-y-4 transition-all ${
                sensor.status === 'danger'
                  ? 'border-rose-500/60 bg-rose-950/20'
                  : sensor.status === 'warning'
                  ? 'border-amber-500/50 bg-amber-950/10'
                  : 'border-slate-800'
              }`}
            >
              {/* Zone Header */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                    {sensor.zone}
                  </span>
                  <h3 className="text-sm font-bold text-slate-100">{sensor.name}</h3>
                </div>

                <span
                  className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full uppercase ${
                    sensor.status === 'danger'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                      : sensor.status === 'warning'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {sensor.status}
                </span>
              </div>

              {/* Gauges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {/* H2S Gas */}
                <div className={`p-3 rounded-xl border ${
                  isH2SWarn
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" /> H2S Gas
                    </span>
                    <span className="text-[9px] font-mono">&lt;10 ppm</span>
                  </div>
                  <div className="text-lg font-mono font-bold">
                    {sensor.toxicGasH2S} <span className="text-[10px] font-normal">ppm</span>
                  </div>
                </div>

                {/* Temperature */}
                <div className={`p-3 rounded-xl border ${
                  isTempWarn
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-rose-400" /> Temp
                    </span>
                    <span className="text-[9px] font-mono">&lt;38°C</span>
                  </div>
                  <div className="text-lg font-mono font-bold">
                    {sensor.temperature} <span className="text-[10px] font-normal">°C</span>
                  </div>
                </div>

                {/* Acoustic Noise */}
                <div className={`p-3 rounded-xl border ${
                  isNoiseWarn
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3 h-3 text-blue-400" /> Noise
                    </span>
                    <span className="text-[9px] font-mono">&lt;85 dBA</span>
                  </div>
                  <div className="text-lg font-mono font-bold">
                    {sensor.noiseLevel} <span className="text-[10px] font-normal">dBA</span>
                  </div>
                </div>

                {/* Machine Vibration */}
                <div className={`p-3 rounded-xl border ${
                  isVibWarn
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-purple-400" /> Vibration
                    </span>
                    <span className="text-[9px] font-mono">&lt;4.5 mm/s</span>
                  </div>
                  <div className="text-lg font-mono font-bold">
                    {sensor.vibration} <span className="text-[10px] font-normal">mm/s</span>
                  </div>
                </div>

                {/* Power Draw */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-400" /> Power
                    </span>
                    <span className="text-[9px] font-mono">Load</span>
                  </div>
                  <div className="text-lg font-mono font-bold">
                    {sensor.powerConsumption} <span className="text-[10px] font-normal">kW</span>
                  </div>
                </div>

                {/* Interlock Safety Trigger */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Safety Interlock
                  </span>
                  <button
                    onClick={() => handleToggleInterlock(sensor.zone, sensor.interlockActive)}
                    className={`mt-1 py-1 px-2 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      sensor.interlockActive
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{sensor.interlockActive ? 'EMERGENCY CUT' : 'ARMED / OK'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
