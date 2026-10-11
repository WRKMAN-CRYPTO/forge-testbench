# Agent·Magic v0.3.1 | Stable spell lifecycle

Standalone WRKMAN hex-agent magic experiment. No roguelike integration.

## What's fixed

- **Fireball** charges at 5.8 seconds (historically shown as 54%), and now clearly reports **CHARGED · HELD** until you press **LAUNCH**.
- **Ward, Sigil, Orb, and Summon** reach a stable form at 8.3 seconds (previously shown as 78%) and remain present until you press **ACTIVATE**.
- **Auto Cast** waits 2.2 seconds after a spell reaches its hold, activates the spell, completes the release, and recasts.
- **DISSOLVE** still releases a spell immediately if requested.
- The focus progress UI displays **READY** at the hold instead of an unexplained mid-timeline percentage.
- The source-over bounded light / movable hexagonal agents / five spell forms remain intact.

## Validation

Headless Chromium test on a phone viewport exercised each of the five spells: form, hold for six extra simulated seconds, activate, dissolve. Auto Fireball also demonstrated hold, activation and recast. A stage resize retained its hold state, and no page JavaScript errors were observed.

These results are browser tests rather than a physical iPhone performance claim.

## Files

- `index.html`: self-contained GitHub Pages entry point.
- `magic.js`: readable synchronized copy of the inline JavaScript.
