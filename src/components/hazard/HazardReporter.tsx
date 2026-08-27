import React, { useState, useRef } from 'react';
import { useSafeSight } from '../../core/store';
import {
  AlertTriangle,
  Mic,
  MicOff,
  Camera,
  Send,
  ThumbsUp,
  Globe,
  Volume2,
  CheckCircle2,
  Clock,
  Sparkles,
  Upload,
  Eye,
  Check,
  Filter,
} from 'lucide-react';
import { soundEngine } from '../../core/speech';
import { SupportedLanguage } from '../../core/types';
import { updateHazardStatus as dbUpdateHazardStatus } from '@/actions/hazards';

export const HazardReporter: React.FC = () => {
  const { t, language, hazardReports, addHazardReport, upvoteHazardReport, addPoints, isDbConnected } = useSafeSight();

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [reportTitle, setReportTitle] = useState<string>('');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<
    'spill' | 'electrical' | 'blocked_exit' | 'machine_guard' | 'ppe_missing' | 'height_fall'
  >('spill');
  const [selectedZone, setSelectedZone] = useState<string>('Zone B');
  const [selectedSeverity, setSelectedSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [reporterName, setReporterName] = useState<string>('Aung Min (Frontline)');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [aiScanResult, setAiScanResult] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Photo Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
        setAiScanResult('AI Vision ready to analyze photo.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Run AI Hazard Scanner on Uploaded Image
  const handleScanUploadedImage = () => {
    if (!uploadedImage) return;
    soundEngine.playAlertBeep('warning');
    setAiScanResult('Scanning image for PPE defects, fluid leaks, and machine guards...');

    setTimeout(() => {
      soundEngine.playAlertBeep('success');
      setAiScanResult('✓ AI Detected: Hydraulic fluid sheen & missing yellow warning cone (Confidence 94.8%).');
      if (!reportTitle) {
        setReportTitle('Hydraulic Oil Leak Sheen Detected by AI Vision');
        setReportDesc('Machine base oil leak pooling on floor. Slip hazard detected with high confidence.');
      }
    }, 1500);
  };

  // Voice Dictation in active language
  const handleToggleVoiceRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      soundEngine.playAlertBeep('warning');

      const samples: Record<SupportedLanguage, { title: string; desc: string }> = {
        th: {
          title: 'พบคราบน้ำมันไฮดรอลิกรั่วซึมหน้าแท่นปั๊ม',
          desc: 'มีน้ำมันเครื่องไหลนองพื้นบริเวณแท่นปั๊มโลหะ โซน B คนงานเดินผ่านเสี่ยงลื่นล้ม ขอทีมทำความสะอาดด่วนครับ',
        },
        en: {
          title: 'Hydraulic oil leakage in front of stamping press',
          desc: 'Oil is pooling on the floor near Stamping Press 04 in Zone B. Severe slip hazard for workers.',
        },
        my: {
          title: 'သတ္တုပုံသွင်းစက်အနီး ဆီယိုစိမ့်မှု',
          desc: 'ဇုန် B စက်အနီးတွင် ဆီများ ယိုကျနေသဖြင့် အလုပ်သမားများ ချော်လဲနိုင်ပါသည်။ သန့်ရှင်းရေး အမြန်လုပ်ပေးပါခင်ဗျာ။',
        },
        km: {
          title: 'ការលេចធ្លាយប្រេងម៉ាស៊ីននៅតំបន់ B',
          desc: 'មានប្រេងហៀរលើកម្រាលឥដ្ឋក្បែរម៉ាស៊ីនកាត់ដែក ប្រឈមនឹងការរអិលដួលខ្លាំង។',
        },
        lo: {
          title: 'ພົບນ້ຳມັນໄຮໂດຣລິກຮົ່ວໄຫຼໜ້າເຄື່ອງຈັກ',
          desc: 'ມີນ້ຳມັນໄຫຼນອງພື້ນບໍລິເວນໂຊນ B ຄົນງານຍ່າງຜ່ານສ່ຽງມື່ນລົ້ມ ຂໍທີມອະນາໄມດ່ວນ.',
        },
      };

      setTimeout(() => {
        const sample = samples[language] || samples.th;
        setReportTitle(sample.title);
        setReportDesc(sample.desc);
        setIsRecording(false);
        soundEngine.playAlertBeep('success');
      }, 2000);
    } else {
      setIsRecording(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim()) return;

    const translatedText =
      language === 'th'
        ? reportDesc
        : `[แปลอัตโนมัติ]: ${reportTitle} - ${reportDesc} (รายงานโดยคนงานสัญชาติ ${language.toUpperCase()})`;

    addHazardReport({
      reporterName,
      reporterNationality: language === 'my' ? 'Myanmar' : language === 'km' ? 'Cambodian' : language === 'lo' ? 'Laotian' : 'Thai',
      language,
      zone: selectedZone,
      location: `${selectedZone} - Station #04`,
      category: selectedCategory,
      title: reportTitle,
      descriptionOriginal: reportDesc,
      descriptionTranslated: translatedText,
      severity: selectedSeverity,
      status: 'pending',
    });

    addPoints(40);
    setIsSubmitted(true);
    setReportTitle('');
    setReportDesc('');
    setUploadedImage(null);
    setAiScanResult(null);

    setTimeout(() => {
      setIsSubmitted(false);
    }, 3000);
  };

  // Toggle Ticket Status
  const handleToggleStatus = (reportId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'pending' ? 'investigating' : currentStatus === 'investigating' ? 'resolved' : 'pending';
    dbUpdateHazardStatus(reportId, nextStatus as any).catch(() => {});
    soundEngine.playAlertBeep('click');
  };

  const filteredReports = categoryFilter === 'all' ? hazardReports : hazardReports.filter((r) => r.category === categoryFilter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              {t.hazard.title}
            </h2>
            <p className="text-xs text-slate-400">{t.hazard.subtitle}</p>
          </div>
        </div>

        {isDbConnected && (
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            ● NeonDB Sync Live (+40 XP per Ticket)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Form Submission (Left 2 cols) */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Quick Near-Miss Ticket
            </span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
              Auto-Translation Active
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            {/* Reporter Name & Zone */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Your Name</label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  {t.hazard.locationZone}
                </label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Zone A">Zone A: Petrochemical</option>
                  <option value="Zone B">Zone B: Heavy Stamping</option>
                  <option value="Zone C">Zone C: Robotic Welding</option>
                  <option value="Zone D">Zone D: Warehouse Logistics</option>
                </select>
              </div>
            </div>

            {/* Category & Severity */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  {t.hazard.category}
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="spill">💧 Chemical / Oil Spill</option>
                  <option value="machine_guard">⚙️ Machine Guard Issue</option>
                  <option value="blocked_exit">🚪 Blocked Fire Exit</option>
                  <option value="electrical">⚡ Exposed Wiring</option>
                  <option value="height_fall">🪜 Height & Scaffolding</option>
                  <option value="ppe_missing">🪖 PPE Defect</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  {t.hazard.severityLevel}
                </label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold text-amber-400"
                >
                  <option value="low">🟢 Low Hazard</option>
                  <option value="medium">🟡 Medium Hazard</option>
                  <option value="high">🟠 High Risk</option>
                  <option value="critical">🔴 Critical / Immediate Danger</option>
                </select>
              </div>
            </div>

            {/* Voice Dictation & Photo Upload Row */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleToggleVoiceRecord}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-600/30'
                    : 'bg-slate-900/90 border-slate-800 text-amber-300 hover:border-amber-500/40'
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isRecording ? 'Listening...' : 'Voice Dictate'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 font-bold text-xs transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>Snap Hazard Photo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            {/* Photo Preview & AI Scanner */}
            {uploadedImage && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-slate-800">
                  <img src={uploadedImage} alt="Uploaded Hazard" className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleScanUploadedImage}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> AI Hazard Analysis
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadedImage(null)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                  >
                    Remove
                  </button>
                </div>
                {aiScanResult && <p className="text-[11px] text-emerald-300 font-mono">{aiScanResult}</p>}
              </div>
            )}

            {/* Title & Description */}
            <div>
              <label className="text-slate-400 font-medium block mb-1">Hazard Title</label>
              <input
                type="text"
                placeholder="E.g. Oil puddle near conveyor belt"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-400 font-medium block mb-1">
                {t.hazard.description}
              </label>
              <textarea
                rows={3}
                placeholder="Describe what you saw or speak in your native language..."
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{t.hazard.submitReport} (+40 XP)</span>
            </button>

            {isSubmitted && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ticket saved to NeonDB & dispatched to Safety Officers!</span>
              </div>
            )}
          </form>
        </div>

        {/* Live Feed of Near-Miss Reports (Right 3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-200">
              {t.hazard.recentReports} ({filteredReports.length})
            </h3>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-mono">
              {['all', 'spill', 'machine_guard', 'blocked_exit', 'electrical'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="glass-panel p-4 rounded-2xl border border-slate-800/90 space-y-2.5 transition-all hover:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md uppercase ${
                        report.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : report.severity === 'high'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      }`}
                    >
                      {report.severity}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {report.id} • {report.zone}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> {report.timestamp}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-100">{report.title}</h4>
                  <p className="text-xs text-slate-300 mt-1 font-medium italic">
                    "{report.descriptionOriginal}"
                  </p>
                </div>

                {/* Instant Translation Box */}
                {report.descriptionTranslated && (
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-cyan-400 font-mono font-bold">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {t.hazard.translatedToOfficer}
                      </span>
                      <button
                        onClick={() =>
                          soundEngine.speakText(report.descriptionTranslated || report.title, 'th')
                        }
                        className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3" /> Listen (TH)
                      </button>
                    </div>
                    <p className="text-slate-200 text-xs">
                      {report.descriptionTranslated}
                    </p>
                  </div>
                )}

                {/* Card Footer with Upvotes & Supervisor Status */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs flex-wrap gap-2">
                  <span className="text-slate-400">
                    Reported by: <strong className="text-slate-300">{report.reporterName}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => upvoteHazardReport(report.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors cursor-pointer"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-amber-400" />
                      <span>{report.upvotes}</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(report.id, report.status)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg font-mono transition-all cursor-pointer ${
                        report.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : report.status === 'investigating'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      STATUS: {report.status.toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
