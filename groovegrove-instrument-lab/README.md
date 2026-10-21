# GrooveGrove Instrument Lab (isolated)

A browser-only, single-canvas iPhone test bench. No living GrooveGrove agent,
Railway API, recording, persistent memory, skill, or instrument ownership is
read or modified.

## A/B comparison

- **A, Original Grove**: `legacy-sound.js` contains an exact copy of the
  production `SoundEngine` class at the time of this experiment, with only
  the surrounding export and required global helpers added. This is the
  listening baseline, not a replacement in production.
- **B, Recorded model**: `smplr@1.1.0` (MIT), using 4 sparse samples per
  instrument and built-in repitching to cover the test notes. Sampled violin
  uses *VSCO 2 CE Solo Violin / Arco Vib / piano layer*. Sampled plucked string
  uses *VCSL Strumstick / Finger*, explicitly not a nylon-string guitar.
  Both sample collections were published by Versilian Studios under CC0.
- All tests use the exact same deterministic frequency/time/duration/volume
  sequences in both renderers. The sampled engines may differ naturally in
  decay envelope; that difference is the point of the test.
- Samples load **only** after the human selects Sampled and taps Play.
  No automatic download of an entire SoundFont. If samples fail to load,
  the app displays an error, not an invented fallback sound.

## Attribution and source

- smplr source and MIT license: https://github.com/danigb/smplr
- VSCO 2 CE CC0 license: https://github.com/sgossner/VSCO-2-CE
- Solo violin WAV: https://github.com/sgossner/VSCO-2-CE/tree/master/Strings/Solo%20Violin/Arco%20Vib
- VCSL CC0 license: https://github.com/sgossner/VCSL
- Finger Strumstick WAV: https://github.com/sgossner/VCSL/tree/master/Chordophones/Composite%20Chordophones/Strumstick/Finger
- Source samples served by jsDelivr from upstream public GitHub repos.
  VCSL is referenced at master for this disposable lab; pin a source
  revision and locally verify all assets before any production use.

## What this is NOT

Not an AI instrument-choice mechanic. No sample preferences are inferred.
No model IDs were added to old tapes. No new permanent instruments were
created in the active Grove. A future, separately approved integration would
need durable model IDs, exact sound renderer versions, separate per-model
familiarity, and default legacy rendering for all existing jam tapes.

## Manual iPhone test

1. Open the lab in Safari and tap **ENABLE AUDIO**.
2. Set guitar and **ORIGINAL**, tap **MELODY**, then play. Listen to the timing.
3. Switch to **SAMPLED**, play the same notes. Wait for four CC0 files to load.
4. Repeat NOTE / CHORD and switch to VIOLIN; compare original vs sampled.
5. Background and restore Safari or receive a phone call, then confirm audio
   can be re-enabled with a fresh tap.
6. Watch any loading errors and whether fast chords crackle or drop notes.
7. Confirm GrooveGrove's separate Railway page and historical tapes are
   unchanged.

No claim of device testing is made until a person auditions the running lab.
