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
      // Auto-unlock on first user interaction
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

      // Preload voices if supported
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
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
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
        gain.gain.setValueAtTime(0.08, now);
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

    // Play subtle auditory chime so user always receives audible feedback
    this.playAlertBeep('click');

    if (!('speechSynthesis' in window)) {
      console.warn('SafeSight Audio: Web Speech Synthesis not supported in this environment');
      return;
    }

    try {
      this.ensureUnlocked();

      // Resume speech synthesis if suspended by Chromium
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // Stop any pending speech cleanly
      window.speechSynthesis.cancel();

      // Clean text
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

      // Graceful voice fallback if specific regional voice is missing in OS
      if (!matchedVoice) {
        if (lang === 'my' || lang === 'km' || lang === 'lo') {
          // Fallback to Thai or English voice if regional language voice is not pre-installed
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

      // Retain utterance reference to avoid Chrome Garbage Collection abort bug
      activeUtterances.push(utterance);
      const cleanup = () => {
        const idx = activeUtterances.indexOf(utterance);
        if (idx !== -1) activeUtterances.splice(idx, 1);
      };
      utterance.onend = cleanup;
      utterance.onerror = (err) => {
        cleanup();
        console.warn('SafeSight Speech Synthesis warning:', err);
      };

      // Slight timeout prevents Chromium race-condition bug with cancel() + speak()
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('Speech speak call warning:', e);
        }
      }, 50);
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
