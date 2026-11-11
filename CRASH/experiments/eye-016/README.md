# Eye 016: The Fair Fight

Isolated comparison of training algorithms, not a new perception architecture. Two learners receive exactly the same stratified examples, each 12-scene minibatch containing one trial for every distance (1,2,3) and direction (above,right,below,left). Both use the Eye 015 4×4 engineered candidate extractor, 12 neighbor offset features, softmax attention and logistic classifier.

**Original** applies Eye 015-style online gradients after each scene. **Balanced** accumulates gradients on the same 12 scenes, averages by stratum (one per stratum), caps total gradient norm at 1 and applies mild weight decay to attention weights. Because exposure is balanced for both, any difference is due to optimization (online versus batch, clipping/decay), not amount of experience. The batch learner is not mathematically identical to the original learner and the experiment does not isolate clipping from decay or batching.

Training runs 12,000 examples. Held-out evaluations use 1,200 new stratified scenes, freeze weights and report accuracy by distance, attention by distance, and checkpoints. The RGB scene is an additive 10-frame equivalent. Color totals balanced. Distractors near marker, but generator forbids candidates on the marker's inward target ray within three tiles, so task still contains engineered geometry shortcuts. Chance candidate attention approximately 10%; global color control approximately 50%.

**Interpretation:** if both struggle, the fixed feature bank and scene structure may be inadequate; if balanced does better, optimization matters; if original does better, regularization/batching may suppress specialization. Repeat across resets to assess variance. A single run does not prove a general learning principle.
