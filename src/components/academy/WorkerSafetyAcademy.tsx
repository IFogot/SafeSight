import React, { useState } from 'react';
import { useSafeSight } from '../../core/store';
import { SAFETY_COURSES } from '../../core/mockData';
import { SafetyCourse } from '../../core/types';
import {
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  Volume2,
  HelpCircle,
  Sparkles,
  Trophy,
  X,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../../core/speech';

export const WorkerSafetyAcademy: React.FC = () => {
  const { t, language, userPoints, addPoints } = useSafeSight();
  const [selectedCourse, setSelectedCourse] = useState<SafetyCourse>(SAFETY_COURSES[0]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState<boolean>(false);

  // Hazard Spotter mini-game state
  const [foundHazards, setFoundHazards] = useState<string[]>([]);

  const miniGameHazards = [
    { id: 'spill', name: 'Oil Spill on Walkway', x: 28, y: 75 },
    { id: 'helmet', name: 'Worker Missing Hard Hat', x: 55, y: 45 },
    { id: 'wiring', name: 'Exposed Electrical Cable', x: 80, y: 30 },
  ];

  const handleSpotHazard = (hazardId: string) => {
    if (!foundHazards.includes(hazardId)) {
      const updated = [...foundHazards, hazardId];
      setFoundHazards(updated);
      soundEngine.playAlertBeep('success');
      addPoints(50);

      if (updated.length === miniGameHazards.length) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  };

  const handleQuizSubmit = () => {
    if (selectedOption === null) return;
    setIsQuizSubmitted(true);

    const isCorrect = selectedOption === selectedCourse.quiz[0].correctIndex;
    if (isCorrect) {
      soundEngine.playAlertBeep('success');
      addPoints(selectedCourse.xpPoints);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } else {
      soundEngine.playAlertBeep('warning');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              {t.academy.title}
            </h2>
            <p className="text-xs text-slate-400">{t.academy.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
            <Trophy className="w-4 h-4" />
            <span>{userPoints} XP</span>
          </div>

          <button
            onClick={() => setIsCertificateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
          >
            <Award className="w-4 h-4 text-cyan-400" />
            <span>{t.academy.claimCertificate}</span>
          </button>
        </div>
      </div>

      {/* Main Course Content & Quiz */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Course Selection List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Micro-Learning Modules (5 Languages)
          </h3>

          {SAFETY_COURSES.map((course) => {
            const isSelected = selectedCourse.id === course.id;
            const courseTitle = course.title[language] || course.title.th;

            return (
              <div
                key={course.id}
                onClick={() => {
                  setSelectedCourse(course);
                  setSelectedOption(null);
                  setIsQuizSubmitted(false);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? 'glass-panel-glow border-amber-500/50 bg-amber-500/10 text-slate-100'
                    : 'glass-panel border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
                    {course.durationMin} MIN • +{course.xpPoints} XP
                  </span>
                  {course.completed && (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> CERTIFIED
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold">{courseTitle}</h4>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {course.summary[language] || course.summary.th}
                </p>
              </div>
            );
          })}
        </div>

        {/* Center & Right: Active Course Study & Interactive Quiz */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Course Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                  Active Safety Drill
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-0.5">
                  {selectedCourse.title[language] || selectedCourse.title.th}
                </h3>
              </div>

              <button
                onClick={() =>
                  soundEngine.speakText(
                    (selectedCourse.title[language] || selectedCourse.title.th) +
                      '. ' +
                      (selectedCourse.keyRules[language] || selectedCourse.keyRules.th).join('. '),
                    language
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Listen Audio</span>
              </button>
            </div>

            <p className="text-xs text-slate-300">
              {selectedCourse.summary[language] || selectedCourse.summary.th}
            </p>

            {/* Essential Rules Box */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> {t.academy.ruleList}
              </span>
              <ul className="space-y-1.5 text-xs text-slate-200">
                {(selectedCourse.keyRules[language] || selectedCourse.keyRules.th).map(
                  (rule, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{rule}</span>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Interactive Safety Quiz */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Knowledge Check Quiz
                </h4>
              </div>

              <p className="text-xs font-semibold text-slate-100">
                {selectedCourse.quiz[0].question[language] ||
                  selectedCourse.quiz[0].question.th}
              </p>

              <div className="space-y-2">
                {(
                  selectedCourse.quiz[0].options[language] ||
                  selectedCourse.quiz[0].options.th
                ).map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!isQuizSubmitted) setSelectedOption(idx);
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                      selectedOption === idx
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    } ${
                      isQuizSubmitted &&
                      idx === selectedCourse.quiz[0].correctIndex &&
                      'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    } ${
                      isQuizSubmitted &&
                      selectedOption === idx &&
                      idx !== selectedCourse.quiz[0].correctIndex &&
                      'bg-rose-500/20 border-rose-500 text-rose-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {!isQuizSubmitted ? (
                <button
                  onClick={handleQuizSubmit}
                  disabled={selectedOption === null}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Submit Answer & Claim XP
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <span className="font-bold text-slate-200">
                    {selectedOption === selectedCourse.quiz[0].correctIndex
                      ? '🎉 Correct! +100 XP awarded.'
                      : '❌ Incorrect. Review the explanation:'}
                  </span>
                  <p className="text-slate-400">
                    {selectedCourse.quiz[0].explanation[language] ||
                      selectedCourse.quiz[0].explanation.th}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Hazard Spotter Mini-Game */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  Gamified Training Drill
                </span>
                <h3 className="text-sm font-bold text-slate-100">
                  {t.academy.miniGameTitle} (Click on 3 hidden hazards)
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-amber-400">
                Found: {foundHazards.length} / 3
              </span>
            </div>

            {/* Clickable Hazard Canvas Box */}
            <div className="relative aspect-[16/8] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-4 flex items-center justify-center select-none">
              <svg viewBox="0 0 600 300" className="w-full h-full">
                {/* Background Room */}
                <rect width="600" height="300" fill="#0B1120" />
                <line x1="0" y1="200" x2="600" y2="200" stroke="#1E293B" strokeWidth="2" />

                {/* Machinery */}
                <rect x="80" y="80" width="140" height="120" fill="#1E293B" stroke="#334155" strokeWidth="2" />
                <rect x="360" y="80" width="160" height="120" fill="#1E293B" stroke="#334155" strokeWidth="2" />

                {/* 1. Oil Spill Hazard */}
                <g onClick={() => handleSpotHazard('spill')} className="cursor-pointer">
                  <ellipse cx="170" cy="240" rx="35" ry="12" fill={foundHazards.includes('spill') ? '#10B981' : '#EAB308'} opacity="0.8" />
                  {foundHazards.includes('spill') && (
                    <text x="140" y="270" fill="#10B981" fontSize="10" fontWeight="bold">
                      ✓ Oil Spill
                    </text>
                  )}
                </g>

                {/* 2. Worker Missing Helmet */}
                <g onClick={() => handleSpotHazard('helmet')} className="cursor-pointer">
                  <circle cx="330" cy="140" r="14" fill="#FDBA74" />
                  <rect x="320" y="155" width="20" height="40" fill="#475569" />
                  {foundHazards.includes('helmet') && (
                    <text x="290" y="125" fill="#10B981" fontSize="10" fontWeight="bold">
                      ✓ No Helmet
                    </text>
                  )}
                </g>

                {/* 3. Exposed Wiring */}
                <g onClick={() => handleSpotHazard('wiring')} className="cursor-pointer">
                  <path d="M 480 140 Q 510 180 500 230" fill="none" stroke={foundHazards.includes('wiring') ? '#10B981' : '#EF4444'} strokeWidth="3" />
                  {foundHazards.includes('wiring') && (
                    <text x="460" y="255" fill="#10B981" fontSize="10" fontWeight="bold">
                      ✓ Exposed Wire
                    </text>
                  )}
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Digital Certificate Modal */}
      {isCertificateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-xl glass-panel-glow rounded-3xl p-6 sm:p-8 border-2 border-amber-500/50 text-slate-100 text-center shadow-2xl space-y-4">
            <button
              onClick={() => setIsCertificateOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30">
              <Award className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
                OFFICIAL DIGITAL CREDENTIAL • EEC OCCUPATIONAL SAFETY
              </span>
              <h3 className="text-2xl font-extrabold text-slate-100 mt-1">
                Certificate of Workplace Safety Excellence
              </h3>
            </div>

            <p className="text-xs text-slate-300 max-w-md mx-auto">
              This certifies that <strong>Frontline Industrial Operator</strong> has successfully completed the SafeSight Multilingual Safety Curriculum with a verified score of {userPoints} XP.
            </p>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-400 grid grid-cols-2 gap-2 text-left">
              <div>
                <span>ISSUING PLATFORM:</span>
                <p className="text-slate-200 font-bold">SafeSight EEC Enterprise</p>
              </div>
              <div>
                <span>STANDARD:</span>
                <p className="text-slate-200 font-bold">ISO 45001 / OSH Thailand</p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playAlertBeep('success');
                setIsCertificateOpen(false);
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Download Verified Credential (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
