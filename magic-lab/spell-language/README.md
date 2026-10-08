# WRKMAN / Spell-Language (SL)
### Version 0.1, architectural seed • STATUS: DORMANT

> **Players discover the magic. Spell-Language remembers how they did it.**

This is the future programmable-combat foundation for Arcane Lab and eventually co-op. SL is inspired by the *Agent-Language* experiments, but it does not give spells arbitrary code execution or freedom to invent physical laws. Spells are small, bounded **procedures that request normal magic actions in a world that enforces its own material and combat rules**.

**Not enabled:** No import from \`../index.html\`, no script tag, no spell button, no localStorage, no automatic recording, no live event subscriptions, no learned shortcuts, no game simulation, no player-to-player transfers, and no network synchronization. These files are design groundwork only.

## Design goals

1. **Real emergence, not hardcoded recipes.** There is no special \`Frost + Fire + Lightning -> Thunder Sphere\` rule. Elemental transitions would occur inside the world simulation. SL merely decides what spell to *try* next and when.
2. **Remember a method, not its final animation.** A spell can emit Gravity Well, wait until foes converge, attempt Frost, wait until frozen, add Flame, wait until vapor is detected, then attempt Lightning. If the conditions fail, the attempt can fail too.
3. **One shortcut, many world interactions.** Combining four spells never skips their individual energy costs, cooldowns, world preconditions, or physics. The shortcut only automates *choosing and sequencing* them, with an eventual explicitly balanced overhead.
4. **Small, inspectable, transferable.** Recipes can be diffed, traced, forked, and shared. Their input assumptions and choices must remain visible. User-written names do not override their program logic.
5. **No hidden self-editing.** Repetition generates suggestions, not changes. Every proposed evolved recipe must pass replay tests and explicit player confirmation before it can replace or augment a usable spell.

## Repository layout

- \`engine.js\`: isolated interpreter, program validator, explicit shortcut suggestion analyzer, and manual lineage fork constructor. Pure offline planning. Browser globals not required; loading it does not launch anything.
- \`stormglass.draft.json\`: example, *not equipped*, using Gravity/Frost/Flame/Lightning. Some future effects and material observations in this example are not implemented in Arcane Lab.
- \`tests.js\`: offline test cases. Run \`node magic-lab/spell-language/tests.js\` from repository root (or \`node tests.js\` in this directory).

## Vocabulary: what a spell knows

| Opcode | Meaning | Observable result |
|---|---|---|
| \`FOCUS\` | Select symbolic target strategy (\`enemy_cluster\`, \`nearest_enemy\`, \`aim_point\`, \`self\`) | Sets an intended selector, **not** a locked entity ID |
| \`CAST\` | Request an allowlisted atomic ability, charged against provisional energy budget | Emits one \`CAST_INTENT\`; no actual gameplay call |
| \`UNTIL\` | Wait for a named world observation (such as \`target.frozen\`) | Advances on true; fails after bounded timeout |
| \`WAIT\` | Wait a bounded number of simulation ticks | Advances after time, no real-time timers |
| \`IF\` | Test a named observation and optionally skip forward | Only forward branches, no unbounded loops |
| \`END\` | Finish cleanly | Reports completed |

**No** \`EVAL\`, arbitrary JavaScript, recursion, unbounded loops, direct entity mutation, external URL access, account/wallet instructions, background scheduling, or write-to-storage operations.

The "agent" aspect is *procedural adaptation across explicitly tested draft generations*, not consciousness, independent unrestricted execution, or free-form AI script writing inside a combat tick.

## Recipe shape (v0.1)

Every recipe has:
- \`format\`: exactly \`wrkman.sl/0.1-draft\`
- \`id\`: portable stable logical ID, \`name\`, positive \`version\`
- \`status\`: exactly \`draft\` in this seed
- \`lineage\`: \`rootId\`, optional \`parentId\`, and \`generation\`
- \`program\`: a forward-only instruction list ending with \`END\`

See \`stormglass.draft.json\` for the canonical example. For example:

\`\`\`text
FOCUS enemy_cluster
CAST gravity.well
UNTIL cluster.converged (24 ticks)
CAST frost.field
UNTIL target.frozen (36 ticks)
CAST flame.field
UNTIL vapor.present (48 ticks)
CAST lightning.arc
END
\`\`\`

These predicates **do not become true just because an instruction was executed**. Future world-simulation adapters must provide grounded observations. A failed condition times out; it must never magically materialize the needed material or target.

## Interpreter contract

\`\`\`text
recipe + interpreterState + read-only observation snapshot
    → next interpreterState + [zero or one CAST_INTENT]
\`\`\`

An example intent:

\`\`\`json
{
  "kind": "CAST_INTENT",
  "recipeId": "stormglass.seed",
  "pc": 1,
  "tick": 1,
  "effect": "gravity.well",
  "targetSelector": "enemy_cluster",
  "estimatedEnergy": 10,
  "approval": "required"
}
\`\`\`

An intent is a request only. **It is never authoritative.** A future runtime adapter would resolve the target, verify ownership and resource budget, check cooldowns and valid material transitions, then call the same atomic spell machinery that the player uses manually. Current \`COST\` values are placeholders for the draft validator, not live gameplay balance. The adapter should use the authoritative combat cost schedule, not trust untrusted recipe-provided values.

### Hard stops (draft limits)

- Max 24 instructions, 8 proposed casts, and 44 provisional energy units.
- Max 240 interpreter ticks per run; \`WAIT\` max 60 ticks; \`UNTIL\` max 90 ticks.
- Only one cast intent may be proposed in a tick.
- \`IF\` can jump forward only. Unknown opcodes/fields/effects are rejected.
- Timed-out observations fail closed. Caller must not turn a failed run into a successful shortcut.
- A future live adapter must enforce its **own** per-player/per-frame budgets, queue caps, and multiplayer server permissions. This validator is an offline design tool, not an untrusted-code sandbox or anti-cheat system.

## Skill memory and shortcut discovery

The eventual recorder should capture **normalized, consented play events**, not raw touch coordinates or every game frame:

\`\`\`text
Run 1: gravity.well → frost.field → flame.field → lightning.arc  [success]
Run 2: gravity.well → frost.field → flame.field → lightning.arc  [success]
Run 3: gravity.well → frost.field → flame.field → lightning.arc  [success]
                  ↓
          SUGGESTED RECIPE
          "Practice has revealed a pattern."
                  ↓
        PLAYER INSPECTS + APPROVES
                  ↓
     OFFLINE REPLAY + SAFETY VALIDATION
                  ↓
         FUTURE EQUIPPABLE DRAFT
\`\`\`

What exists today: \`suggestFromRuns(runs, {minimum:3})\` accepts **explicit independent attempt records** with unique IDs, known spell keys, and an explicit \`success\` boolean. It counts repeatable exact sequences and returns \`status: "suggestion-only"\`. It **does not** record play, derive success from physics, discover sub-sequences automatically, create recipes, or unlock abilities.

Planned recorder responsibilities:
- Track session/run ID, time ordering, cast effect, target strategy, and success signal. Store only what is needed, with player approval and clear retention boundaries.
- Distinguish an intentional chain from four unrelated casts; use temporal proximity, environment causality, and repeated outcomes as *evidence*, not proof.
- Ask whether to keep, dismiss, or inspect each candidate. No automatic recording until specifically enabled.
- Propose a forward-only SL program, replay against identical starting state/seed/PRNG when available, compare outcomes with the manual sequence, and report failures instead of hiding them.
- Preserve uncertainty. For example, "three successful attempts" is not evidence that a shortcut works in every encounter.

## Evolution and lineages

**A spell is a recipe program + tests + ancestry.** A future spellbook entry could carry:
- immutable revision ID + content hash, logical spell family ID, parent revision(s), author permission metadata, provenance of manual vs suggested changes
- compiler version, world/physics rules version, seed/PRNG state and replay fixture references
- fitness metrics from repeatable trials (success, energy, time, damage, unintended consequences, performance cost)

Current \`forkDraft(parent, {id,name,program})\` makes a *new draft* with its parent's ID and inherited root. The parent program is deep-copied and never mutated. Forking never triggers automatic play or inheritance of access permissions. No publisher or network lineage authority exists yet.

### Candidate evolution loop (future, OFF by default)

1. Observe repeated sequences after player opt-in.
2. Produce **candidate** program variants under the same finite instruction grammar.
3. Run each candidate against deterministic replay fixtures, with original and mutated sequences tested under comparable seeds and encounter state.
4. Report real tradeoffs: e.g. 9% faster, 7% less damage, 1 timeout. Never silently optimize away player preferences.
5. Let the player **promote, keep as branch, or discard**. The lineage graph records any accepted branch; neither child's success nor age guarantees superiority.
6. For co-op, share portable recipes **with consent**, then validate and run them under an authoritative synchronized simulation. No peer gets power to bypass another player's safety budgets.

## World-material interface (future, not implemented)

SL should consume **observations** and output **intent**. The material simulation supplies the causal rules:

\`\`\`text
frost → temperature decreases → freeze / brittle state
flame → temperature increases → melt / steam under suitable moisture + heat
lightning → electrically charged discharge inside suitably energized vapor
gravity/detonation → changes momentum and cloud/debris placement
\`\`\`

Temperature, phase, moisture and electrical propagation are proposed future capabilities, **not** features quietly added to Build 009. Steam would need meaningful volume, temperature, lifetime and movement properties. Lightning-in-steam would use consistent magical conductivity/ionization rules instead of a magic "three spell combo" trigger.

## Integration boundary and activation gate

**This PR-sized seed is deliberately disconnected.** Before wiring it into the live lab, we need separate user permission and a new explicit integration task:

1. A read-only game-world observation adapter (snapshots, not writable Matter references).
2. A safe intent-to-cast adapter enforcing all gameplay costs, targets, cooldowns, permission and physics preconditions.
3. A minimal opt-in recipe viewer and live-vs-manual comparison, first in a local isolated test chamber.
4. A recording consent and storage design (mobile-first; no surprise data collection).
5. Deterministic replay, seeded failure fixtures, perf budgets and potentially server-authoritative co-op.
6. **Explicit human approval to enable SL.** No version bump or "learning" toggle has been added to the existing Arcane Lab.

If the user says "design bones, but do not make it live," this file is the boundary to respect.

_W • Clock In. Build Something._
