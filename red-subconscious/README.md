# RED // SUBCONSCIOUS v0.2: Experience Engine

Local, task-agnostic associative memory prototype for Red. Same algorithm for cards, browsers, files, or other observed environments.

## Architecture
- Word agents track tokens considered or observed, without task-specific vocabularies.
- Experience agents store ordered, typed observations, actions and outcomes, grouped into episodes.
- Association agents emerge from repeated adjacent experience transitions. Competing outcomes share attention rather than overwrite one another.
- Recall returns historically matching events and adjacent evidence. Predict combines successor evidence from similar prior experiences.
- Surprise measures deviation from a sufficiently supported prediction when the next event is actually observed.

## Browser bridge
Load engine.js before app.js. The window.RedMemoryV2 API offers:
- observe({type: 'OBSERVE' | 'ACT' | 'RESULT', text: '...'})
- startEpisode()
- recall('thought') or probe('thought')
- predict('thought')
- associations(), convergences(), stats(), export(), import(snapshot), reset(), runTests()

The pure non-DOM engine is available as window.RedExperienceCore.create() and is the starting point for a later Python port.

## Memory snapshot
version: 2; words: object; events: [{id, episode, type, text, words, at, evaluation}]; episode, sequence, probes, surprises.
Snapshots are local JSON. The webpage uses localStorage key wrkman-red-subconscious-v2. Earlier v0.1 cue/result snapshots can be migrated.

## Behavioral checks
Run the seven isolated checks in the webapp: card table, browser, files, surprise after contradiction, episode boundaries, no fabricated recall, and competing outcomes.
Additional manual checks can examine partial-token queries, multi-event prediction and restoration of pending predictions after loading a snapshot.

## Limitations
Weighted token overlap is not semantic understanding. Synonyms without common words may not connect. Temporal correlation does not prove causality. Confidence is a heuristic, not a calibrated probability. The page does not observe Red's desktop or continue working while closed.

Before building the Python bridge, evaluate surprising observations and retrieval on genuinely unseen activities, then explore emergent word similarity, forgetting, and proactive recall.
