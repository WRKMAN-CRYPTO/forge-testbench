# WRKMAN Agent·Field v0.1

Standalone phone-first programmable magic behavior-field lab. This is an experiment, **not integrated with the roguelike or the existing Agent·Magic build**.

## Core idea

A **32 × 32 instruction map** assigns values 0–255 to grayscale cells. Agents begin near the brightest cells, follow descending values, and make visible hexagonal spell patterns. **Exact `#FF00FF` is reserved for no-instruction space**, not a visible agent color and not an obstacle. Agents retain momentum and can coast across masked cells and re-enter the field elsewhere.

- `255` (white): starting region
- `128` (gray): intermediate progression
- `0` (black): destination
- `#FF00FF`: no guidance, traversable

**A mode:** map primarily controls directional movement.

**A+B mode:** map also modulates size, color, and speed by grayscale progress.

## Map editor

Paint white, three grays, black, or magenta, with an adjustable brush. Preset generators: Gravity Well, Spiral Gate, Magenta Gap, Sigil Circuit, Blank/Free. A live overlay shows the field on the spell canvas for debugging.

**Save locally** uses browser localStorage. **Export JSON** creates a portable field with 1,024 integer values (`-1` = FF00FF). **Import JSON/PNG** supports reusing field designs. PNG import expects exact magenta (`#FF00FF`); lossy JPEG isn't supported. A 32 × 32 PNG is recommended.

## Architecture and limitations

The field contains instructions rather than rendered frames. Rendering remains a swarm of independent hexagon agents. A local finite-difference gradient steers valid-cell motion; movement inside masked cells is inertial. For experiments, stage-boundary behavior currently wraps at canvas edges. There is no promise of global route-finding through arbitrary disconnected fields or mathematically guaranteed convergence, and all motion rules are experimental.

This first pass isn't a complete compiler for spell behavior. It establishes a small, portable interface for later spell configuration while keeping the original Agent·Magic and roguelike untouched.