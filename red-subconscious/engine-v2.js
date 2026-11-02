/* RED // SUBCONSCIOUS v0.2
   Generic temporal associative memory. No task-, game- or app-specific rules.
   API: RedEngine.create(), plus .observe(), .recall(), .predict(), .patterns(),
   .convergences(), .startEpisode(), .export(), .load(), .reset(), .tests().
*/
(function (root) {
  "use strict";
  const MAX_EVENTS = 600, MAX_WORDS = 2000, MAX_TOKENS = 42;
  const KINDS = new Set(["OBSERVE", "ACT", "RESULT"]);
  function tokenize(input) {
    return [...new Set((String(input || "").toUpperCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []).slice(0, MAX_TOKENS))];
  }
  function signature(tokens) { return [...new Set(tokens)].sort().join("\u001f"); }
  function cleanText(text) { return String(text || "").replace(/\s+/g, " ").trim().slice(0, 280); }
  function blank() { return { version: 2, episode: 1, id: 0, events: [], words: {}, probes: 0, surprises: 0 }; }
  function create() {
    let data = blank();
    let pending = null;
    const numeric = v => Number.isFinite(Number(v)) ? Number(v) : 0;
    function freq() {
      const m = {};
      for (const e of data.events) for (const w of e.tokens) m[w] = (m[w] || 0) + 1;
      return m;
    }
    function similarity(a, b, counts) {
      if (!a.length || !b.length) return 0;
      const A = new Set(a), B = new Set(b);
      let common = 0, aa = 0, bb = 0;
      function weight(w) { return 1 + Math.log(1 + (data.events.length + 1) / (1 + (counts[w] || 0))); }
      for (const w of A) { const n = weight(w) ** 2; aa += n; if (B.has(w)) common += n; }
      for (const w of B) bb += weight(w) ** 2;
      return common / Math.sqrt(aa * bb);
    }
    function learnWords(tokens) {
      for (const w of tokens) {
        if (!data.words[w]) {
          if (Object.keys(data.words).length >= MAX_WORDS) continue;
          data.words[w] = { seen: 0 };
        }
        data.words[w].seen = Math.min(999999, data.words[w].seen + 1);
      }
    }
    function pairs() {
      const list = [];
      for (let i = 1; i < data.events.length; i++) {
        const a = data.events[i - 1], b = data.events[i];
        if (a.episode === b.episode) list.push({ from: a, to: b });
      }
      return list;
    }
    function predict(text, kind = null, track = false) {
      const query = tokenize(text), counts = freq(), buckets = new Map();
      if (track) { data.probes++; learnWords(query); }
      if (!query.length) return { query, candidates: [], best: null };
      for (const p of pairs()) {
        const sim = similarity(query, p.from.tokens, counts);
        if (sim < 0.39) continue;
        const typeFactor = kind && kind !== p.from.type ? 0.45 : 1;
        const weight = sim * typeFactor;
        const key = p.to.type + ":" + signature(p.to.tokens);
        if (!buckets.has(key)) buckets.set(key, {
          text: p.to.text, type: p.to.type, tokens: p.to.tokens,
          score: 0, support: 0, maxSimilarity: 0, evidence: []
        });
        const hit = buckets.get(key);
        hit.score += weight;
        hit.support++;
        hit.maxSimilarity = Math.max(hit.maxSimilarity, sim);
        hit.evidence.push({ from: p.from.id, to: p.to.id, episode: p.from.episode, similarity: +sim.toFixed(3) });
      }
      const all = [...buckets.values()].sort((a,b) => b.score - a.score || b.support - a.support || a.text.localeCompare(b.text));
      const sum = all.reduce((n,c) => n + c.score, 0);
      for (const c of all) {
        c.share = sum ? c.score / sum : 0;
        c.confidence = Math.min(0.97, c.share * (1 - Math.exp(-c.support / 1.35)) * Math.min(1, c.maxSimilarity / 0.8));
        c.score = +c.score.toFixed(3);
        c.confidence = +c.confidence.toFixed(3);
        c.share = +c.share.toFixed(3);
      }
      return { query, candidates: all.slice(0,6), best: all[0] || null };
    }
    function recall(text, track = false) {
      const query = tokenize(text), counts = freq(), hits = [];
      if (track) { data.probes++; learnWords(query); }
      if (!query.length) return { query, hits: [] };
      data.events.forEach((e, i) => {
        const score = similarity(query, e.tokens, counts);
        if (score < 0.21) return;
        const prev = data.events[i-1], next = data.events[i+1];
        hits.push({
          event: e, score: +score.toFixed(3),
          before: prev && prev.episode === e.episode ? { id: prev.id, text: prev.text, type: prev.type } : null,
          after: next && next.episode === e.episode ? { id: next.id, text: next.text, type: next.type } : null
        });
      });
      hits.sort((a,b) => b.score - a.score || b.event.id - a.event.id);
      return { query, hits: hits.slice(0,8) };
    }
    function patterns() {
      const map = new Map();
      for (const {from,to} of pairs()) {
        const id = from.type + ":" + signature(from.tokens) + ">" + to.type + ":" + signature(to.tokens);
        if (!map.has(id)) map.set(id, {
          id, from: from.text, to: to.text, fromType: from.type, toType: to.type,
          count: 0, episodes: new Set(), evidence: []
        });
        const r = map.get(id);
        r.count++; r.episodes.add(from.episode);
        r.evidence.push([from.id, to.id]);
      }
      return [...map.values()].filter(p => p.count >= 2).map(p => ({
        ...p, episodes: p.episodes.size
      })).sort((a,b) => b.count - a.count || b.episodes - a.episodes || a.id.localeCompare(b.id));
    }
    function convergences() {
      const map = new Map();
      for (const {from,to} of pairs()) {
        const key = to.type + ":" + signature(to.tokens);
        if (!map.has(key)) map.set(key, { result: to.text, sources: new Set(), episodes: new Set(), support: 0 });
        const hit = map.get(key);
        hit.sources.add(from.type + ":" + signature(from.tokens));
        hit.episodes.add(from.episode);
        hit.support++;
      }
      return [...map.values()].filter(x => x.sources.size > 1 && x.episodes.size > 1).map(x => ({
        result: x.result, sources: x.sources.size, episodes: x.episodes.size, support: x.support
      })).sort((a,b) => b.support - a.support);
    }
    function observe({ text, type = "OBSERVE" } = {}) {
      text = cleanText(text);
      const tokens = tokenize(text);
      if (!tokens.length) return null;
      if (!KINDS.has(type)) type = "OBSERVE";
      let surprise = null;
      if (pending && pending.episode === data.episode && pending.best &&
          pending.best.support >= 2 && pending.best.confidence >= 0.53 && pending.best.maxSimilarity >= 0.70 &&
          pending.best.type === type) {
        const sim = similarity(tokens, pending.best.tokens, freq());
        const strength = Math.round((1 - sim) * pending.best.confidence * 180);
        if (sim < 0.85 && strength >= 35) {
          surprise = { expected: pending.best.text, actual: text,
            strength: Math.min(100, strength), similarity: +sim.toFixed(3),
            confidence: pending.best.confidence, evidence: pending.best.evidence.slice(0,5) };
          data.surprises++;
        }
      }
      learnWords(tokens);
      const event = { id: ++data.id, episode: data.episode, type, text, tokens,
        at: Date.now(), surprise };
      data.events.push(event);
      if (data.events.length > MAX_EVENTS) data.events.shift();
      const forecast = predict(text, type, false);
      pending = { episode: data.episode, best: forecast.best };
      return { event, surprise, forecast };
    }
    function startEpisode() {
      data.episode++;
      pending = null;
      return data.episode;
    }
    function stats() {
      return { words: Object.keys(data.words).length, events: data.events.length,
        episodes: new Set(data.events.map(e=>e.episode)).size,
        patterns: patterns().length, convergences: convergences().length,
        probes: data.probes, surprises: data.surprises };
    }
    function exportData() { return JSON.parse(JSON.stringify(data)); }
    function load(snapshot) {
      if (!snapshot || snapshot.version !== 2 || !Array.isArray(snapshot.events)) throw Error("Not a v0.2 memory snapshot");
      const candidate = create(), list = snapshot.events.slice(-MAX_EVENTS);
      let previousEpisode = null;
      for (const e of list) {
        if (!e || typeof e.text !== "string") continue;
        const ep = Math.max(1,Math.trunc(numeric(e.episode)));
        if (previousEpisode !== null && ep !== previousEpisode) candidate.startEpisode();
        candidate.observe({ text: e.text, type: e.type });
        previousEpisode = ep;
      }
      const rebuilt = candidate.export();
      rebuilt.probes = Math.max(0,Math.min(999999,Math.trunc(numeric(snapshot.probes))));
      // Preserve durable chronology without trusting external precomputed associations.
      data = rebuilt;
      pending = null;
      return stats();
    }
    function reset() { data = blank(); pending = null; }
    return { observe, recall, predict, patterns, convergences, startEpisode,
      stats, export: exportData, load, reset, events: () => data.events.slice() };
  }
  function tests() {
    const test = [];
    const scenarios = [
      ["Card field", "flip left tile", "a shape appears"],
      ["Browser", "click address bar", "typing cursor appears"],
      ["Files", "rename notebook", "notebook title changes"]
    ];
    for (const [name, action, result] of scenarios) {
      const b = create();
      for (let i = 0; i < 3; i++) {
        if (i) b.startEpisode();
        b.observe({type:"ACT",text:action});
        b.observe({type:"RESULT",text:result});
      }
      const p = b.predict(action,"ACT");
      test.push({ name, pass: !!p.best && p.best.text===result && p.best.support===3,
        detail: p.best ? p.best.text : "no prediction" });
    }
    const c = create();
    for(let i=0;i<4;i++){if(i)c.startEpisode();c.observe({type:"ACT",text:"press square control"});c.observe({type:"RESULT",text:"light turns on"})}
    c.startEpisode();c.observe({type:"ACT",text:"press square control"});
    const exception = c.observe({type:"RESULT",text:"light turns off"});
    test.push({name:"Contradictory outcome",pass:!!exception.surprise,detail: exception.surprise?"surprise "+exception.surprise.strength+"/100":"no alarm"});
    const b = create();b.observe({type:"ACT",text:"alpha lever"});b.startEpisode();b.observe({type:"RESULT",text:"omega gate"});
    test.push({name:"Episode isolation",pass: b.predict("alpha lever","ACT").best===null,detail:"no cross-episode transition"});
    test.push({name:"No hallucinated recall",pass: b.recall("unseen violet nebula").hits.length===0,detail:"no matching memory"});
    const a=create();a.observe({type:"ACT",text:"press key"});a.observe({type:"RESULT",text:"window appears"});
    const saved=a.export(), copy=create();copy.load(saved);
    test.push({name:"Export/import equivalence",pass:copy.predict("press key","ACT").best?.text==="window appears",detail:"timeline survives JSON"});
    return { passed:test.filter(x=>x.pass).length, total:test.length, checks:test };
  }
  root.RedEngine = Object.freeze({ create, tests, tokenize });
})(window);
