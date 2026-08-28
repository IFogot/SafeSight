# Computer Vision, Mobile ML, & Audio Best Practices

1. **Dynamic Sub-Feature State Tracking**: Never hardcode compliance for PPE sub-components (glasses, gloves, vests, hard hats). Always calculate live pixel features to detect state transitions (wearing vs removed) on every frame in real time.
2. **Multi-Zone Weighted Composite Classifiers for Eyewear**:
   - Avoid rigid binary AND conditions across micro-features like nose bridges and lower rims.
   - Aggregate normalized features into a continuous weighted confidence score:
     $$\text{Eyewear Score} = (0.35 \times \text{Bridge}) + (0.35 \times \text{Orbit Rim}) + (0.20 \times \text{Cheek Rim}) + (0.10 \times \text{Glints})$$
   - Calibrate with a wide separation margin ($\tau = 0.35$): bare faces score $\le 0.22$, while all glasses styles (wireframe, safety goggles, rimless) score $\ge 0.55$.
3. **Zero-Wait Mobile Inference Loop**: Never block the animation or video frame loop on heavy WASM/ONNX model downloads. Pre-warm in the background on component mount, serve real-time lightweight CV heuristics immediately (< 4ms), and hot-swap to neural tensor inference once initialized.
4. **Concurrency Lock on Video Ticks**: Always guard asynchronous video frame detection calls with an `isAnalyzingRef` lock to prevent overlapping promises from choking the JavaScript event loop.
5. **Synchronous Mobile Audio Dispatch**: On mobile Safari and Chrome, invoke `speechSynthesis.speak()` and `AudioContext.resume()` synchronously in the user event turn. Supplement speech with procedural Web Audio oscillator chimes for 100% audible feedback across all devices.
