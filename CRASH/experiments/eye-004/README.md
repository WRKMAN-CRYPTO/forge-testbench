# Eye 004: Brightness Trap

Eye 003 is preserved. Eye 004 compares equal original brightness against independently randomized original brightness (16..255). Both use the same 16-frame age-dependent bit-shift and opacity rule. The learner receives only two grayscale RGB triples from the resulting composite and correctness feedback during training. The ground truth and original brightness stay in the laboratory.

Use Eye 003's Export results JSON, import it here, then Evaluate 1,000 in each condition *before* training. You can also start from zero weights, train on one condition, switch conditions and evaluate without further training. Training uses the same three-feature logistic learner and learning rate as Eye 003, but this standalone lab uses deterministic argmax for the final displayed choice; evaluation predictions remain stochastic, matching Eye 003. Import transfers weights, not the historical training data or frames.

The two events occur at different positions and ages. Brightness and age can be observationally confounded, so a single composite may not contain enough information to infer the correct order. Brightness reversal rate and evaluation accuracy are reported. Strong performance here would not alone demonstrate a general concept of time. This is a synthetic controlled test, not an autonomous world-exploration task.
