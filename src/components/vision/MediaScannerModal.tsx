import React, { useState, useRef } from 'react';
import { useSafeSight } from '../../core/store';
import { X, UploadCloud, CheckCircle, AlertTriangle, FileImage, ShieldCheck } from 'lucide-react';
import { visionEngine } from '../../engine/visionDetector';

interface MediaScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MediaScannerModal: React.FC<MediaScannerModalProps> = ({ isOpen, onClose }) => {
  const { t, addAlert, language } = useSafeSight();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanComplete, setScanComplete] = useState<boolean>(false);
  const [detectedViolations, setDetectedViolations] = useState<string[]>([]);
  const [scanMessage, setScanMessage] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setScanComplete(false);
        setDetectedViolations([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunAiScan = async () => {
    if (!selectedImage || !imageRef.current) return;
    setIsScanning(true);
    setScanComplete(false);
    const result = await visionEngine.analyzeFrame(imageRef.current);
    setIsScanning(false);
    setScanComplete(true);
    const violations = result.violationLabels;
    setDetectedViolations(violations);
    setScanMessage(result.modelMessage || `${result.objects.length} objects detected at ${(result.fps || 0)} FPS.`);

    if (violations.length > 0) {
        addAlert({
          title: `Media Scan Violation: ${violations[0]}`,
          zone: 'Zone B (Uploaded Inspection)',
          location: 'Station Inspection #07',
          riskLevel: 'high',
          type: 'ppe_violation',
          details: {
            th: 'ระบบตรวจพบการไม่สวมหมวกนิรภัยและถุงมือกันบาดจากภาพถ่ายที่อัปโหลด',
            en: 'Detected missing safety helmet and cut-resistant gloves from uploaded photo.',
            my: 'တင်ထားသော ဓာတ်ပုံတွင် ဦးထုပ်နှင့် လက်အိတ် မပါရှိကြောင်း စစ်ဆေးတွေ့ရှိရပါသည်',
            km: 'បានរកឃើញថាមិនមានពាក់មួក និងស្រោមដៃពីរូបថតដែលបានបញ្ចូល',
            lo: 'ກວດພົບການບໍ່ໃສ່ໝວກນິລະໄພ ແລະ ຖົງມືຈາກຮູບທີ່ອັບໂຫຼດ',
          },
          audioText: {
            th: 'เตือนอันตราย! กรุณาสวมใส่อุปกรณ์คุ้มครองความปลอดภัยให้ครบถ้วน',
            en: 'Warning! Please ensure complete PPE equipment is worn.',
            my: 'သတိပေးချက်! PPE ကိရိယာအားလုံးကို ပြည့်စုံစွာ ဝတ်ဆင်ပါ',
            km: 'ការព្រមាន! សូមពាក់ឧបករណ៍ការពារឱ្យបានគ្រប់គ្រាន់',
            lo: 'ເຕືອນອັນຕະລາຍ! ກະລຸນາໃສ່ອຸປະກອນນິລະໄພໃຫ້ຄົບຖ້ວນ',
          },
          acknowledged: false,
        });
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl glass-panel-glow rounded-2xl p-6 border border-cyan-500/30 text-slate-100 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {t.vision.modeMediaScan}
            </h3>
            <p className="text-xs text-slate-400">
              Upload factory photos or video clips to run deep AI safety compliance analysis
            </p>
          </div>
        </div>

        {/* Upload Drop Zone */}
        {!selectedImage ? (
          <label className="flex flex-col items-center justify-center w-full h-56 rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-500/80 bg-slate-900/60 hover:bg-slate-900/90 transition-all cursor-pointer group p-6 text-center">
            <FileImage className="w-12 h-12 text-slate-500 group-hover:text-amber-400 mb-2 transition-colors" />
            <span className="text-sm font-semibold text-slate-300 group-hover:text-amber-300">
              Click to select or drag & drop factory image
            </span>
            <span className="text-xs text-slate-500 mt-1 font-mono">
              Supports JPG, PNG, WEBP, MP4 (Max 25MB)
            </span>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center max-h-72">
              <img
                ref={imageRef}
                src={selectedImage}
                alt="Upload Preview"
                className="max-h-72 w-auto object-contain"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none w-full h-full"
              />

              {isScanning && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                  <span className="text-xs font-mono text-cyan-300 animate-pulse">
                    RUNNING COMPUTER VISION INFERENCE...
                  </span>
                </div>
              )}
            </div>

            {/* Results Display */}
            {scanComplete && (
              <div className={`p-4 rounded-xl border ${
                detectedViolations.length > 0
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  {detectedViolations.length > 0 ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                      <span>Safety Breach Detected ({detectedViolations.length} Violations)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>{scanMessage || 'No configured violation classes detected'}</span>
                    </>
                  )}
                </div>
                {detectedViolations.length > 0 && (
                  <ul className="text-xs space-y-1 pl-7 list-disc">
                    {detectedViolations.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                )}
                {scanMessage && <p className="mt-2 text-[11px] opacity-80">{scanMessage}</p>}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setSelectedImage(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                Choose Different File
              </button>

              <button
                onClick={handleRunAiScan}
                disabled={isScanning}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isScanning ? 'Analyzing...' : 'Run AI Safety Scan'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
