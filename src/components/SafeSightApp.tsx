'use client';

import React from 'react';
import { SafeSightProvider, useSafeSight } from '@/core/store';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { LiveVisionMonitor } from '@/components/vision/LiveVisionMonitor';
import { FactoryFloorTwin } from '@/components/digitaltwin/FactoryFloorTwin';
import { EECRegionalMap } from '@/components/digitaltwin/EECRegionalMap';
import { HazardReporter } from '@/components/hazard/HazardReporter';
import { PredictiveRiskDashboard } from '@/components/analytics/PredictiveRiskDashboard';
import { IoTSensorTelemetry } from '@/components/iot/IoTSensorTelemetry';
import { WorkerSafetyAcademy } from '@/components/academy/WorkerSafetyAcademy';
import { EmergencyDispatchHub } from '@/components/emergency/EmergencyDispatchHub';
import { WorkerMobileCompanion } from '@/components/mobile/WorkerMobileCompanion';
import { AuditComplianceLog } from '@/components/audit/AuditComplianceLog';
// FIX BUG-01: Removed unused import `Zap`
import { AlertOctagon, Shield } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeNavTab, evacuation, cancelEvacuation } = useSafeSight();

  const renderActiveModule = () => {
    switch (activeNavTab) {
      case 'vision':
        return <LiveVisionMonitor />;
      case 'digitalTwin':
        return <FactoryFloorTwin />;
      case 'eecMap':
        return <EECRegionalMap />;
      case 'hazard':
        return <HazardReporter />;
      case 'predictive':
        return <PredictiveRiskDashboard />;
      case 'iot':
        return <IoTSensorTelemetry />;
      case 'academy':
        return <WorkerSafetyAcademy />;
      case 'emergency':
        return <EmergencyDispatchHub />;
      case 'mobile':
        return <WorkerMobileCompanion />;
      case 'audit':
        return <AuditComplianceLog />;
      default:
        return <LiveVisionMonitor />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070B14] text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar />

      {/* Emergency Sticky Banner if Evacuation is active */}
      {evacuation.isActive && (
        <div className="bg-rose-600 px-4 py-2.5 text-white flex items-center justify-between text-xs font-bold shadow-xl animate-pulse">
          <div className="flex items-center gap-2 max-w-4xl truncate">
            <AlertOctagon className="w-5 h-5 shrink-0 animate-spin" />
            <span>
              EMERGENCY INDUSTRIAL EVACUATION IN PROGRESS: {evacuation.triggerReason}
            </span>
          </div>
          <button
            onClick={cancelEvacuation}
            className="px-3 py-1 rounded bg-white text-slate-950 text-[11px] font-extrabold hover:bg-slate-200 cursor-pointer"
          >
            Clear Alarm
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-3 sm:p-4 gap-4">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Dynamic Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto pb-12">
          {renderActiveModule()}
        </main>
      </div>

      {/* Footer */}
      <footer className="glass-panel border-t border-slate-800/80 py-4 px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-200">SafeSight EEC Enterprise</span>
            <span className="text-slate-500">|</span>
            <span className="italic text-slate-400">
              &quot;มองเห็นความเสี่ยง ป้องกันก่อนเกิดเหตุ&quot;
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500 flex-wrap justify-center">
            <span>GISTDA</span>
            <span>•</span>
            <span>EECO</span>
            <span>•</span>
            <span>KU Sriracha</span>
            <span>•</span>
            <span>depa</span>
            <span>•</span>
            <span>ECAM LaSalle</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const SafeSightApp: React.FC = () => {
  return (
    <SafeSightProvider>
      <MainLayout />
    </SafeSightProvider>
  );
};

export default SafeSightApp;
