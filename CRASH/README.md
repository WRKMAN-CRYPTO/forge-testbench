# CRASH ZERO

Crash is Red's browser-based experimental stunt double.

## One immutable property
The name **CRASH**. No brain, Commander, senses, memory, action system, hierarchy, or continuity is required.

## Layout
- `index.html` and `hq/`: phone-friendly laboratory UI
- `core/`: external registry and runtime lifecycle, not Crash's intelligence
- `armory/`: independent optional equipment modules
- `worlds/`: independently loaded test environments
- `experiments/`: isolated configurations and test protocols
- `archive/`: exported observations and snapshots (browser downloads, not automatically committed)

## Experiment protocol
Equip optional modules, run or step, observe, export a snapshot, reset. HQ events must never be mistaken for Crash's memories or learned knowledge. Crash Zero starts with zero installed intelligence.

## Module contract (v0)
An armory module exports `{id,slot,name,create()}`; its instance may implement `step({tick,record})`. Import it in `armory/manifest.js`. The contract is a replaceable laboratory adapter, not an immutable brain architecture.

## Safety and persistence
Runs operate only inside this page. The current build has no network actions, desktop access, or automatic persistence. Export snapshots before closing the tab. Snapshot import and world adapters are future experiments.
