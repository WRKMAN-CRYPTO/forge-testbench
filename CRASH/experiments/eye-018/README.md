# Eye 018: Factory Audit

No learner. This replicates Eye 016's `scene(d,dist)` logic and its 4×4 candidate extractor, including the forbidden inward ray, near-marker distractor preference, red/green balance, white marker, and 12 offsets. Audits 12,000 scenes with 1,000 per direction×distance stratum.

Metrics: number of colored candidates that have *any* white marker offset in the twelve-feature bank, fraction with uniquely activated candidate, whether target is nearest marker, chance-correct nearest oracle (ties split), fraction with distractor closer than target, whether the true target is unique on the generator's hidden inward ray, and candidate counts. The generator makes the true target unique on its inward ray **by construction**, but the ray direction is not observable in the scene.

Important: this is a descriptive audit of generated pixels and engineered features. Multiple eligible candidates do not prove identical scenes can receive conflicting labels, nor quantify the Bayes-optimal error. For that, analyze exact image likelihoods or perform paired counterfactual generation. The generator is duplicated here from Eye 016 and should be kept in sync only if an explicit new version is created. Eye 016 remains unchanged.
