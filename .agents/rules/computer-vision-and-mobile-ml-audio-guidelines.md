# Computer Vision, Mobile ML, & Audio Best Practices

1. **Dynamic Sub-Feature State Tracking**: Never hardcode compliance for PPE sub-components (glasses, gloves, vests, hard hats). Always calculate live pixel features to detect state transitions (wearing vs removed) on every frame in real time.
2. **Eyewear Anatomical Zone Decomposition**:
   - Never sample generic eye boxes (`12%-26%` height) because natural eyebrows, eyelashes, and dark pupils produce false positive glasses detections on bare faces.
   - Decompose into **Nose Bridge Strip** (`x: 0.45-0.55`, `y: 0.16-0.23`) to test for the central horizontal bridge bar and **Lower Cheekbone Rim Zone** (`x: 0.22-0.78`, `y: 0.23-0.29`) below the eye orbits.
   - Require dual-zone correlation (both bridge edge density and lower rim density) or verified polycarbonate specular glints to confirm eyewear.
3. **Zero-Wait Mobile Inference Loop**: Never block the animation or video frame loop on heavy WASM/ONNX model downloads. Pre-warm in the background on component mount, serve real-time lightweight CV heuristics immediately (< 4ms), and hot-swap to neural tensor inference once initialized.
4. **Concurrency Lock on Video Ticks**: Always guard asynchronous video frame detection calls with an `isAnalyzingRef` lock to prevent overlapping promises from choking the JavaScript event loop.
5. **Synchronous Mobile Audio Dispatch**: On mobile Safari and Chrome, invoke `speechSynthesis.speak()` and `AudioContext.resume()` synchronously in the user event turn. Supplement speech with procedural Web Audio oscillator chimes for 100% audible feedback across all devices.
