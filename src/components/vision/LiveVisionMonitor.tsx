import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSafeSight } from '../../core/store';
import {
  Camera,
  Grid,
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  Zap,
  CheckCircle2,
  XCircle,
  Download,
  RefreshCw,
  Sparkles,
  FileVideo,
  MonitorPlay,
  Settings2,
} from 'lucide-react';
import { visionEngine, DetectionFrameState, SimulatedScenario } from '../../engine/visionDetector';
import { videoSourceManager } from '../../engine/videoSource';
import { MediaScannerModal } from './MediaScannerModal';
import { soundEngine } from '../../core/speech';

export const LiveVisionMonitor: React.FC = () => {
  const { t, language, addAlert, channels } = useSafeSight();

  const [activeMode, setActiveMode] = useState<'webcam' | 'cctv'>('webcam');
  const [sourceState, setSourceState] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'error'>('idle');
  const [sourceLabel, setSourceLabel] = useState<string>('');
  const [detectionState, setDetectionState] = useState<DetectionFrameState | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);
  const [snapshotCaptured, setSnapshotCaptured] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<SimulatedScenario>('none');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.35);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastDetectionAlertAt = useRef(0);

  const startWebcam = useCallback(async () => {
    if (!videoRef.current) return;
    setSourceState('requesting');
    try {
      const source = await videoSourceManager.startWebcam(videoRef.current);
      setSourceLabel(source.label);
      setSourceState('active');
    } catch {
      setSourceState('denied');
    }
  }, []);

  const startFile = useCallback(async (file: File) => {
    if (!videoRef.current) return;
    setSourceState('requesting');
    try {
      const source = await videoSourceManager.startFile(videoRef.current, file);
      setSourceLabel(source.label);
      setSourceState('active');
    } catch {
      setSourceState('error');
    }
  }, []);

  const stopSource = useCallback(() => {
    videoSourceManager.stop();
    setSourceState('idle');
    setSourceLabel('');
  }, []);

  useEffect(() => {
    if (activeMode === 'webcam') {
      startWebcam();
    } else {
      stopSource();
    }
    return () => {
      if (activeMode !== 'webcam') stopSource();
    };
  }, [activeMode, startWebcam, stopSource]);

  // Real-time AI inference loop
  useEffect(() => {
    if (activeMode !== 'webcam' || sourceState !== 'active') return;

    let animId: number;
    let isRunning = true;

    const runInference = async () => {
      if (videoRef.current && overlayCanvasRef.current && videoRef.current.readyState >= 2) {
        const state = await visionEngine.analyzeFrame(videoRef.current, activeScenario, confidenceThreshold);
        setDetectionState(state);

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

        const target = videoRef.current;
        if (
          overlayCanvasRef.current.width !== target.clientWidth ||
          overlayCanvasRef.current.height !== target.clientHeight
        ) {
          overlayCanvasRef.current.width = target.clientWidth || 640;
          overlayCanvasRef.current.height = target.clientHeight || 360;
        }

        visionEngine.renderOverlay(overlayCanvasRef.current, state, true);
      }

      if (isRunning) animId = requestAnimationFrame(() => void runInference());
    };

    void runInference();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [activeMode, sourceState, activeScenario, confidenceThreshold, addAlert]);

  const handleCaptureSnapshot = () => {
    setSnapshotCaptured(true);
    soundEngine.playAlertBeep('click');

    try {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = 1280;
      snapCanvas.height = 720;
      const ctx = snapCanvas.getContext('2d');

      if (ctx && videoRef.current && videoRef.current.readyState >= 2) {
        ctx.drawImage(videoRef.current, 0, 0, 1280, 720);
        if (detectionState) {
          visionEngine.renderOverlay(snapCanvas, detectionState, true);
          ctx.fillStyle = '#070B14';
          ctx.fillRect(20, 680, 520, 26);
          ctx.fillStyle = '#06B6D4';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(`SAFESIGHT EVIDENCE ARCHIVE • ${new Date().toISOString()} • ${sourceLabel}`, 28, 698);
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

  const handleTriggerScenario = (scenario: SimulatedScenario) => {
    setActiveScenario(scenario);
    soundEngine.playAlertBeep(scenario === 'slip_fall' ? 'critical' : scenario === 'none' ? 'success' : 'warning');
  };

  const ppeStatus = (type: string) => {
    const found = detectionState?.ppeResults.find((item) => item.type === type);
    if (!found) return { text: 'NOT DETECTED', color: 'text-slate-500' };
    return found.isCompliant
      ? { text: 'DETECTED', color: 'text-emerald-400' }
      : { text: 'MISSING', color: 'text-rose-400' };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-panel p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">{t.vision.title}</h2>
            <p className="text-xs text-slate-400">{t.vision.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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

          <button
            onClick={() => setIsMediaModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-300 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">{t.vision.modeMediaScan}</span>
          </button>
        </div>
      </div>

      {activeMode === 'webcam' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 glass-panel rounded-2xl overflow-hidden border border-slate-800 relative bg-slate-950">
            <div className="relative aspect-video w-full flex items-center justify-center overflow-hidden bg-slate-950">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />
              <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

              {sourceState === 'idle' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 p-6 text-center z-10">
                  <Camera className="w-12 h-12 text-slate-600 mb-3" />
                  <p className="text-sm font-medium">Camera is inactive. Click below to start live inference.</p>
                </div>
              )}

              {sourceState === 'requesting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 p-6 text-center z-10">
                  <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
                  <p className="text-sm font-medium">Starting camera or loading video...</p>
                </div>
              )}

              {sourceState === 'denied' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 p-6 text-center z-10">
                  <AlertTriangle className="w-12 h-12 text-rose-400 mb-3" />
                  <p className="text-sm font-medium mb-2">Camera access denied or unavailable.</p>
                  <p className="text-xs text-slate-400 mb-4">Use a video file instead, or enable camera permissions and retry.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/40"
                    >
                      Upload Video File
                    </button>
                    <button
                      onClick={startWebcam}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700"
                    >
                      Retry Camera
                    </button>
                  </div>
                </div>
              )}

              {snapshotCaptured && (
                <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-20">
                  <div className="px-4 py-2 rounded-xl bg-slate-950/90 text-amber-400 text-xs font-bold border border-amber-500/40 shadow-2xl animate-pulse">
                    ✓ AI SNAPSHOT EVIDENCE ARCHIVED & DOWNLOADED
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {sourceState === 'active' ? 'FEED: LIVE' : 'FEED: STANDBY'}
                </span>
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  {detectionState?.modelMessage || 'Inference standby'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) startFile(file);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 flex items-center gap-1"
                >
                  <FileVideo className="w-3.5 h-3.5" /> Use Video File
                </button>
                <button
                  onClick={handleCaptureSnapshot}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-cyan-500/20"
                >
                  <Download className="w-3.5 h-3.5" /> Snapshot Evidence
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">{t.vision.complianceScore}</span>
                <span className={`text-lg font-mono font-extrabold ${(detectionState?.compliancePercentage ?? 100) >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {detectionState?.compliancePercentage ?? 100}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${(detectionState?.compliancePercentage ?? 100) >= 80 ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-gradient-to-r from-rose-600 to-amber-500'}`}
                  style={{ width: `${detectionState?.compliancePercentage ?? 100}%` }}
                />
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                {['helmet', 'vest', 'glasses', 'boots'].map((type) => {
                  const status = ppeStatus(type);
                  return (
                    <div key={type} className="flex items-center justify-between text-xs py-1">
                      <span className="text-slate-300 capitalize">{type === 'helmet' ? '🪖 Hard Hat' : type === 'vest' ? '🦺 Hi-Vis Vest' : type === 'glasses' ? '🥽 Goggles' : '🥾 Boots'}</span>
                      <span className={`font-mono font-bold text-[11px] ${status.color}`}>{status.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Demo Triggers
                </span>
                {activeScenario !== 'none' && (
                  <button onClick={() => handleTriggerScenario('none')} className="text-[10px] text-cyan-400 hover:underline">Reset Normal</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['no_helmet', 'no_vest', 'zone_breach', 'slip_fall'] as SimulatedScenario[]).map((scenario) => (
                  <button
                    key={scenario}
                    onClick={() => handleTriggerScenario(scenario)}
                    className={`p-2 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                      activeScenario === scenario
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {scenario === 'no_helmet' && '⚠️ No Helmet'}
                    {scenario === 'no_vest' && '⚠️ No Vest'}
                    {scenario === 'zone_breach' && '🚨 Zone Breach'}
                    {scenario === 'slip_fall' && '🚑 Slip & Fall'}
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Confidence Threshold</span>
                  <span className="font-mono font-bold text-amber-300">{(confidenceThreshold * 100).toFixed(0)}%</span>
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

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-300">Model Status</span>
              </div>
              <p>{detectionState?.modelMessage || 'Waiting for video source...'}</p>
              <p className="mt-1 text-[11px]">Engine: {detectionState?.engineMode?.toUpperCase() || 'STANDBY'} • FPS: {detectionState?.fps || 0}</p>
            </div>
          </div>
        </div>
      ) : (
        <CCTVMatrix />
      )}

      <MediaScannerModal isOpen={isMediaModalOpen} onClose={() => setIsMediaModalOpen(false)} />
    </div>
  );
};

interface CCTVSourceConfig {
  kind: 'file' | 'url';
  src: string;
  label: string;
}

interface CCTVChannelState {
  state: 'idle' | 'active' | 'error';
  config?: CCTVSourceConfig;
}

const LS_CCTV_SOURCES = 'safesight_cctv_sources';

function loadPersistedSources(): Record<string, CCTVSourceConfig> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(LS_CCTV_SOURCES) || '{}') as Record<string, CCTVSourceConfig>;
  } catch {
    return {};
  }
}

function persistSources(sources: Record<string, CCTVSourceConfig | undefined>) {
  if (typeof window === 'undefined') return;
  try {
    const serializable: Record<string, CCTVSourceConfig> = {};
    Object.entries(sources).forEach(([id, cfg]) => {
      if (cfg && cfg.kind === 'url') serializable[id] = cfg;
      // File object URLs are ephemeral; don't persist them
    });
    localStorage.setItem(LS_CCTV_SOURCES, JSON.stringify(serializable));
  } catch {
    // ignore storage errors
  }
}

const CCTVMatrix: React.FC = () => {
  const { channels } = useSafeSight();
  const [channelStates, setChannelStates] = useState<Record<string, CCTVChannelState>>(() => {
    const persisted = loadPersistedSources();
    return Object.fromEntries(
      channels.map((c) => [
        c.id,
        {
          state: persisted[c.id] ? 'active' : 'idle',
          config: persisted[c.id],
        },
      ])
    );
  });
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const fileUrlRefs = useRef<Record<string, string>>({});

  const setChannelSource = (channelId: string, state: CCTVChannelState) => {
    setChannelStates((prev) => {
      const next = { ...prev, [channelId]: state };
      persistSources(Object.fromEntries(Object.entries(next).map(([id, s]) => [id, s.config])));
      return next;
    });
  };

  const attachSourceToVideo = async (channelId: string, config: CCTVSourceConfig) => {
    const video = videoRefs.current[channelId];
    if (!video) return false;
    try {
      video.src = config.src;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      if (config.kind === 'url') video.crossOrigin = 'anonymous';
      await video.play();
      return true;
    } catch {
      return false;
    }
  };

  const startChannelFile = async (channelId: string, file: File) => {
    // Revoke previous object URL for this channel
    if (fileUrlRefs.current[channelId]) {
      URL.revokeObjectURL(fileUrlRefs.current[channelId]);
    }
    const url = URL.createObjectURL(file);
    fileUrlRefs.current[channelId] = url;
    const ok = await attachSourceToVideo(channelId, { kind: 'file', src: url, label: file.name });
    setChannelSource(channelId, {
      state: ok ? 'active' : 'error',
      config: ok ? { kind: 'file', src: url, label: file.name } : undefined,
    });
  };

  const startChannelUrl = async (channelId: string, rawUrl: string) => {
    const url = rawUrl.trim();
    if (!url) return;
    const ok = await attachSourceToVideo(channelId, { kind: 'url', src: url, label: url });
    setChannelSource(channelId, {
      state: ok ? 'active' : 'error',
      config: ok ? { kind: 'url', src: url, label: url } : undefined,
    });
    if (ok) setUrlInputs((prev) => ({ ...prev, [channelId]: '' }));
  };

  const resetChannel = (channelId: string) => {
    const video = videoRefs.current[channelId];
    if (video) {
      video.pause();
      video.src = '';
      video.load();
    }
    if (fileUrlRefs.current[channelId]) {
      URL.revokeObjectURL(fileUrlRefs.current[channelId]);
      delete fileUrlRefs.current[channelId];
    }
    setChannelSource(channelId, { state: 'idle', config: undefined });
  };

  // Auto-start persisted URL sources on mount
  useEffect(() => {
    const persisted = loadPersistedSources();
    Object.entries(persisted).forEach(([channelId, config]) => {
      const video = videoRefs.current[channelId];
      if (video && config) {
        attachSourceToVideo(channelId, config).then((ok) => {
          setChannelSource(channelId, { state: ok ? 'active' : 'error', config });
        });
      }
    });

    return () => {
      Object.values(fileUrlRefs.current).forEach((url) => URL.revokeObjectURL(url));
      fileUrlRefs.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {channels.map((chan) => {
        const state = channelStates[chan.id];
        return (
          <div key={chan.id} className="glass-panel p-4 rounded-2xl border border-slate-800 relative bg-slate-950 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    state?.state === 'active'
                      ? 'bg-emerald-400 animate-ping'
                      : state?.state === 'error'
                      ? 'bg-rose-400'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="font-bold text-slate-200">{chan.name}</span>
              </div>
              <span className="font-mono text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {chan.resolution}
              </span>
            </div>

            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
              <video
                ref={(el) => {
                  videoRefs.current[chan.id] = el;
                }}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
                onError={() => setChannelSource(chan.id, { state: 'error', config: state?.config })}
              />
              {state?.state !== 'active' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-slate-400 text-center p-4 space-y-3">
                  <MonitorPlay className="w-10 h-10 text-slate-600" />
                  <div>
                    <p className="text-xs mb-1">No live source connected.</p>
                    <p className="text-[10px] text-slate-500">Upload a video file or paste a stream URL.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors">
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) startChannelFile(chan.id, file);
                        }}
                      />
                      Load Video
                    </label>
                    <div className="flex-1 flex items-center gap-1 min-w-0">
                      <input
                        type="text"
                        value={urlInputs[chan.id] || ''}
                        onChange={(e) => setUrlInputs((prev) => ({ ...prev, [chan.id]: e.target.value }))}
                        placeholder="Stream URL"
                        className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') startChannelUrl(chan.id, urlInputs[chan.id] || '');
                        }}
                      />
                      <button
                        onClick={() => startChannelUrl(chan.id, urlInputs[chan.id] || '')}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 text-cyan-300 text-xs font-bold border border-slate-700 hover:bg-slate-700"
                      >
                        Go
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400 truncate max-w-[60%]">
                Source: <strong className="text-slate-200">{state?.config?.label || chan.name}</strong>
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono ${
                    state?.state === 'active' ? 'text-emerald-400' : state?.state === 'error' ? 'text-rose-400' : 'text-slate-500'
                  }`}
                >
                  {state?.state === 'active' ? 'PLAYING' : state?.state === 'error' ? 'ERROR' : 'STANDBY'}
                </span>
                {state?.state !== 'idle' && (
                  <button
                    onClick={() => resetChannel(chan.id)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
