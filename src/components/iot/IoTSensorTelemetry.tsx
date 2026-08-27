import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { soundEngine } from '../../core/speech';

export const IoTSensorTelemetry: React.FC = () => {
  const { t, language, iotTelemetry, updateTelemetry, injectTelemetrySpike, addAlert, isDbConnected } = useSafeSight();
  const [selectedZone, setSelectedZone] = useState<string>('Zone A');
  const [chartHistory, setChartHistory] = useState<
    { time: string; gas: number; temp: number; noise: number; vibration: number }[]
  >([]);

  // Build live rolling history for Recharts
  useEffect(() => {
    const now = new Date();
    const initialPoints = Array.from({ length: 12 }).map((_, idx) => {
      const time = new Date(now.getTime() - (11 - idx) * 3000);
      return {
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        gas: parseFloat((3.5 + Math.random() * 2).toFixed(1)),
        temp: parseFloat((32 + Math.random() * 3).toFixed(1)),
        noise: parseFloat((75 + Math.random() * 8).toFixed(1)),
        vibration: parseFloat((1.8 + Math.random() * 0.8).toFixed(1)),
      };
    });
    setChartHistory(initialPoints);

    const interval = setInterval(() => {
      const currentZoneData = iotTelemetry.find((z) => z.zone === selectedZone) || iotTelemetry[0];
      const newPoint = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        gas: currentZoneData ? currentZoneData.toxicGasH2S : 4.2,
        temp: currentZoneData ? currentZoneData.temperature : 33.5,
        noise: currentZoneData ? currentZoneData.noiseLevel : 78,
        vibration: currentZoneData ? currentZoneData.vibration : 2.1,
      };
      setChartHistory((prev) => [...prev.slice(-15), newPoint]);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedZone, iotTelemetry]);

  // Interlock power cut handler
  const handleToggleInterlock = (zone: string, currentState: boolean) => {
    updateTelemetry(zone, { interlockActive: !currentState });
    soundEngine.playAlertBeep('click');
  };

  // Interactive Spike Injectors for Professor Testing
  const handleInjectSpike = (type: 'gas' | 'temp' | 'noise' | 'normal') => {
    injectTelemetrySpike(selectedZone, type);

    if (type === 'gas') {
      soundEngine.playAlertBeep('critical');
      addAlert({
        title: `CRITICAL: Toxic H2S Gas Threshold Spike (18.8 ppm) in ${selectedZone}`,
        zone: selectedZone,
        location: `${selectedZone} - Catalytic Column #02`,
        riskLevel: 'critical',
        type: 'gas_leak',
        details: {
          th: `เซนเซอร์ตรวจพบก๊าซ H2S พุ่งสูงผิดปกติ 18.8 ppm ใน ${selectedZone} ระบบระบายอากาศฉุกเฉินทำงาน`,
          en: `H2S gas sensor detected spike at 18.8 ppm in ${selectedZone}. Emergency scrubber active.`,
          my: `အဆိပ်ဓာတ်ငွေ့ ၁၈.၈ ppm သို့ ရုတ်တရက် မြင့်တက်လာပါသည်`,
          km: `ឧស្ម័នពុល H2S កើនឡើងដល់ 18.8 ppm បន្ទាន់`,
          lo: `ອາຍພິດ H2S ຂຶ້ນສູງ 18.8 ppm ສຸກເສີນ`,
        },
        audioText: {
          th: `เตือนภัยก๊าซรั่วไหลฉุกเฉินใน ${selectedZone} โปรดถอยห่างจากพื้นที่`,
          en: `Emergency gas leak alert in ${selectedZone}. Evacuate immediate area.`,
          my: `ဓာတ်ငွေ့ယိုစိမ့်မှု အရေးပေါ်သတိပေးချက်! ချက်ချင်း ရှောင်ရှားပါ`,
          km: `ការព្រមានឧស្ម័នលេចធ្លាយបន្ទាន់! សូមជម្លៀសចេញ`,
          lo: `ແຈ້ງເຕືອນອາຍພິດຮົ່ວໄຫຼສຸກເສີນ! ຫຼີກລ່ຽງພື້ນທີ່ທັນທີ`,
        },
        acknowledged: false,
      });
    } else if (type === 'temp' || type === 'noise') {
      soundEngine.playAlertBeep('warning');
    } else {
      soundEngine.playAlertBeep('success');
    }
  };

  const activeZoneData = iotTelemetry.find((z) => z.zone === selectedZone) || iotTelemetry[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
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

        <div className="flex items-center gap-2">
          {isDbConnected && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              ● NeonDB IoT Logger Live
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            MQTT Telemetry 100Hz
          </span>
        </div>
      </div>

      {/* Interactive Spike Simulator Bar for Professors */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Telemetry Anomaly Injector:
          </span>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
          >
            {iotTelemetry.map((z) => (
              <option key={z.id} value={z.zone}>
                {z.zone}: {z.name.split(':')[1] || z.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            onClick={() => handleInjectSpike('gas')}
            className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 font-semibold transition-all cursor-pointer"
          >
            💥 Inject H2S Gas Leak
          </button>
          <button
            onClick={() => handleInjectSpike('temp')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-semibold transition-all cursor-pointer"
          >
            🔥 Inject Overheat (46°C)
          </button>
          <button
            onClick={() => handleInjectSpike('noise')}
            className="px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 font-semibold transition-all cursor-pointer"
          >
            🔊 Inject Noise (96dB)
          </button>
          <button
            onClick={() => handleInjectSpike('normal')}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 font-semibold transition-all cursor-pointer"
          >
            🟢 Reset Normal
          </button>
        </div>
      </div>

      {/* Live Recharts Real-Time Stream Waveform */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Live Streaming Sensor Waveform — {selectedZone}
            </h3>
            <p className="text-xs text-slate-400">
              Time-series streaming telemetry synchronized at 3-second intervals
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            H2S Limit: &lt;10 ppm | Temp Limit: &lt;38°C
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="time" stroke="#64748B" fontSize={10} fontFamily="JetBrains Mono" />
              <YAxis stroke="#64748B" fontSize={10} fontFamily="JetBrains Mono" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
              />
              <Area
                type="monotone"
                dataKey="gas"
                name="Toxic Gas H2S (ppm)"
                stroke="#F59E0B"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorGas)"
              />
              <Area
                type="monotone"
                dataKey="temp"
                name="Temperature (°C)"
                stroke="#06B6D4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTemp)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
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
              onClick={() => setSelectedZone(sensor.zone)}
              className={`glass-panel p-5 rounded-2xl border space-y-4 transition-all cursor-pointer ${
                sensor.status === 'danger'
                  ? 'border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-900/30'
                  : sensor.status === 'warning'
                  ? 'border-amber-500/50 bg-amber-950/10'
                  : selectedZone === sensor.zone
                  ? 'border-cyan-500/50 bg-cyan-950/10'
                  : 'border-slate-800'
              }`}
            >
              {/* Zone Header */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                    {sensor.zone} {selectedZone === sensor.zone && '• SELECTED'}
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
                <div
                  className={`p-3 rounded-xl border ${
                    isH2SWarn
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300'
                  }`}
                >
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
                <div
                  className={`p-3 rounded-xl border ${
                    isTempWarn
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300'
                  }`}
                >
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
                <div
                  className={`p-3 rounded-xl border ${
                    isNoiseWarn
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300'
                  }`}
                >
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
                <div
                  className={`p-3 rounded-xl border ${
                    isVibWarn
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300'
                  }`}
                >
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleInterlock(sensor.zone, sensor.interlockActive);
                    }}
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
