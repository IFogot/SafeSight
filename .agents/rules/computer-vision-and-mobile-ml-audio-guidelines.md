# Computer Vision, Mobile ML, & Audio Best Practices

1. **Golden Balance Ocular Sentinel for Eyewear Detection**:
   - Use multi-directional 2D gradient threshold of `22` to reliably capture thin wireframe glasses, clear polycarbonate safety goggles, and rimless eyewear without triggering on smooth facial skin.
   - Use yaw-tolerant nasal windows ($x: 0.38 - 0.62$) and lateral temple windows ($x: 0.12 - 0.30$ & $x: 0.70 - 0.88$) to accommodate natural head tilt and rotation up to $\pm 25^\circ$.
   - Calculate composite structural score: $S_{\text{eyewear}} = 0.40 \times \text{Bridge} + 0.35 \times \text{Lateral} + 0.25 \times \text{Cheek}$.
   - Pass condition: $S_{\text{eyewear}} \ge 0.20 \lor (\text{Bridge} \ge 0.10 \land (\text{Lateral} \ge 0.08 \lor \text{Cheek} \ge 0.08)) \lor \text{Glints} \ge 2$.
2. **Adaptive Anthropometric Landmark Mapping**: Never use static percentage offsets to locate head, eyes, and torso across arbitrary crops. Calculate the detected bounding box aspect ratio ($AR = \text{height} / \text{width}$) and scale anatomical landmark anchors dynamically ($AR < 1.35$ for portrait crops with eyes at $y = 0.34$, $AR \ge 2.0$ for full-body standing with eyes at $y = 0.12$). This ensures bounding boxes and feature samplers always track real facial features and never sample hair as eyewear.
3. **Dynamic Sub-Feature State Tracking**: Never hardcode compliance for PPE sub-components (glasses, gloves, vests, hard hats). Always calculate live pixel features to detect state transitions (wearing vs removed) on every frame in real time.
4. **Zero-Wait Mobile Inference Loop**: Never block the animation or video frame loop on heavy WASM/ONNX model downloads. Pre-warm in the background on component mount, serve real-time lightweight CV heuristics immediately (< 4ms), and hot-swap to neural tensor inference once initialized.
5. **Concurrency Lock on Video Ticks**: Always guard asynchronous video frame detection calls with an `isAnalyzingRef` lock to prevent overlapping promises from choking the JavaScript event loop.
6. **Synchronous Mobile Audio Dispatch**: On mobile Safari and Chrome, invoke `speechSynthesis.speak()` and `AudioContext.resume()` synchronously in the user event turn. Supplement speech with procedural Web Audio oscillator chimes for 100% audible feedback across all devices.
