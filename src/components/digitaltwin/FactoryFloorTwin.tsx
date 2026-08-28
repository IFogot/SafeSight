import React, { useState } from 'react';
import { useSafeSight } from '../../core/store';
import {
  Layers,
  Flame,
  Users,
  Activity,
  Navigation,
  CheckCircle,
  Radio } from 'lucide-react';

export const FactoryFloorTwin: React.FC = () => {
  const { t } = useSafeSight();

  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showWorkers, setShowWorkers] = useState<boolean>(true);
  const [showSensors, setShowSensors] = useState<boolean>(true);
  const [showEvacuationRoutes, setShowEvacuationRoutes] = useState<boolean>(true);
  const [selectedZone, setSelectedZone] = useState<string | null>('Zone B');

  // Simulated worker beacon positions
  const workers = [
    { id: 'w-1', name: 'Aung Min (MM)', role: 'Stamping Operator', x: 38, y: 48, zone: 'Zone B', status: 'compliant' },
    { id: 'w-2', name: 'Sok Dara (KH)', role: 'Welding Tech', x: 62, y: 35, zone: 'Zone C', status: 'compliant' },
    { id: 'w-3', name: 'Khamphanh (LA)', role: 'Logistics Handler', x: 74, y: 72, zone: 'Zone D', status: 'warning' },
    { id: 'w-4', name: 'Somchai P. (TH)', role: 'Chief Safety Officer', x: 22, y: 32, zone: 'Zone A', status: 'compliant' },
    { id: 'w-5', name: 'Kyaw Zin (MM)', role: 'Valve Inspector', x: 26, y: 44, zone: 'Zone A', status: 'compliant' },
    { id: 'w-6', name: 'Chhay Heng (KH)', role: 'Assembly Tech', x: 58, y: 52, zone: 'Zone C', status: 'compliant' },
  ];

  const zoneData: Record<
    string,
    { title: string; risk: 'low' | 'medium' | 'high'; workersCount: number; sensor: string }
  > = {
    'Zone A': {
      title: t.digitalTwin.zoneA,
      risk: 'medium',
      workersCount: 4,
      sensor: 'H2S: 4.8 ppm | Temp: 34.5°C' },
    'Zone B': {
      title: t.digitalTwin.zoneB,
      risk: 'high',
      workersCount: 6,
      sensor: 'Noise: 89.2 dBA | Vib: 5.8 mm/s' },
    'Zone C': {
      title: t.digitalTwin.zoneC,
      risk: 'low',
      workersCount: 3,
      sensor: 'Laser Interlock: Active | Temp: 31.8°C' },
    'Zone D': {
      title: t.digitalTwin.zoneD,
      risk: 'medium',
      workersCount: 8,
      sensor: 'Forklift Telemetry: 2 Active | Speed: Safe' } };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-panel p-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                {t.digitalTwin.title}
              </h2>
              <p className="text-xs text-slate-400">{t.digitalTwin.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showHeatmap
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{t.digitalTwin.heatMapToggle}</span>
          </button>

          <button
            onClick={() => setShowWorkers(!showWorkers)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showWorkers
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.digitalTwin.workersBadge}</span>
          </button>

          <button
            onClick={() => setShowSensors(!showSensors)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showSensors
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{t.digitalTwin.iotSensorsToggle}</span>
          </button>

          <button
            onClick={() => setShowEvacuationRoutes(!showEvacuationRoutes)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showEvacuationRoutes
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{t.digitalTwin.evacuationRoutes}</span>
          </button>
        </div>
      </div>

      {/* 2.5D Interactive Floor Plan Canvas / SVG View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 glass-panel rounded-2xl p-4 border border-slate-800 relative bg-[#060A12] overflow-hidden">
          {/* Top Floor Metadata Bar */}
          <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              DIGITAL TWIN: RAYONG HEAVY INDUSTRIAL FACILITY #04
            </span>
            <span>SCALE: 1:200 | ELEVATION: GROUND FLOOR</span>
          </div>

          {/* Interactive SVG Factory Floor Map */}
          <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-slate-800/80 bg-gradient-to-b from-slate-950 to-slate-900">
            <svg
              viewBox="0 0 1000 625"
              className="w-full h-full select-none"
            >
              {/* Floor Plan Grid */}
              <defs>
                <pattern id="floor-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                </pattern>

                {/* Heatmap radial gradients */}
                <radialGradient id="heat-zone-b" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(239, 68, 68, 0.45)" />
                  <stop offset="60%" stopColor="rgba(245, 158, 11, 0.25)" />
                  <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
                </radialGradient>

                <radialGradient id="heat-zone-a" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(245, 158, 11, 0.35)" />
                  <stop offset="80%" stopColor="rgba(245, 158, 11, 0)" />
                </radialGradient>
              </defs>

              <rect width="1000" height="625" fill="url(#floor-grid)" />

              {/* Main Exterior Wall Boundary */}
              <rect x="50" y="40" width="900" height="545" fill="none" stroke="#334155" strokeWidth="4" rx="12" />

              {/* Zone A: Petrochemical Column Unit (Top Left) */}
              <g
                onClick={() => setSelectedZone('Zone A')}
                className="cursor-pointer transition-opacity hover:opacity-90"
              >
                <rect
                  x="70"
                  y="60"
                  width="410"
                  height="240"
                  fill={selectedZone === 'Zone A' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(15, 23, 42, 0.6)'}
                  stroke={selectedZone === 'Zone A' ? '#06B6D4' : '#1E293B'}
                  strokeWidth="2"
                  rx="8"
                />
                {showHeatmap && (
                  <circle cx="275" cy="180" r="140" fill="url(#heat-zone-a)" pointerEvents="none" />
                )}
                <text x="90" y="95" fill="#38BDF8" fontSize="16" fontWeight="bold" fontFamily="Outfit">
                  ZONE A: PETROCHEMICAL REACTOR
                </text>
                <text x="90" y="120" fill="#94A3B8" fontSize="11" fontFamily="JetBrains Mono">
                  Risk Level: Moderate (Gas Telemetry Active)
                </text>

                {/* Machinery shapes */}
                <circle cx="160" cy="180" r="40" fill="#1E293B" stroke="#475569" strokeWidth="2" />
                <circle cx="280" cy="180" r="40" fill="#1E293B" stroke="#475569" strokeWidth="2" />
                <line x1="200" y1="180" x2="240" y2="180" stroke="#06B6D4" strokeWidth="6" />
              </g>

              {/* Zone B: Heavy Stamping Line (Bottom Left) */}
              <g
                onClick={() => setSelectedZone('Zone B')}
                className="cursor-pointer transition-opacity hover:opacity-90"
              >
                <rect
                  x="70"
                  y="320"
                  width="410"
                  height="245"
                  fill={selectedZone === 'Zone B' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(15, 23, 42, 0.6)'}
                  stroke={selectedZone === 'Zone B' ? '#EF4444' : '#1E293B'}
                  strokeWidth="2"
                  rx="8"
                />
                {showHeatmap && (
                  <circle cx="275" cy="440" r="160" fill="url(#heat-zone-b)" pointerEvents="none" />
                )}
                <text x="90" y="355" fill="#F87171" fontSize="16" fontWeight="bold" fontFamily="Outfit">
                  ZONE B: HEAVY STAMPING & PRESS
                </text>
                <text x="90" y="380" fill="#94A3B8" fontSize="11" fontFamily="JetBrains Mono">
                  Risk Level: HIGH (Hydraulic Noise & Crush Zone)
                </text>

                {/* Stamping Presses */}
                <rect x="130" y="410" width="80" height="90" fill="#334155" stroke="#EF4444" strokeWidth="2" rx="4" />
                <rect x="260" y="410" width="80" height="90" fill="#334155" stroke="#EF4444" strokeWidth="2" rx="4" />
              </g>

              {/* Zone C: Robotic Welding Cell (Top Right) */}
              <g
                onClick={() => setSelectedZone('Zone C')}
                className="cursor-pointer transition-opacity hover:opacity-90"
              >
                <rect
                  x="510"
                  y="60"
                  width="420"
                  height="240"
                  fill={selectedZone === 'Zone C' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.6)'}
                  stroke={selectedZone === 'Zone C' ? '#10B981' : '#1E293B'}
                  strokeWidth="2"
                  rx="8"
                />
                <text x="530" y="95" fill="#34D399" fontSize="16" fontWeight="bold" fontFamily="Outfit">
                  ZONE C: ROBOTIC WELDING & LASER
                </text>
                <text x="530" y="120" fill="#94A3B8" fontSize="11" fontFamily="JetBrains Mono">
                  Risk Level: Nominal (Enclosure Interlocks 100%)
                </text>

                {/* Robotic Pedestals */}
                <circle cx="640" cy="180" r="30" fill="#1E293B" stroke="#10B981" strokeWidth="2" />
                <circle cx="780" cy="180" r="30" fill="#1E293B" stroke="#10B981" strokeWidth="2" />
              </g>

              {/* Zone D: High-Bay Warehouse & Logistics (Bottom Right) */}
              <g
                onClick={() => setSelectedZone('Zone D')}
                className="cursor-pointer transition-opacity hover:opacity-90"
              >
                <rect
                  x="510"
                  y="320"
                  width="420"
                  height="245"
                  fill={selectedZone === 'Zone D' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(15, 23, 42, 0.6)'}
                  stroke={selectedZone === 'Zone D' ? '#F59E0B' : '#1E293B'}
                  strokeWidth="2"
                  rx="8"
                />
                <text x="530" y="355" fill="#FBBF24" fontSize="16" fontWeight="bold" fontFamily="Outfit">
                  ZONE D: LOGISTICS & LOADING BAY
                </text>
                <text x="530" y="380" fill="#94A3B8" fontSize="11" fontFamily="JetBrains Mono">
                  Risk Level: Moderate (Forklift Traffic Active)
                </text>

                {/* Racks & Aisle */}
                <rect x="540" y="410" width="160" height="30" fill="#334155" />
                <rect x="540" y="460" width="160" height="30" fill="#334155" />
                <rect x="740" y="410" width="160" height="80" fill="#1E293B" stroke="#F59E0B" strokeDasharray="4" />
              </g>

              {/* Main Corridors & Green Evacuation Routes */}
              {showEvacuationRoutes && (
                <g pointerEvents="none">
                  {/* North-South Main Corridor */}
                  <path
                    d="M 495 50 L 495 575"
                    stroke="#10B981"
                    strokeWidth="8"
                    strokeDasharray="12, 6"
                    strokeLinecap="round"
                    className="animate-pulse"
                  />
                  {/* East-West Aisle */}
                  <path
                    d="M 60 310 L 940 310"
                    stroke="#10B981"
                    strokeWidth="8"
                    strokeDasharray="12, 6"
                    strokeLinecap="round"
                    className="animate-pulse"
                  />

                  {/* Exit Arrows */}
                  <text x="470" y="35" fill="#10B981" fontSize="14" fontWeight="bold" fontFamily="JetBrains Mono">
                    ▲ MUSTER POINT A (NORTH EXIT)
                  </text>
                  <text x="470" y="605" fill="#10B981" fontSize="14" fontWeight="bold" fontFamily="JetBrains Mono">
                    ▼ MUSTER POINT B (SOUTH EXIT)
                  </text>
                </g>
              )}

              {/* Worker Location Beacons */}
              {showWorkers &&
                workers.map((w) => (
                  <g
                    key={w.id}
                    transform={`translate(${(w.x / 100) * 1000}, ${(w.y / 100) * 625})`}
                    className="cursor-pointer"
                  >
                    <circle
                      r="12"
                      fill={w.status === 'compliant' ? '#06B6D4' : '#EF4444'}
                      opacity="0.3"
                      className="animate-ping"
                    />
                    <circle
                      r="8"
                      fill={w.status === 'compliant' ? '#06B6D4' : '#EF4444'}
                      stroke="#070B14"
                      strokeWidth="2"
                    />
                    <text
                      x="12"
                      y="4"
                      fill="#F8FAFC"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono"
                    >
                      {w.name}
                    </text>
                  </g>
                ))}

              {/* IoT Sensor Nodes */}
              {showSensors && (
                <g>
                  {/* Zone A Sensor */}
                  <g transform="translate(360, 100)">
                    <rect width="90" height="24" rx="4" fill="#0F172A" stroke="#06B6D4" strokeWidth="1" />
                    <text x="8" y="16" fill="#38BDF8" fontSize="10" fontFamily="JetBrains Mono">
                      📡 H2S: 4.8ppm
                    </text>
                  </g>

                  {/* Zone B Sensor */}
                  <g transform="translate(360, 360)">
                    <rect width="95" height="24" rx="4" fill="#0F172A" stroke="#EF4444" strokeWidth="1" />
                    <text x="8" y="16" fill="#F87171" fontSize="10" fontFamily="JetBrains Mono">
                      📡 89.2 dBA ⚠️
                    </text>
                  </g>

                  {/* Zone D Sensor */}
                  <g transform="translate(800, 360)">
                    <rect width="95" height="24" rx="4" fill="#0F172A" stroke="#F59E0B" strokeWidth="1" />
                    <text x="8" y="16" fill="#FBBF24" fontSize="10" fontFamily="JetBrains Mono">
                      📡 2 Forklifts
                    </text>
                  </g>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Right Zone Details & Telemetry Inspection */}
        <div className="space-y-4">
          {selectedZone && zoneData[selectedZone] ? (
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">
                  Zone Inspector
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                    zoneData[selectedZone].risk === 'high'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : zoneData[selectedZone].risk === 'medium'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {zoneData[selectedZone].risk.toUpperCase()} RISK
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  {zoneData[selectedZone].title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {zoneData[selectedZone].sensor}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Active Workers</span>
                  <p className="font-mono font-bold text-slate-100 mt-0.5">
                    {zoneData[selectedZone].workersCount} Personnel
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 text-[10px]">CCTV Camera</span>
                  <p className="font-mono font-bold text-cyan-400 mt-0.5">
                    {selectedZone === 'Zone A'
                      ? 'CAM-01'
                      : selectedZone === 'Zone B'
                      ? 'CAM-02'
                      : selectedZone === 'Zone C'
                      ? 'CAM-03'
                      : 'CAM-04'}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold text-slate-300">
                  Personnel In Zone:
                </span>
                {workers
                  .filter((w) => w.zone === selectedZone)
                  .map((w) => (
                    <div
                      key={w.id}
                      className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">{w.name}</span>
                        <p className="text-[10px] text-slate-400">{w.role}</p>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        100% PPE OK
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
              Click any zone on the floor plan to inspect telemetry and personnel.
            </div>
          )}

          {/* Quick Evacuation Status Card */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>Emergency Escape Wayfinding</span>
            </div>
            <p className="text-xs text-slate-400">
              AI algorithm continuously calculates least-congestion escape paths avoiding active chemical and machinery danger zones.
            </p>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>North & South Exits 100% Clear</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
