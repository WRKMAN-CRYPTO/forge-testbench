# Eye 017: The Counterfeit World

An isolated identifiability audit. Each ambiguous pair renders two scenes with **exactly identical pixels** but opposite intended targets. Since candidates have opposite colors, the labels also contradict. No pixel-only learner can score above 50% over each balanced pair. This is a deliberately impossible task, not a measure of intelligence.

The visible-cue condition paints a cyan 4×4 tile immediately toward the intended target, making otherwise identical arrangements distinguishable. Both models are logistic learners with engineered features: candidate-side color sign, cue direction, their product, and bias. The product feature makes the visible task linearly solvable. This is not proof of learning a pointer from raw pixels: cue and colors are pre-extracted into numeric features. The twin inspector renders both images and checks byte-for-byte equality.

Train 6,000 pairs then evaluate 1,000 held-out pairs. Ambiguous training processes opposite labels consecutively, avoiding any hidden answer from trial order; evaluation uses paired labels. Visible cue changes pixels between twins. Report accuracy, identical-image contradiction counts and model weights.

**Interpretation:** This audit demonstrates why a generator's hidden target assignment cannot serve as learnable ground truth unless the pixels uniquely identify the target. It does **not** prove Eye 015 or 016 were impossible: those experiments had a clear-ray generator rule and other learnable statistical structure. It motivates a later audit of their exact generator distribution and counterfactuals.
