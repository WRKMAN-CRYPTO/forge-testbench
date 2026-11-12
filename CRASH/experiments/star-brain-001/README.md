# Crash Star Brain 001

Experimental, not validated. Original physical integrator copied from thermal-chamber-001/index.html, with N=100 and spawnWidth=50. Chamber is unrendered. Fixed agent 0 counts 99 votes, seeded random ties. Three actions left/stay/right. Private 32-slot memories, learned per-action values, agent-chosen 32x32 region/channel/temporal mode. 10-frame cumulative RGB-derived buffers. Heat affects stochastic vote commitment; reward injects heat into physical state. First-stage ball catching, no bricks.

## Caveats
- Original chamber's hottest-agent leader election and delayed-message cognition are disabled; its physical step remains unchanged. This is not yet a proof of preserved star structure.
- The training referee approximates each candidate action's future landing with a frozen-action rollout; it is not an exact full future policy evaluation. This approximation can mislabel long-horizon choices.
- Initial attention mutations are unguided, not yet learned attention optimization. RGB is currently a luminance summary; red/green/blue are independent channels.
- Heat may be zero early, and no improvement is guaranteed. Catch rate is based on actual paddle contacts; per-decision alternative correctness is an auxiliary training signal.
- Need physics-only paired baseline, training-free held-out evaluation, and stronger counterfactual simulator in subsequent builds.
