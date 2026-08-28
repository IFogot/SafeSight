# Computer Vision, Mobile ML, & Audio Best Practices

1. **Dynamic Sub-Feature State Tracking**: Never hardcode compliance for PPE sub-components (glasses, gloves, vests, hard hats). Always calculate live pixel features to detect state transitions (wearing vs removed) on every frame in real time.
2. **Self-Calibrating Differential Frame Signatures for Eyewear**:
   - Never rely on absolute thresholds or rigid gates for eyewear detection.
   - Measure upper baseline facial density ($G_{\text{brow}}$) and normalize lower frame edge features (cheek rim + nose bridge) against it:
     $$R_{\text{frame}} = \frac{\text{CheekDensity} + 1.2 \times \text{BridgeDensity}}{\text{BrowDensity}}$$
   - Decision boundary:
     - $R_{\text{frame}} < 0.45 \rightarrow$ Bare Face (Violation).
     - $R_{\text{frame}} \ge 0.45 \rightarrow$ Glasses Worn (Compliant).
3. **Zero-Wait Mobile Inference Loop**: Never block the animation or video frame loop on heavy WASM/ONNX model downloads. Pre-warm in the background on component mount, serve real-time lightweight CV heuristics immediately (< 4ms), and hot-swap to neural tensor inference once initialized.
4. **Concurrency Lock on Video Ticks**: Always guard asynchronous video frame detection calls with an `isAnalyzingRef` lock to prevent overlapping promises from choking the JavaScript event loop.
5. **Synchronous Mobile Audio Dispatch**: On mobile Safari and Chrome, invoke `speechSynthesis.speak()` and `AudioContext.resume()` synchronously in the user event turn. Supplement speech with procedural Web Audio oscillator chimes for 100% audible feedback across all devices.
