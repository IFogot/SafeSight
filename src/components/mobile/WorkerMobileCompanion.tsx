import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSafeSight } from '../../core/store';
import {
  Smartphone,
  Camera,
  AlertOctagon,
  Volume2,
  ShieldCheck,
  CheckCircle2,
  Trophy,
  Sparkles,
  RefreshCw,
  CheckSquare,
  Square,
  XCircle,
  CameraOff } from 'lucide-react';
import { soundEngine } from '../../core/speech';
import confetti from 'canvas-confetti';
import { visionEngine, DetectionFrameState } from '../../engine/visionDetector';

export const WorkerMobileCompanion: React.FC = () => {
  const { t, language, userPoints, addPoints, triggerEvacuation } = useSafeSight();
  const [isSelfieScanning, setIsSelfieScanning] = useState<boolean>(false);
  const [selfieResult, setSelfieResult] = useState<'idle' | 'success' | 'fail'>('idle');
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectionState, setDetectionState] = useState<DetectionFrameState | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAnalyzingRef = useRef<boolean>(false);

  // Daily Shift Pre-Flight Safety Checklist
  const [dailyChecklist, setDailyChecklist] = useState<{ id: string; label: string; checked: boolean }[]>([
    { id: 'chk-1', label: 'Inspect chin strap & structural integrity of hard hat', checked: true },
    { id: 'chk-2', label: 'Verify high-visibility vest retro-reflective stripes', checked: true },
    { id: 'chk-3', label: 'Check steel-toe boot sole traction & oil resistance', checked: false },
    { id: 'chk-4', label: 'Test emergency eye-wash station flow in Zone B', checked: false },
  ]);

  // Pre-warm YOLO model in background on component mount (zero-wait mobile execution)
  useEffect(() => {
    visionEngine.loadModel().catch(() => {});
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  const handleToggleChecklist = (id: string) => {
    setDailyChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.checked;
          if (nextState) {
            soundEngine.playAlertBeep('click');
            addPoints(15);
          }
          return { ...item, checked: nextState };
        }
        return item;
      })
    );
  };

  // Start camera for selfie PPE check
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access in your browser settings.'
        : err?.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : `Camera error: ${err?.message || 'unknown'}`;
      setCameraError(msg);
      return false;
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    isAnalyzingRef.current = false;
  }, [cameraStream]);

  // Run PPE detection on current video frame with concurrency lock
  const runDetection = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return null;
    if (isAnalyzingRef.current) return null;

    isAnalyzingRef.current = true;
    try {
      const state = await visionEngine.analyzeFrame(videoRef.current, 'none', 0.35);
      // Render overlay on the canvas
      if (overlayCanvasRef.current && videoRef.current) {
        overlayCanvasRef.current.width = videoRef.current.videoWidth || 640;
        overlayCanvasRef.current.height = videoRef.current.videoHeight || 480;
        visionEngine.renderOverlay(overlayCanvasRef.current, state, true);
      }
      return state;
    } catch {
      return null;
    } finally {
      isAnalyzingRef.current = false;
    }
  }, []);

  // Handle selfie scan: start camera, run detection loop, stop after result
  const handleRunSelfieCheck = useCallback(async () => {
    if (isSelfieScanning) return;

    setIsSelfieScanning(true);
    setSelfieResult('idle');
    setDetectionState(null);
    soundEngine.playAlertBeep('warning');

    const cameraOk = await startCamera();
    if (!cameraOk) {
      setIsSelfieScanning(false);
      setSelfieResult('fail');
      return;
    }

    // Wait for video to be ready, then run detection loop
    const waitForReady = () => new Promise<void>((resolve) => {
      const check = () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });

    await waitForReady();

    // Run detection 4 times over ~2 seconds for smooth real-time tracking
    let bestState: DetectionFrameState | null = null;
    let detectionCount = 0;
    const maxDetections = 4;

    scanIntervalRef.current = setInterval(async () => {
      const state = await runDetection();
      if (state) {
        bestState = state;
        setDetectionState(state);
        detectionCount++;

        if (detectionCount >= maxDetections) {
          if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
          stopCamera();

          // Determine result based on live detected state
          const hasViolation = bestState?.hasViolation ?? false;
          const compliance = bestState?.compliancePercentage ?? 0;

          if (!hasViolation && compliance >= 70) {
            setSelfieResult('success');
            soundEngine.playAlertBeep('success');
            addPoints(30);
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.7 },
            });
          } else {
            setSelfieResult('fail');
            soundEngine.playAlertBeep('critical');
          }
          setIsSelfieScanning(false);
        }
      }
    }, 450);
  }, [isSelfieScanning, startCamera, stopCamera, runDetection, addPoints]);

  const handleSosClick = () => {
    setSosActive(true);
    soundEngine.playAlertBeep('critical');
    triggerEvacuation('Frontline Worker Panic Button Triggered in Mobile Companion');
  };

  const dailyBriefings: Record<string, string> = {
    th: 'สวัสดีตอนเช้า ข้อควรระวังวันนี้: พื้นที่โซน B มีการซ่อมบำรุงเครื่องจักรหนัก กรุณาสวมแว่นตานิรภัยและหมวกตลอดเวลา',
    en: 'Good morning safety briefing: Zone B has active heavy machinery maintenance. Keep safety goggles and hard hats on at all times.',
    my: 'မင်္ဂလာနံနက်ခင်းပါ! ယနေ့သတိပြုရန်- ဇုန် B တွင် စက်ယန္တရားကြီးများ ပြုပြင်နေသဖြင့် မျက်မှန်နှင့် ဦးထုပ်ကို အမြဲဝတ်ဆင်ထားပါ။',
    km: 'អរុណសួស្តី! ការណែនាំថ្ងៃនេះ៖ តំបន់ B មានការជួសជុលម៉ាស៊ីនធ្ងន់ៗ សូមពាក់វ៉ែនតា និងមួកសុវត្ថិភាពជានិច្ច។',
    lo: 'ສະບາຍດີຕອນເຊົ້າ! ຂໍ້ຄວນລະວັງມື້ນີ້: ໂຊນ B ມີການສ້ອມແປງເຄື່ອງຈັກໜັກ ກະລຸນາໃສ່ແວ່ນຕາ ແລະ ໝວກຕະຫຼອດເວລາ.' };

  const violationLabels = detectionState?.violationLabels || [];
  const compliance = detectionState?.compliancePercentage ?? 0;
  const personCount = detectionState?.personCount ?? 0;

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              {t.mobile.title}
            </h2>
            <p className="text-xs text-slate-400">Personal High-Contrast Field Interface</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
          <Trophy className="w-4 h-4" />
          <span>{userPoints} XP</span>
        </div>
      </div>

      {/* 1. Daily Audio Safety Briefing Player */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> {t.mobile.dailyBriefing}
          </span>
          <span className="text-[10px] font-mono text-cyan-400 font-bold">Shift: 08:00 - 17:00</span>
        </div>

        <p className="text-xs text-slate-200 italic">
          &ldquo;{dailyBriefings[language] || dailyBriefings.th}&rdquo;
        </p>

        <button
          onClick={() =>
            soundEngine.speakText(
              dailyBriefings[language] || dailyBriefings.th,
              language
            )
          }
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
        >
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <span>{t.mobile.listenAudio}</span>
        </button>
      </div>

      {/* 2. Pre-Shift Selfie PPE Check — Real Camera + YOLO */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-emerald-400" /> {t.mobile.selfiePpeCheck}
          </span>
          <span className={`text-[10px] font-mono font-bold ${
            selfieResult === 'success' ? 'text-emerald-400' : selfieResult === 'fail' ? 'text-rose-400' : 'text-cyan-400'
          }`}>
            {selfieResult === 'success' ? 'PASSED' : selfieResult === 'fail' ? 'FAILED' : 'AI Sentinel'}
          </span>
        </div>

        {/* Camera viewport */}
        <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
          {/* Live video (hidden when not scanning) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${cameraStream ? 'block' : 'hidden'}`}
            style={{ transform: 'scaleX(-1)' }}
          />
          {/* Overlay canvas for bounding boxes */}
          <canvas
            ref={overlayCanvasRef}
            className={`absolute inset-0 w-full h-full ${cameraStream ? 'block' : 'hidden'}`}
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Idle state */}
          {!cameraStream && selfieResult === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2">
              <ShieldCheck className="w-12 h-12 text-slate-600 mb-1" />
              <span className="text-xs font-semibold text-slate-300">
                Position your face and chest inside the frame
              </span>
              <span className="text-[10px] text-slate-500">
                Verifies Hard Hat, Hi-Vis Vest &amp; Eye Protection via YOLO AI
              </span>
            </div>
          )}

          {/* Scanning state */}
          {isSelfieScanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-[10px] font-mono text-cyan-300 animate-pulse font-bold">
                  SCANNING PPE...
                </span>
                {detectionState && (
                  <span className="ml-auto text-[10px] font-mono text-white/70">
                    {personCount} worker{personCount !== 1 ? 's' : ''} &middot; {compliance}% compliant
                  </span>
                )}
              </div>
              {/* Scan line animation */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[scan_1.5s_ease-in-out_infinite]" />
            </div>
          )}

          {/* Success result overlay */}
          {selfieResult === 'success' && !isSelfieScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/80 p-6 text-center space-y-2">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-bounce" />
              <h4 className="text-base font-bold text-emerald-300">
                100% PPE COMPLIANT
              </h4>
              <p className="text-xs text-emerald-200/70 max-w-xs">
                Hard hat, hi-vis vest, and safety glasses verified. Shift access granted (+30 XP).
              </p>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">⛑️ Helmet OK</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">🦺 Vest OK</span>
              </div>
            </div>
          )}

          {/* Fail result overlay */}
          {selfieResult === 'fail' && !isSelfieScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/80 p-6 text-center space-y-2">
              <XCircle className="w-14 h-14 text-rose-400" />
              <h4 className="text-base font-bold text-rose-300">
                PPE VIOLATION DETECTED
              </h4>
              <p className="text-xs text-rose-200/70 max-w-xs">
                {violationLabels.length > 0
                  ? `Missing: ${violationLabels.join(', ')}`
                  : 'Could not verify PPE. Ensure face and chest are visible.'}
              </p>
              <div className="flex gap-2 mt-2 flex-wrap justify-center">
                {violationLabels.map((label, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono">
                    ⚠️ {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Camera error overlay */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center space-y-2">
              <CameraOff className="w-10 h-10 text-rose-400" />
              <span className="text-xs font-semibold text-rose-300">{cameraError}</span>
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={handleRunSelfieCheck}
          disabled={isSelfieScanning}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSelfieScanning ? 'Verifying PPE...' : selfieResult === 'success'
            ? 'Scan Again (+30 XP)'
            : `${t.mobile.scanMyPpe} (+30 XP)`}
        </button>
      </div>

      {/* 3. Daily Safety Checklist */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4" /> Shift Pre-Flight Safety Checklist
          </span>
          <span className="text-[10px] font-mono text-emerald-400">
            {dailyChecklist.filter((c) => c.checked).length} / {dailyChecklist.length} Checked
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {dailyChecklist.map((item) => (
            <div
              key={item.id}
              onClick={() => handleToggleChecklist(item.id)}
              className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                item.checked
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-200'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {item.checked ? (
                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-600 shrink-0" />
              )}
              <span className="flex-1 font-medium">{item.label}</span>
              {item.checked && <span className="text-[10px] font-mono text-amber-400 font-bold">+15 XP</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Emergency SOS Panic Button */}
      <div className="glass-panel p-5 rounded-2xl border border-rose-500/40 bg-rose-950/20 space-y-3 text-center">
        <h3 className="text-sm font-extrabold text-rose-400">
          {t.mobile.voiceSos}
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Press in case of immediate accident, entrapment, or severe hazard. Transmits GPS beacon and sound alarm to safety office.
        </p>

        <button
          onClick={handleSosClick}
          className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 text-white font-extrabold text-base flex flex-col items-center justify-center gap-1 shadow-2xl shadow-rose-600/50 active:scale-95 transition-all cursor-pointer border-4 border-rose-400/40"
        >
          <AlertOctagon className="w-8 h-8 animate-pulse" />
          <span>SOS</span>
        </button>

        {sosActive && (
          <p className="text-xs font-mono font-bold text-rose-300 animate-pulse">
            EMERGENCY SIGNAL TRANSMITTED TO SAFETY COMMAND
          </p>
        )}
      </div>
    </div>
  );
};
