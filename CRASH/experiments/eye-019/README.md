# Eye 019: The Honest Factory

Paired comparison using the Eye 016 scene generator, same balanced 12-stratum examples and same online SGD. Hidden factory sees the original RGB image; honest factory receives the same image with a cyan 4×4 directional cue painted on the tile between marker and intended target. Both have 12 offset attention weights and a color head. Honest adds 4 cue-direction weights.

**Critical limitation:** the honest learner's engineered cue feature is activated by generator-derived direction and distance. While the cyan pixel is rendered and is consistent with the feature, the code currently **uses hidden generator fields** to select the target tile for cue attention. This is an oracle feature, not a legitimate pixel-only perception test. Its performance is an upper-bound control, not evidence that Crash decoded a visual pointer. Do not interpret any success as learning visible geometry. Future version should decode cyan position from mem and evaluate candidate rays at all distances without t.d or t.dist.

Train 12,000 examples per learner and evaluate 1,200 stratified held-out samples. Original generator's clear inward ray and crowded distractor behavior preserved. Eye 016 remains unchanged.
