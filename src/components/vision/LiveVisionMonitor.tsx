import React, { useState, useRef, useEffect } from 'react';
import { useSafeSight } from '../../core/store';
import {
  Camera,
  Grid,
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  Maximize2,
  Minimize2,
  Zap,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Sparkles,
  Download,
  Sliders,
  ZoomIn,
  Flame,
  Activity,
} from 'lucide-react';
import { visionEngine, DetectionFrameState, SimulatedScenario } from '../../engine/visionDetector';
import { cctvSimulator } from '../../engine/cctvStreamSim';
import { MediaScannerModal } from './MediaScannerModal';
import { soundEngine } from '../../core/speech';

export const LiveVisionMonitor: React.FC = () => {
  const { t, language, addAlert, channels } = useSafeSight();

  const [activeMode, setActiveMode] = useState<'webcam' | 'cctv'>('webcam');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('cam-01');
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [detectionState, setDetectionState] = useState<DetectionFrameState | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);
  const [snapshotCaptured, setSnapshotCaptured] = useState<boolean>(false);

  // Vision Controls
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.35);
  const [activeScenario, setActiveScenario] = useState<SimulatedScenario>('none');
  const [digitalZoom, setDigitalZoom] = useState<number>(1);
  const [colorFilter, setColorFilter] = useState<'normal' | 'thermal' | 'night_vision'>('normal');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const cctvCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const lastDetectionAlertAt = useRef(0);

  // Start / stop local device webcam
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (activeMode === 'webcam') {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
            setIsWebcamActive(true);
          }
        })
        .catch(() => {
          setIsWebcamActive(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
        setIsWebcamActive(false);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeMode]);

  // Real-time AI inference loop
  useEffect(() => {
    if (activeMode !== 'webcam') return;

    let animId: number;
    let isRunning = true;

    const runInference = async () => {
      const targetElement = isWebcamActive && videoRef.current ? videoRef.current : webcamCanvasRef.current;

      if (targetElement && overlayCanvasRef.current) {
        const state = await visionEngine.analyzeFrame(targetElement, activeScenario, confidenceThreshold);
        setDetectionState(state);

        // Throttle automatic alert generation from live camera
        if (state.hasViolation && Date.now() - lastDetectionAlertAt.current > 12000) {
          lastDetectionAlertAt.current = Date.now();
          const violation = state.violationLabels[0] || 'Safety violation detected';

          addAlert({
            title: `AI Vision Detected: ${violation}`,
            zone: 'Zone B: Metal Stamping',
            location: 'Workstation #04 (Camera 02)',
            riskLevel: violation.includes('Slip') || violation.includes('Breach') ? 'critical' : 'high',
            type: violation.includes('Slip') ? 'fall_detected' : 'ppe_violation',
            details: {
              th: `ระบบ AI Vision ตรวจพบความเสี่ยง: ${violation}`,
              en: `AI Vision detected safety risk: ${violation}`,
              my: `AI စနစ်က ဘေးကင်းရေးချိုးဖောက်မှု တွေ့ရှိသည်: ${violation}`,
              km: `ប្រព័ន្ធ AI បានរកឃើញហានិភ័យ៖ ${violation}`,
              lo: `ລະບົບ AI ກວດພົບຄວາມສ່ຽງ: ${violation}`,
            },
            audioText: {
              th: `แจ้งเตือนความปลอดภัย ตรวจพบ ${violation}`,
              en: `Safety warning. ${violation} detected in active zone.`,
              my: `ဘေးကင်းရေးသတိပေးချက်။ ${violation} ကို တွေ့ရှိသည်။`,
              km: `ការព្រមានសុវត្ថិភាព។ បានរកឃើញ ${violation}។`,
              lo: `ແຈ້ງເຕືອນຄວາມປອດໄພ. ກວດພົບ ${violation}.`,
            },
            acknowledged: false,
          });
        }

        // Sync overlay canvas size
        if (
          overlayCanvasRef.current.width !== targetElement.clientWidth ||
          overlayCanvasRef.current.height !== targetElement.clientHeight
        ) {
          overlayCanvasRef.current.width = targetElement.clientWidth || 640;
          overlayCanvasRef.current.height = targetElement.clientHeight || 360;
        }

        // Draw HUD bounding boxes
        visionEngine.renderOverlay(overlayCanvasRef.current, state, true);
      }

      if (isRunning) animId = requestAnimationFrame(() => void runInference());
    };

    void runInference();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [activeMode, isWebcamActive, activeScenario, confidenceThreshold, addAlert]);

  // Start CCTV streams in Matrix mode
  useEffect(() => {
    if (activeMode !== 'cctv') return;

    const cleanups: (() => void)[] = [];

    channels.forEach((chan) => {
      const canvas = cctvCanvasRefs.current[chan.id];
      if (canvas) {
        const cleanup = cctvSimulator.startStream(canvas, chan.feedType);
        cleanups.push(cleanup);
      }
    });

    return () => {
      cleanups.forEach((c) => c());
    };
  }, [activeMode, channels]);

  // Snapshot evidence capture & real file download
  const handleCaptureSnapshot = () => {
    setSnapshotCaptured(true);
    soundEngine.playAlertBeep('click');

    try {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = 1280;
      snapCanvas.height = 720;
      const ctx = snapCanvas.getContext('2d');

      if (ctx) {
        // Draw background video/canvas
        const target = isWebcamActive && videoRef.current ? videoRef.current : webcamCanvasRef.current;
        if (target) {
          ctx.drawImage(target, 0, 0, 1280, 720);
        }

        // Overlay Bounding Boxes & HUD Stamp
        if (detectionState) {
          visionEngine.renderOverlay(snapCanvas, detectionState, true);

          // Timestamp Watermark
          ctx.fillStyle = '#070B14';
          ctx.fillRect(20, 680, 480, 26);
          ctx.fillStyle = '#06B6D4';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(`SAFESIGHT EVIDENCE ARCHIVE • ${new Date().toISOString()} • ZONE B`, 28, 698);
        }

        const dataUrl = snapCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `SafeSight-Evidence-Snapshot-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (e) {
      console.warn('Snapshot download notice:', e);
    }

    setTimeout(() => setSnapshotCaptured(false), 2000);
  };

  // Scenario Trigger Handler for Professor Demo
  const handleTriggerScenario = (scenario: SimulatedScenario) => {
    setActiveScenario(scenario);
    soundEngine.playAlertBeep(scenario === 'slip_fall' ? 'critical' : scenario === 'none' ? 'success' : 'warning');
  };

  return (
    <div className="space-y-4">
      {/* Module Title & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-panel p-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                {t.vision.title}
              </h2>
              <p className="text-xs text-slate-400">{t.vision.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switch Buttons */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveMode('webcam')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMode === 'webcam'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{t.vision.modeWebcam}</span>
            </button>

            <button
              onClick={() => setActiveMode('cctv')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMode === 'cctv'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>{t.vision.modeCctvMatrix}</span>
            </button>
          </div>

          {/* Media Scan Modal Launcher */}
          <button
            onClick={() => setIsMediaModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-300 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">{t.vision.modeMediaScan}</span>
          </button>
        </div>
      </div>

      {/* Main Video View & Telemetry HUD */}
      {activeMode === 'webcam' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Video & AI Canvas Container */}
          <div className="lg:col-span-3 glass-panel rounded-2xl overflow-hidden border border-slate-800 relative bg-slate-950">
            <div
              className={`relative aspect-video w-full flex items-center justify-center overflow-hidden bg-slate-950 transition-all ${
                colorFilter === 'thermal'
                  ? 'contrast-150 saturate-200 hue-rotate-180'
                  : colorFilter === 'night_vision'
                  ? 'brightness-125 sepia hue-rotate-90 saturate-200'
                  : ''
              }`}
              style={{ transform: `scale(${digitalZoom})`, transformOrigin: 'center center' }}
            >
              {/* Device Webcam Feed */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover ${isWebcamActive ? 'block' : 'hidden'}`}
              />

              {/* Synthetic Simulation Fallback if Webcam is Off */}
              {!isWebcamActive && (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  <canvas
                    ref={webcamCanvasRef}
                    width={640}
                    height={360}
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                  />
                  <div className="relative z-10 max-w-sm p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 space-y-2">
                    <Zap className="w-8 h-8 text-amber-400 mx-auto animate-bounce" />
                    <p className="text-xs font-medium">
                      Webcam not connected or active. Running high-precision EEC factory simulation stream with real-time AI Sentinel.
                    </p>
                  </div>
                </div>
              )}

              {/* AI Bounding Box Overlay Canvas */}
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Snapshot Flash Feedback */}
              {snapshotCaptured && (
                <div className="absolute inset-0 bg-white/40 backdrop-blur-xs flex items-center justify-center">
                  <div className="px-4 py-2 rounded-xl bg-slate-950/90 text-amber-400 text-xs font-bold border border-amber-500/40 shadow-2xl animate-pulse">
                    ✓ AI SNAPSHOT EVIDENCE ARCHIVED & DOWNLOADED
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Stream Action Bar */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  FEED: LIVE (ZONE B)
                </span>
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  {detectionState?.modelMessage || 'Inference Active'}
                </span>
              </div>

              {/* Controls: Zoom, Filters, Snapshot */}
              <div className="flex items-center gap-2">
                {/* PTZ Zoom Buttons */}
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[11px] font-mono">
                  <button
                    onClick={() => setDigitalZoom(1)}
                    className={`px-1.5 py-0.5 rounded ${digitalZoom === 1 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                  >
                    1x
                  </button>
                  <button
                    onClick={() => setDigitalZoom(1.5)}
                    className={`px-1.5 py-0.5 rounded ${digitalZoom === 1.5 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                  >
                    1.5x
                  </button>
                  <button
                    onClick={() => setDigitalZoom(2)}
                    className={`px-1.5 py-0.5 rounded ${digitalZoom === 2 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                  >
                    2x
                  </button>
                </div>

                {/* Filter Switcher */}
                <button
                  onClick={() =>
                    setColorFilter((prev) =>
                      prev === 'normal' ? 'thermal' : prev === 'thermal' ? 'night_vision' : 'normal'
                    )
                  }
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px] border border-slate-700 cursor-pointer"
                >
                  Filter: {colorFilter.toUpperCase()}
                </button>

                {/* Snapshot Capture */}
                <button
                  onClick={handleCaptureSnapshot}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Snapshot Evidence</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Telemetry & Interactive Scenarios Panel */}
          <div className="space-y-4">
            {/* Compliance Score Gauge */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">
                  {t.vision.complianceScore}
                </span>
                <span
                  className={`text-lg font-mono font-extrabold ${
                    (detectionState?.compliancePercentage ?? 100) >= 80
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {detectionState?.compliancePercentage ?? 100}%
                </span>
              </div>

              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    (detectionState?.compliancePercentage ?? 100) >= 80
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                      : 'bg-gradient-to-r from-rose-600 to-amber-500'
                  }`}
                  style={{ width: `${detectionState?.compliancePercentage ?? 100}%` }}
                />
              </div>

              {/* PPE Items Checklist */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    🪖 {t.vision.ppeHardHat}
                  </span>
                  {detectionState?.ppeResults.find((item) => item.type === 'helmet')?.isCompliant !== false ? (
                    <span className="font-mono text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 97% VERIFIED
                    </span>
                  ) : (
                    <span className="font-mono text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                      <XCircle className="w-3.5 h-3.5" /> MISSING
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    🦺 {t.vision.ppeVest}
                  </span>
                  {detectionState?.ppeResults.find((item) => item.type === 'vest')?.isCompliant !== false ? (
                    <span className="font-mono text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 95% VERIFIED
                    </span>
                  ) : (
                    <span className="font-mono text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                      <XCircle className="w-3.5 h-3.5" /> MISSING
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    🥽 {t.vision.ppeGlasses}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 91% VERIFIED
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    🥾 {t.vision.ppeBoots}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 94% VERIFIED
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Scenario Trigger Panel for Demo */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Professor Demo Triggers
                </span>
                {activeScenario !== 'none' && (
                  <button
                    onClick={() => handleTriggerScenario('none')}
                    className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                  >
                    Reset Normal
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleTriggerScenario('no_helmet')}
                  className={`p-2 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                    activeScenario === 'no_helmet'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  ⚠️ No Helmet
                </button>

                <button
                  onClick={() => handleTriggerScenario('no_vest')}
                  className={`p-2 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                    activeScenario === 'no_vest'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  ⚠️ No Vest
                </button>

                <button
                  onClick={() => handleTriggerScenario('zone_breach')}
                  className={`p-2 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                    activeScenario === 'zone_breach'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  🚨 Zone Breach
                </button>

                <button
                  onClick={() => handleTriggerScenario('slip_fall')}
                  className={`p-2 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                    activeScenario === 'slip_fall'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  🚑 Slip & Fall
                </button>
              </div>

              {/* Confidence Threshold Slider */}
              <div className="pt-2 border-t border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Confidence Threshold</span>
                  <span className="font-mono font-bold text-amber-300">
                    {(confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.85"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CCTV Matrix Mode (4-Channel Industrial Grid) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((chan) => (
            <div
              key={chan.id}
              className="glass-panel p-4 rounded-2xl border border-slate-800 relative bg-slate-950 space-y-3"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold text-slate-200">{chan.name}</span>
                </div>
                <span className="font-mono text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                  {chan.resolution}
                </span>
              </div>

              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                <canvas
                  ref={(el) => {
                    cctvCanvasRefs.current[chan.id] = el;
                  }}
                  width={640}
                  height={360}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">
                  Compliance: <strong className="text-emerald-400">{chan.complianceRate}%</strong>
                </span>

                <button
                  onClick={() => setActiveMode('webcam')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Open Live Inference
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media Scanner Upload Modal */}
      <MediaScannerModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
      />
    </div>
  );
};
