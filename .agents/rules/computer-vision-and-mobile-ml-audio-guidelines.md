# Computer Vision, Mobile ML, & Audio Best Practices

1. **Dynamic Sub-Feature State Tracking**: Never hardcode compliance for PPE sub-components (glasses, gloves, vests, hard hats). Always calculate live pixel features to detect state transitions (wearing vs removed) on every frame in real time.
2. **4-Sided Structural Frame Correlation for Eyewear**:
   - Never allow lower cheek/eyelid edge density to pass in isolation, as undereye creases and eyelashes produce edge contrast in close-up webcam views.
   - Enforce 4-sided geometric correlation: require presence across the **Nose Bridge Bar** (`bridgeDensity > 0.14`) coupled with the **Lower Lens Rim** (`cheekDensity > 0.08`) or **Lateral Temple Arms** (`templeDensity > 0.10`), or verified **Polycarbonate Reflection Glints** (`glintHits >= 3`).
   - Bare faces have smooth skin across the nasal root and outer temples ($\le 0.04$), completely preventing false positives.
3. **Zero-Wait Mobile Inference Loop**: Never block the animation or video frame loop on heavy WASM/ONNX model downloads. Pre-warm in the background on component mount, serve real-time lightweight CV heuristics immediately (< 4ms), and hot-swap to neural tensor inference once initialized.
4. **Concurrency Lock on Video Ticks**: Always guard asynchronous video frame detection calls with an `isAnalyzingRef` lock to prevent overlapping promises from choking the JavaScript event loop.
5. **Synchronous Mobile Audio Dispatch**: On mobile Safari and Chrome, invoke `speechSynthesis.speak()` and `AudioContext.resume()` synchronously in the user event turn. Supplement speech with procedural Web Audio oscillator chimes for 100% audible feedback across all devices.
