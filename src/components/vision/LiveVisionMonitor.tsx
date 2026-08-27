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
} from 'lucide-react';
import { visionEngine, DetectionFrameState } from '../../engine/visionDetector';
import { cctvSimulator } from '../../engine/cctvStreamSim';
import { MediaScannerModal } from './MediaScannerModal';
import { soundEngine } from '../../core/speech';

export const LiveVisionMonitor: React.FC = () => {
  const { t, language, addAlert, channels } = useSafeSight();

  const [activeMode, setActiveMode] = useState<'webcam' | 'cctv'>('webcam');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('cam-01');
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [simulatedViolation, setSimulatedViolation] = useState<
    'none' | 'no_helmet' | 'no_vest' | 'zone_breach' | 'slip_fall'
  >('none');
  const [detectionState, setDetectionState] = useState<DetectionFrameState | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);
  const [snapshotCaptured, setSnapshotCaptured] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const cctvCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

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

  // Real-time AI inference loop on webcam or synthetic stream
  useEffect(() => {
    if (activeMode !== 'webcam') return;

    let animId: number;

    const runInference = () => {
      const targetElement = isWebcamActive && videoRef.current ? videoRef.current : webcamCanvasRef.current;

      if (targetElement && overlayCanvasRef.current) {
        // Run vision engine
        const state = visionEngine.analyzeFrame(targetElement, simulatedViolation);
        setDetectionState(state);

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

      animId = requestAnimationFrame(runInference);
    };

    runInference();

    return () => cancelAnimationFrame(animId);
  }, [activeMode, isWebcamActive, simulatedViolation]);

  // Start CCTV streams in Matrix mode
  useEffect(() => {
    if (activeMode !== 'cctv') return;

    const cleanups: (() => void)[] = [];

    channels.forEach((chan) => {
      const canvas = cctvCanvasRefs.current[chan.id];
      if (canvas) {
        const violation =
          chan.id === 'cam-02' ? simulatedViolation : 'none';
        const cleanup = cctvSimulator.startStream(canvas, chan.feedType, violation);
        cleanups.push(cleanup);
      }
    });

    return () => {
      cleanups.forEach((c) => c());
    };
  }, [activeMode, channels, simulatedViolation]);

  // Trigger violation handler
  const handleTriggerViolation = (
    type: 'no_helmet' | 'no_vest' | 'zone_breach' | 'slip_fall'
  ) => {
    setSimulatedViolation(type);

    const alertTitles: Record<string, string> = {
      no_helmet: 'PPE Breach: Missing Safety Helmet',
      no_vest: 'PPE Breach: Missing Hi-Vis Vest',
      zone_breach: 'Restricted Machine Zone Perimeter Breach',
      slip_fall: 'CRITICAL: Slip & Fall (Man Down Detected)',
    };

    const alertDetails: Record<string, Record<string, string>> = {
      no_helmet: {
        th: 'ตรวจพบคนงานไม่สวมหมวกนิรภัยในพื้นที่ปฏิบัติการ',
        en: 'Worker detected without hard hat in active zone',
        my: 'လုပ်ငန်းခွင်အတွင်း ဦးထုပ်မပါသော အလုပ်သမားအား တွေ့ရှိရပါသည်',
        km: 'បានរកឃើញកម្មករមិនពាក់មួកសុវត្ថិភាពក្នុងតំបន់ធ្វើការ',
        lo: 'ກວດພົບຄົນງານບໍ່ໃສ່ໝວກນິລະໄພໃນພື້ນທີ່ເຮັດວຽກ',
      },
      no_vest: {
        th: 'ตรวจพบคนงานไม่สวมเสื้อสะท้อนแสงในเขตก่อสร้าง/ขนส่ง',
        en: 'Worker detected without hi-vis vest in loading zone',
        my: 'ရောင်ပြန်အင်္ကျီ မပါသော အလုပ်သမားအား တွေ့ရှိရပါသည်',
        km: 'បានរកឃើញកម្មករមិនពាក់អាវឆ្លុះពន្លឺក្នុងតំបន់ដឹកជញ្ជូន',
        lo: 'ກວດພົບຄົນງານບໍ່ໃສ່ເສື້ອສະທ້ອນແສງ',
      },
      zone_breach: {
        th: 'ตรวจพบการบุกรุกรัศมีอันตรายของแขนกลเครื่องจักร',
        en: 'Danger zone intrusion within 1.5m of robotic machinery',
        my: 'စက်ယန္တရား အန္တရာယ်ဇုန်အတွင်းသို့ ဝင်ရောက်မှု တွေ့ရှိရပါသည်',
        km: 'បានរកឃើញការចូលទៅជិតម៉ាស៊ីនគ្រោះថ្នាក់',
        lo: 'ກວດພົບການບຸກລຸກເຂດອັນຕະລາຍຂອງເຄື່ອງຈັກ',
      },
      slip_fall: {
        th: 'ตรวจพบคนงานลื่นล้มฉับพลัน ขอทีมปฐมพยาบาลเข้าช่วยเหลือทันที',
        en: 'Sudden slip & fall detected! Dispatch first-aid team immediately',
        my: 'အလုပ်သမား ချော်လဲမှု တွေ့ရှိရသဖြင့် အရေးပေါ် ကူညီပါ',
        km: 'បានរកឃើញកម្មកររអិលដួលជាបន្ទាន់ សូមជួយសង្គ្រោះ',
        lo: 'ກວດພົບຄົນງານມື່ນລົ້ມສຸກເສີນ ຂໍທີມຊ່ວຍເຫຼືອດ່ວນ',
      },
    };

    addAlert({
      title: alertTitles[type],
      zone: 'Zone B: Metal Stamping',
      location: 'Workstation #04',
      riskLevel: type === 'slip_fall' ? 'critical' : 'high',
      type: type === 'slip_fall' ? 'fall_detected' : 'ppe_violation',
      details: {
        th: alertDetails[type].th,
        en: alertDetails[type].en,
        my: alertDetails[type].my,
        km: alertDetails[type].km,
        lo: alertDetails[type].lo,
      },
      audioText: {
        th: alertDetails[type].th,
        en: alertDetails[type].en,
        my: alertDetails[type].my,
        km: alertDetails[type].km,
        lo: alertDetails[type].lo,
      },
      acknowledged: false,
    });
  };

  // Snapshot evidence capture
  const handleCaptureSnapshot = () => {
    setSnapshotCaptured(true);
    soundEngine.playAlertBeep('click');
    setTimeout(() => setSnapshotCaptured(false), 2000);
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
            <div className="relative aspect-video w-full flex items-center justify-center overflow-hidden bg-slate-950">
              {/* Device Webcam Feed */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover ${
                  isWebcamActive ? 'block' : 'hidden'
                }`}
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
                      Webcam not connected or permission denied. Running high-precision
                      synthetic EEC factory simulation stream with real-time AI inference.
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
                  <div className="px-4 py-2 rounded-xl bg-slate-950/90 text-amber-400 text-xs font-bold border border-amber-500/40">
                    ✓ AI SNAPSHOT EVIDENCE ARCHIVED
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Stream Action Bar */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  FEED: LIVE (ZONE B)
                </span>
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  RESOLUTION: 1080P | LATENCY: 24ms
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCaptureSnapshot}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.vision.takeSnapshot}</span>
                </button>

                <button
                  onClick={() =>
                    soundEngine.speakText(
                      t.vision.title + ': ' + t.status.compliant,
                      language
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Test Voice Alert</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right AI Stats & PPE Verification Telemetry */}
          <div className="space-y-4">
            {/* Compliance Gauge Card */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {t.vision.complianceScore}
                </span>
                <span
                  className={`text-lg font-mono font-extrabold ${
                    (detectionState?.compliancePercentage || 100) >= 80
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {detectionState?.compliancePercentage || 100}%
                </span>
              </div>

              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    (detectionState?.compliancePercentage || 100) >= 80
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                      : 'bg-gradient-to-r from-rose-600 to-amber-500'
                  }`}
                  style={{ width: `${detectionState?.compliancePercentage || 100}%` }}
                />
              </div>

              {/* Real-time Checklist of PPE items */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    🪖 {t.vision.ppeHardHat}
                  </span>
                  {simulatedViolation === 'no_helmet' ? (
                    <span className="font-mono text-rose-400 font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> MISSING
                    </span>
                  ) : (
                    <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 97% OK
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    🦺 {t.vision.ppeVest}
                  </span>
                  {simulatedViolation === 'no_vest' ? (
                    <span className="font-mono text-rose-400 font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> MISSING
                    </span>
                  ) : (
                    <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 95% OK
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    🥽 {t.vision.ppeGlasses}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 89% OK
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    🧤 {t.vision.ppeGloves}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 92% OK
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    🥾 {t.vision.ppeBoots}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 96% OK
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Simulation Trigger Panel */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Simulation Triggers
                </span>
                {simulatedViolation !== 'none' && (
                  <button
                    onClick={() => setSimulatedViolation('none')}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                  >
                    Reset Normal
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleTriggerViolation('no_helmet')}
                  className={`p-2 rounded-xl border text-left font-medium transition-all ${
                    simulatedViolation === 'no_helmet'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  ⚠️ No Helmet
                </button>

                <button
                  onClick={() => handleTriggerViolation('no_vest')}
                  className={`p-2 rounded-xl border text-left font-medium transition-all ${
                    simulatedViolation === 'no_vest'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  ⚠️ No Vest
                </button>

                <button
                  onClick={() => handleTriggerViolation('zone_breach')}
                  className={`p-2 rounded-xl border text-left font-medium transition-all ${
                    simulatedViolation === 'zone_breach'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  🚨 Zone Breach
                </button>

                <button
                  onClick={() => handleTriggerViolation('slip_fall')}
                  className={`p-2 rounded-xl border text-left font-medium transition-all ${
                    simulatedViolation === 'slip_fall'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  🚑 Slip & Fall
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 4-Split Industrial CCTV Matrix */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((chan) => (
            <div
              key={chan.id}
              className="glass-panel rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col justify-between"
            >
              {/* CCTV Camera Header */}
              <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold text-slate-200">{chan.name}</span>
                </div>
                <span className="font-mono text-cyan-400 font-semibold">{chan.resolution}</span>
              </div>

              {/* Animated Stream Canvas */}
              <div className="relative aspect-video w-full bg-slate-950">
                <canvas
                  id={`canvas-${chan.id}`}
                  ref={(el) => {
                    cctvCanvasRefs.current[chan.id] = el;
                  }}
                  width={640}
                  height={360}
                  className="w-full h-full object-cover"
                />

                {/* Status Overlay Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {chan.currentViolations.length > 0 ? (
                    <span className="px-2 py-1 rounded-md bg-rose-500/90 text-white font-mono font-bold text-[10px] shadow-lg animate-pulse">
                      BREACH DETECTED
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-md bg-emerald-500/80 text-slate-950 font-mono font-bold text-[10px]">
                      PPE 98% OK
                    </span>
                  )}
                </div>
              </div>

              {/* CCTV Footer Controls */}
              <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Workers: <strong className="text-slate-200">{chan.peopleCount}</strong> |
                  Compliance: <strong className="text-emerald-400">{chan.complianceRate}%</strong>
                </span>

                <button
                  onClick={() => {
                    handleTriggerViolation('no_helmet');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                >
                  Simulate Trigger
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media Scanner Modal */}
      <MediaScannerModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
      />
    </div>
  );
};
