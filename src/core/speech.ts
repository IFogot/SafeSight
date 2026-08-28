import { SupportedLanguage } from './types';

// Active utterances list to prevent Chromium Garbage Collection bug
const activeUtterances: SpeechSynthesisUtterance[] = [];

// Speech synthesis and alarm sound engine
class SafeSightAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isAlarmPlaying: boolean = false;
  private alarmInterval: number | null = null;
  public isMuted: boolean = false;
  private isAudioUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        if (!this.isAudioUnlocked) {
          this.isAudioUnlocked = true;
          this.ensureUnlocked();
        }
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('click', unlock, { passive: true });

      // Preload voices
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }

  public ensureUnlocked(): void {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Play a 1-sample silent buffer to unlock iOS Safari Web Audio
      if (ctx) {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const node = ctx.createBufferSource();
        node.buffer = buffer;
        node.connect(ctx.destination);
        node.start(0);
      }
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // ignore
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // Play melodic harmonic notification chime using Web Audio API
  public playMelodicChime(type: 'briefing' | 'alert' | 'success' = 'briefing') {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const notes =
        type === 'success'
          ? [523.25, 659.25, 783.99, 1046.5] // C5 -> E5 -> G5 -> C6
          : type === 'alert'
          ? [880, 659.25, 880, 440] // A5 -> E5 -> A5 -> A4
          : [440, 554.37, 659.25, 880]; // A4 -> C#5 -> E5 -> A5 (Warm Briefing Chime)

      const now = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const startTime = now + idx * 0.09;
        const duration = 0.22;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch {
      // ignore
    }
  }

  // Play synthetic industrial beep / alert sound using Web Audio API oscillators
  public playAlertBeep(type: 'warning' | 'critical' | 'success' | 'click' = 'warning') {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'critical') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'warning') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  // Continuous industrial evacuation siren
  public startEvacuationSiren() {
    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;

    const playSirenPulse = () => {
      if (!this.isAlarmPlaying || this.isMuted) return;
      try {
        const ctx = this.getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(1000, now + 0.6);
        osc.frequency.linearRampToValueAtTime(400, now + 1.2);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.6);
        gain.gain.linearRampToValueAtTime(0.1, now + 1.2);

        osc.start(now);
        osc.stop(now + 1.2);
      } catch {
        // ignore
      }
    };

    playSirenPulse();
    this.alarmInterval = window.setInterval(playSirenPulse, 1300);
  }

  public stopEvacuationSiren() {
    this.isAlarmPlaying = false;
    if (this.alarmInterval !== null) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  // Native Web Speech API speech synthesis with full fallbacks
  public speakText(text: string, lang: SupportedLanguage = 'th') {
    if (this.isMuted || typeof window === 'undefined' || !text) return;

    // 1. Play melodic acoustic chime immediately so user gets guaranteed audio on every device
    this.playMelodicChime('briefing');

    if (!('speechSynthesis' in window)) {
      console.warn('SafeSight Audio: Web Speech Synthesis not supported');
      return;
    }

    try {
      this.ensureUnlocked();

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const langMap: Record<SupportedLanguage, string> = {
        th: 'th-TH',
        en: 'en-US',
        my: 'my-MM',
        km: 'km-KH',
        lo: 'lo-LA',
      };

      const requestedLocale = langMap[lang] || 'th-TH';
      utterance.lang = requestedLocale;

      // Match best voice available
      const voices = window.speechSynthesis.getVoices();
      let matchedVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith(requestedLocale.toLowerCase().slice(0, 2))
      );

      if (!matchedVoice) {
        if (lang === 'my' || lang === 'km' || lang === 'lo') {
          matchedVoice =
            voices.find((v) => v.lang.toLowerCase().startsWith('th')) ||
            voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
            voices[0];
        } else {
          matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en')) || voices[0];
        }
      }

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      activeUtterances.push(utterance);
      const cleanup = () => {
        const idx = activeUtterances.indexOf(utterance);
        if (idx !== -1) activeUtterances.splice(idx, 1);
      };
      utterance.onend = cleanup;
      utterance.onerror = (err) => {
        cleanup();
        console.warn('SafeSight Speech Synthesis notice:', err);
      };

      // Direct synchronous speak to preserve mobile user-gesture token
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('SafeSight Audio Engine Error:', err);
    }
  }
}

// Lazy-initialize to prevent SSR crash (AudioContext doesn't exist on server)
let _soundEngine: SafeSightAudioEngine | null = null;
export const soundEngine: SafeSightAudioEngine = new Proxy({} as SafeSightAudioEngine, {
  get(_target, prop) {
    if (typeof window === 'undefined') {
      return () => {};
    }
    if (!_soundEngine) {
      _soundEngine = new SafeSightAudioEngine();
    }
    const value = (_soundEngine as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === 'function') {
      return value.bind(_soundEngine);
    }
    return value;
  },
  set(_target, prop, value) {
    if (typeof window !== 'undefined') {
      if (!_soundEngine) {
        _soundEngine = new SafeSightAudioEngine();
      }
      (_soundEngine as unknown as Record<string, unknown>)[prop as string] = value;
    }
    return true;
  },
});
