# Computer Vision, Mobile ML, & Audio Best Practices

1. **Dynamic Sub-Feature State Tracking**: Never hardcode compliance for PPE sub-components (glasses, gloves, vests, hard hats). Always calculate live pixel features (differential Sobel gradients, specular glint highlights, color variance) to detect state transitions (wearing vs removed) on every frame in real time.
2. **Zero-Wait Mobile Inference Loop**: Never block the animation or video frame loop on heavy WASM/ONNX model downloads. Pre-warm in the background on component mount, serve real-time lightweight CV heuristics immediately (< 4ms), and hot-swap to neural tensor inference once initialized.
3. **Concurrency Lock on Video Ticks**: Always guard asynchronous video frame detection calls with an `isAnalyzingRef` lock to prevent overlapping promises from choking the JavaScript event loop.
4. **Synchronous Mobile Audio Dispatch**: On mobile Safari and Chrome, invoke `speechSynthesis.speak()` and `AudioContext.resume()` synchronously in the user event turn. Supplement speech with procedural Web Audio oscillator chimes for 100% audible feedback across all devices.
