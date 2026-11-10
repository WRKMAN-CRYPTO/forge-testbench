# Eye 001: Point Wanderer

A standalone, mobile-friendly laboratory for sparse pixel sampling.

- World: 32×32 binary pixels, inaccessible to the sampler except via `read(x,y)`.
- Sampler: exactly one point measurement per step.
- Memory: 16 most recent point measurements (duplicates consume slots).
- Policies: random baseline, sequential sweep, and a hand-coded revisit heuristic.
- Laboratory: independent mutation controls, ground-truth display, logs, JSON export.

**No learning algorithm is installed.** Policies are fixed strategies. A detection requires revisiting a point while its prior measurement remains in working memory. Detection counts are not accuracy rates: missed mutations cannot be inferred from these logs alone. The memory panel shows only currently retained samples. Experiment intentionally excludes lines, shapes, OCR, symbols, and object labels.
