# Web Audio & Industrial Multilingual Guidelines

1. **Proxy Singleton Mutable Properties**: When wrapping audio/speech engines in a Proxy for SSR safety, ALWAYS implement both `get` and `set` traps to guarantee state mutations (`isMuted`, `volume`, etc.) propagate to the internal instance.
2. **Web Audio Gesture Auto-Unlock**: Attach non-intrusive `pointerdown`/`touchstart` one-time event listeners on `window` to resume suspended `AudioContext` and unpause `window.speechSynthesis`.
3. **Chromium Speech GC Safety**: Retain active `SpeechSynthesisUtterance` references in an in-memory array until `utterance.onend` or `utterance.onerror` fires to prevent Chromium's premature garbage collection bug.
4. **Multilingual Rich Menus (EEC Industrial Standard)**: Avoid single-language icons when designing static LINE Rich Menu banners for diverse workforces. Maximize typography size and render all supported languages (🇹🇭 TH, 🇬🇧 EN, 🇲🇲 MY, 🇰🇭 KM) simultaneously in each button cell.
