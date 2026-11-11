# Eye 015: The Distance Trap

A new isolated experiment. Ten balanced persistent red/green 4×4 objects and a white 4×4 marker are rendered into a 32×32 ten-frame additive RGB memory. The marker is 1, 2, or 3 tiles from the target in one cardinal direction. The target color determines the binary feedback. Balanced red/green totals are a negative control.

The front end is **not raw perception**: it supplies 4×4 candidate segmentation and twelve neighbor RGB samples (four cardinal directions times distances 1, 2, 3). Twelve trainable weights score white-neighbor intensity, softmax attention selects a weighted color signal, and a logistic head maps it to A/B. Training with distance 1–2, then evaluating at distance 3, probes whether weights generalize to a withheld offset. Training all distances tests whether the architecture can learn each offset. Weights start at zero, classification head at 0.2 to break zero-gradient symmetry.

For a well-posed task, the generator excludes distractor objects from the marker's inward ray at distances 1–3. Crowded mode places some distractors near the marker, but never on that ray. This **engineered rule** resolves ambiguous reference; it does not prove the learner understands pointing. In addition, other distractors can lie at different offsets from the marker and compete. Chance candidate attention is ~10%. The global control should be ~50%. Evaluation freezes weights and exports accuracy by distance.

Suggested tests: train near / evaluate near, then without retraining evaluate far; reset, train all / evaluate all. Inspect per-distance accuracy, target attention, and learned offset weights.
