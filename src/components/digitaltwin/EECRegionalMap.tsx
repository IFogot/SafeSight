import React, { useState } from 'react';
import { useSafeSight } from '../../core/store';
import { EEC_INDUSTRIAL_ESTATES } from '../../core/mockData';
import { EECIndustrialEstate } from '../../core/types';
import {
  MapPin,
  Building2,
  Users,
  ShieldCheck,
  TrendingDown,
  Globe2 } from 'lucide-react';

export const EECRegionalMap: React.FC = () => {
  const { t } = useSafeSight();
  const [selectedEstate, setSelectedEstate] = useState<EECIndustrialEstate>(
    EEC_INDUSTRIAL_ESTATES[0]
  );
  const [filterProvince, setFilterProvince] = useState<string>('all');

  const filteredEstates =
    filterProvince === 'all'
      ? EEC_INDUSTRIAL_ESTATES
      : EEC_INDUSTRIAL_ESTATES.filter((e) => e.province === filterProvince);

  const totalWorkersAll = EEC_INDUSTRIAL_ESTATES.reduce(
    (sum, e) => sum + e.totalWorkers,
    0
  );
  const totalMigrantWorkersAll = Math.round(
    EEC_INDUSTRIAL_ESTATES.reduce(
      (sum, e) => sum + e.totalWorkers * e.migrantWorkerRatio,
      0
    )
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-panel p-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                {t.eecMap.title}
              </h2>
              <p className="text-xs text-slate-400">{t.eecMap.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Province Filter */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setFilterProvince('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterProvince === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All EEC
          </button>
          <button
            onClick={() => setFilterProvince('Chonburi')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterProvince === 'Chonburi'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.eecMap.chonburi}
          </button>
          <button
            onClick={() => setFilterProvince('Rayong')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterProvince === 'Rayong'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.eecMap.rayong}
          </button>
          <button
            onClick={() => setFilterProvince('Chachoengsao')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterProvince === 'Chachoengsao'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.eecMap.chachoengsao}
          </button>
        </div>
      </div>

      {/* Aggregate Regional Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">{t.eecMap.totalEstates}</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-mono font-bold text-slate-100">
              {EEC_INDUSTRIAL_ESTATES.length} Zones
            </span>
            <span className="text-[10px] font-mono text-cyan-400">1,780 Factories</span>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">{t.eecMap.avgSafetyScore}</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-mono font-bold text-emerald-400">94.7 / 100</span>
            <span className="text-[10px] font-mono text-emerald-400">ISO 45001</span>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">{t.eecMap.incidentRate}</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-mono font-bold text-amber-400">3.95 / 1k</span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center">
              <TrendingDown className="w-3 h-3 mr-0.5" /> -37%
            </span>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">{t.eecMap.migrantLaborCoverage}</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-mono font-bold text-cyan-400">
              {(totalMigrantWorkersAll / 1000).toFixed(0)}k
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              ({((totalMigrantWorkersAll / totalWorkersAll) * 100).toFixed(0)}% of EEC)
            </span>
          </div>
        </div>
      </div>

      {/* Main EEC Map and Estate Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive Stylized Vector Map of EEC Corridor */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-2xl border border-slate-800 relative bg-[#060A14] overflow-hidden">
          <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-400">
            <span className="text-cyan-400 font-bold flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5" />
              EASTERN ECONOMIC CORRIDOR (GISTDA SPATIAL REFERENCE)
            </span>
            <span>PROVINCES: CHONBURI • RAYONG • CHACHOENGSAO</span>
          </div>

          <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950">
            <svg viewBox="0 0 800 500" className="w-full h-full select-none">
              {/* Coastline & Land Boundary Vector */}
              <defs>
                <linearGradient id="gulf-water" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0B132B" />
                  <stop offset="100%" stopColor="#070B18" />
                </linearGradient>
              </defs>

              {/* Gulf of Thailand (Water) */}
              <path
                d="M 0 0 L 300 0 L 260 140 L 220 280 L 320 400 L 400 500 L 0 500 Z"
                fill="url(#gulf-water)"
                stroke="#1E3A5F"
                strokeWidth="1.5"
              />
              <text x="50" y="320" fill="#1E3A5F" fontSize="16" fontWeight="bold" fontFamily="Outfit">
                GULF OF THAILAND (อ่าวไทย)
              </text>

              {/* Land Territory: EEC Region */}
              <path
                d="M 300 0 L 800 0 L 800 500 L 400 500 L 320 400 L 220 280 L 260 140 Z"
                fill="#0F172A"
                stroke="#334155"
                strokeWidth="2"
              />

              {/* Province Borders */}
              {/* Chachoengsao (Top) */}
              <path
                d="M 300 0 L 800 0 L 800 160 L 480 170 L 260 140 Z"
                fill="rgba(59, 130, 246, 0.05)"
                stroke="#3B82F6"
                strokeDasharray="4"
                strokeWidth="1.5"
              />
              <text x="540" y="70" fill="#60A5FA" fontSize="13" fontWeight="bold" fontFamily="Outfit">
                CHACHOENGSAO (ฉะเชิงเทรา)
              </text>

              {/* Chonburi (Mid-West) */}
              <path
                d="M 260 140 L 480 170 L 520 340 L 280 340 L 220 280 Z"
                fill="rgba(6, 182, 212, 0.05)"
                stroke="#06B6D4"
                strokeDasharray="4"
                strokeWidth="1.5"
              />
              <text x="360" y="240" fill="#22D3EE" fontSize="13" fontWeight="bold" fontFamily="Outfit">
                CHONBURI (ชลบุรี)
              </text>

              {/* Rayong (South-East) */}
              <path
                d="M 480 170 L 800 160 L 800 500 L 400 500 L 320 400 L 520 340 Z"
                fill="rgba(245, 158, 11, 0.05)"
                stroke="#F59E0B"
                strokeDasharray="4"
                strokeWidth="1.5"
              />
              <text x="600" y="320" fill="#FBBF24" fontSize="13" fontWeight="bold" fontFamily="Outfit">
                RAYONG (ระยอง)
              </text>

              {/* Major Highway / EEC High-Speed Rail Corridor Line */}
              <path
                d="M 320 30 L 420 180 L 460 300 L 560 410"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="3"
                strokeDasharray="6, 3"
                opacity="0.7"
              />

              {/* Industrial Estate Map Nodes */}
              {filteredEstates.map((estate) => {
                const nodeX = (estate.coordinates.x / 100) * 800;
                const nodeY = (estate.coordinates.y / 100) * 500;
                const isSelected = selectedEstate.id === estate.id;

                return (
                  <g
                    key={estate.id}
                    transform={`translate(${nodeX}, ${nodeY})`}
                    onClick={() => setSelectedEstate(estate)}
                    className="cursor-pointer group"
                  >
                    {/* Pulsing Outer Ring */}
                    <circle
                      r={isSelected ? '22' : '14'}
                      fill={
                        estate.riskStatus === 'high'
                          ? '#EF4444'
                          : estate.riskStatus === 'medium'
                          ? '#F59E0B'
                          : '#10B981'
                      }
                      opacity={isSelected ? '0.35' : '0.15'}
                      className="animate-ping"
                    />

                    {/* Node Circle */}
                    <circle
                      r={isSelected ? '12' : '8'}
                      fill={
                        estate.riskStatus === 'high'
                          ? '#EF4444'
                          : estate.riskStatus === 'medium'
                          ? '#F59E0B'
                          : '#10B981'
                      }
                      stroke="#070B14"
                      strokeWidth="2"
                    />

                    {/* Label */}
                    <rect
                      x="14"
                      y="-12"
                      width={estate.name.length * 7 + 10}
                      height="20"
                      rx="4"
                      fill="#070B14"
                      stroke={isSelected ? '#F59E0B' : '#1E293B'}
                      strokeWidth="1"
                    />
                    <text
                      x="18"
                      y="2"
                      fill={isSelected ? '#FDE047' : '#E2E8F0'}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="Outfit"
                    >
                      {estate.name.split(' (')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected Estate Detail Card */}
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 uppercase">
                {selectedEstate.province}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Score: {selectedEstate.safetyScore}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">
                {selectedEstate.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Connected to SafeSight AI Surveillance Matrix across {selectedEstate.monitoredFactories} of {selectedEstate.totalFactories} factories.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-500" /> Monitored Plants
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {selectedEstate.monitoredFactories} / {selectedEstate.totalFactories}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-500" /> Total Workforce
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {selectedEstate.totalWorkers.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  🌐 Migrant Ratio (MM/KH/LA)
                </span>
                <span className="font-mono font-bold text-cyan-400">
                  {(selectedEstate.migrantWorkerRatio * 100).toFixed(0)}%
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  ⚠️ Active Hazards
                </span>
                <span className="font-mono font-bold text-amber-400">
                  {selectedEstate.activeAlerts} Live Alerts
                </span>
              </div>
            </div>

            <div className="pt-2">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  EEC Regional Safety Compliance
                </div>
                <p className="text-[11px] text-slate-400">
                  Multilingual AI early-warning audio alerts dispatched directly to factory terminals and worker mobiles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
