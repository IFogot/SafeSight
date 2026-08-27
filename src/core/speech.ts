import { SupportedLanguage } from './types';

// Speech synthesis and alarm sound engine
class SafeSightAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isAlarmPlaying: boolean = false;
  private alarmInterval: number | null = null;
  public isMuted: boolean = false;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play synthetic industrial beep / alert sound using Web Audio API oscillators
  public playAlertBeep(type: 'warning' | 'critical' | 'success' | 'click' = 'warning') {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'critical') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'warning') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
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

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.6);
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

  // Native Web Speech API speech synthesis
  public speakText(text: string, lang: SupportedLanguage = 'th') {
    if (this.isMuted || !('speechSynthesis' in window) || !text) return;

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const langMap: Record<SupportedLanguage, string> = {
        th: 'th-TH',
        en: 'en-US',
        my: 'my-MM',
        km: 'km-KH',
        lo: 'lo-LA',
      };

      utterance.lang = langMap[lang] || 'th-TH';

      // Find best available voice in browser
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2).toLowerCase()));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  }
}

// Lazy-initialize to prevent SSR crash (AudioContext doesn't exist on server)
let _soundEngine: SafeSightAudioEngine | null = null;
export const soundEngine: SafeSightAudioEngine = new Proxy({} as SafeSightAudioEngine, {
  get(_target, prop) {
    if (typeof window === 'undefined') {
      // Return no-op on server
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
});
