# Pixel Society — Expedition 08: The Working Class (v0.9)

## Question

Can pixel agents form a usable user interface by **recruiting and directing one another**, with distinct occupations, rather than following a complete per-pixel image blueprint? Do communication failures, job shortages, and incomplete borders matter?

This is still a hand-designed computational model, not sentient or language-model agents. Agent decisions are scripted local rules with stochastic recruitment and resistance.

## New classes

- **BUTTON**: Four starting leader pixels, one per physical region (GO, UP, ON, HI). Each manager has its own region, small letter label, and authority over recruits. The chief remains one actual pixel, not an HTML element. A leader's supporters gradually adopt border instructions and can resist.
- **LINKER**: Hired by button makers and able to recruit adjacent pixels into linker chains, including converting existing ordinary members of the same group. Only cardinally adjacent chains can transmit to another group. Transmission has no cross-gap teleportation.
- **FORMATTER**: Appointed from previously recruited workers. On an explicit WIPE order, a formatter erases nearby testimony/knowledge/certainty/source data using the same memory-forgetting mechanism as the original experiments. This does not delete job identity or an entire group.
- **TEXT**: Appointed from an existing button maker's recruits only. The label glyph is a fixed, inherited two-character instruction provided by its manager. Before a text maker joins, the region cannot be issued the glyph command.

All 4 classes are properties of individual logical-pixel agents. **Clan** membership is separate from the class, so ordinary workers remain the majority and are visibly involved in forming the border and letters. Managers supply constraints but **do not directly paint an entire finished button**. The model still contains a designed rectangle grammar and fixed 5×7 glyph font. It is not independent invention of UI elements.

## How to explore

1. Tap **JOBS** in the field header to start the work society. WILD is automatically enabled if needed, then the construction area is cleared to neutral agent states without prepainting completed buttons. The old free colony outside can continue evolving.
2. Allow recruitment. At first, workers may be too scarce to form legible buttons. The group hires linkers first, text makers after at least nine workers, and formatters after at least sixteen.
3. Tap inside one of the four developing button regions to request a message. **NO LINKER** means its group has nobody to carry it. **SENT LOCAL ONLY** means a local linker could transmit, but the reachable chain did not bridge to another clan. **MESSAGE TO ...** means the linker chain reached another group.
4. Tap **WIPE**, then tap a button region to instruct its recruited formatter to erase testimony near that formatter. The tap is rejected if that maker has no linker or no formatter.
5. Tap **JOBS** again to stop the occupational rules. Other v0.8 controls (TRACE, PLAST, PULSE, WILD, BREAK, HEAL, TRAIN, SELECT, RELAY, PATHS, REST, LEARN) remain on the single canvas.

JOBS and WIPE are fixed *instrument controls*, like the original colony's controls. They are not claimed to have emerged spontaneously.

## Display

The lower status strip shows class counts (B, L, F, T), workers recruited, border completion relative to **all planned perimeter positions**, number of buttons with a text-maker, messages sent / remote deliveries / formatting actions, and the last result. The header controls themselves are pixel agents. A message wave temporarily highlights the linkers it traverses; their ability to connect groups is computed from their actual cardinal adjacency.

## Local validation

- JavaScript syntax checked using Node.
- Chromium smoke-tested on **390 × 844**, **320 × 600**, and **844 × 390** viewports with no JavaScript exceptions.
- On all three viewports, clicking the *actual touchscreen coordinates* for JOBS enabled the job economy. After 360 accelerated simulation updates, all four text-makers had been recruited; tapping a button successfully initiated local signal transmission, and WIPE followed by a button tap caused one formatter action.
- In one actual touch test with the same evolving starting conditions, a cross-clan message was delivered on the 390 × 844 and 320 × 600 layouts; on the 844 × 390 layout, local sends succeeded but the selected chain did not reach another group.
- In a separate 390 × 844 longer run, by several hundred updates there were hundreds of linkers, partially constructed borders, and some cross-group deliveries. Other sender groups still failed to connect.

These are narrow functional smoke tests, not statistical proof of robust self-organized interface construction. Border completion is deliberately incomplete and visually noisy. Agents do not understand words: glyph shapes are a fixed manager-issued font. Formatting erases *testimony*, not occupation or genetic information.

## Architecture and limitations

- A single full-viewport HTML canvas remains the only rendered UI element.
- Jobs are typed arrays per agent; leaders have a handful of attributes (location, label, affiliated workers). Recruiting neighbors can refuse; there is no precomputed full-screen target picture.
- The four initial bosses and their region boundaries are deliberately planted by the simulation. A future experiment might require leaders to negotiate territory and layout themselves.
- The new job subsystem affects agent colors and memory, but does not replace existing v0.8 network plasticity experiments.
- The visible message wave is diagnostic; successful route connectivity is evaluated using actual LINKER occupation and adjacency.
- Local Chromium checks do not independently verify public Vercel readiness. GitHub commit verification is separate.

## Archives

- `index.html` — current v0.9
- `v0.8.html` — prior Path Memory experiment
- `v0.7.html` and earlier archives retained.

## Next test

Remove the managers' fixed rectangles and test whether **border-making leaders can negotiate regions with one another**. Until then, the simulation demonstrates class-specific recruitment and communication, not genuine spontaneous UI invention.
