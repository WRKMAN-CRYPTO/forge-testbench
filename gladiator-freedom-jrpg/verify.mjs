import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const script = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));

class FakeClassList {
  constructor() { this.names = new Set(); }
  add(...names) { names.forEach((name) => this.names.add(name)); }
  remove(...names) { names.forEach((name) => this.names.delete(name)); }
  toggle(name, force) {
    if (force === true) { this.names.add(name); return true; }
    if (force === false) { this.names.delete(name); return false; }
    if (this.names.has(name)) { this.names.delete(name); return false; }
    this.names.add(name); return true;
  }
  contains(name) { return this.names.has(name); }
}

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.textContent = "";
    this.innerHTML = "";
    this.style = {};
    this.dataset = {};
    this.disabled = false;
    this.children = [];
    this.classList = new FakeClassList();
    this._className = "";
    this.offsetWidth = 320;
  }
  set className(value) {
    this._className = value;
    this.classList = new FakeClassList();
    String(value).split(/\s+/).filter(Boolean).forEach((name) => this.classList.add(name));
  }
  get className() { return this._className; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this[name] = value; }
  querySelector(selector) {
    if (selector === ".continue") return this.children.find((child) => child.classList.contains("continue")) || null;
    return null;
  }
  querySelectorAll(selector) {
    if (selector === "button") return this.children;
    if (selector === "button:not(.continue)") return this.children.filter((child) => !child.classList.contains("continue"));
    return [];
  }
  closest() { return null; }
  setPointerCapture() {}
}

const context2d = new Proxy({
  createLinearGradient() { return { addColorStop() {} }; },
  measureText() { return { width: 0 }; }
}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (typeof prop === "string" && /^(fill|stroke|begin|close|move|line|arc|ellipse|rect|save|restore|translate|scale|clear|setLineDash)/.test(prop)) return () => {};
    return target[prop];
  },
  set(target, prop, value) { target[prop] = value; return true; }
});

const ids = [
  "game", "app", "heroLabel", "xpLabel", "hpLabel", "focusLabel", "hpBar", "focusBar",
  "moneyLabel", "freedomBar", "supplyLabel", "edgeLabel", "objectiveText", "location", "toast",
  "battleInfo", "battleLog", "enemyName", "enemyHp", "intentName", "intentText", "dialogue",
  "speaker", "dialogueText", "dialogueRow", "pageMark", "dialogueNext", "choiceButtons", "sheet",
  "sheetTitle", "sheetBody", "titleScreen", "continueButton", "newButton", "endingScreen", "endingStats",
  "viewport", "exploreControls", "battleControls", "strikeButton", "breakButton", "guardButton",
  "bandageButton", "strikeSub", "breakSub", "guardSub", "bandageSub"
];
const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));
elements.game.getContext = () => context2d;
elements.game.width = 320;
elements.game.height = 320;

const listeners = {};
const document = {
  hidden: false,
  getElementById(id) { return elements[id] ||= new FakeElement(id); },
  createElement() { return new FakeElement(); },
  addEventListener(name, fn) { (listeners[name] ||= []).push(fn); }
};

const storage = new Map();
const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); }
};

let timerId = 0;
let timers = [];
function fakeSetTimeout(fn, delay = 0) {
  const id = ++timerId;
  timers.push({ id, fn, delay, canceled: false });
  return id;
}
function fakeClearTimeout(id) {
  const timer = timers.find((entry) => entry.id === id);
  if (timer) timer.canceled = true;
}
function runTimers(maxDelay = 500) {
  const ready = timers.filter((entry) => !entry.canceled && entry.delay <= maxDelay);
  timers = timers.filter((entry) => entry.canceled || entry.delay > maxDelay);
  for (const timer of ready) timer.fn();
}

const windowObject = {
  addEventListener(name, fn) { (listeners[`window:${name}`] ||= []).push(fn); },
  AudioContext: undefined,
  webkitAudioContext: undefined
};

const sandbox = {
  window: windowObject,
  document,
  localStorage,
  location: { search: "?debug=1" },
  URLSearchParams,
  performance: { now: () => 0 },
  requestAnimationFrame: () => 1,
  queueMicrotask: (fn) => fn(),
  setTimeout: fakeSetTimeout,
  clearTimeout: fakeClearTimeout,
  setInterval: () => 1,
  clearInterval: () => {},
  console,
  Math,
  JSON,
  Number,
  String,
  Array,
  Object,
  Set,
  Map,
  Error
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(script, sandbox, { filename: "index.html:script" });

const game = windowObject.__PRICE_OF_HOME__;
if (!game) throw new Error("Debug verification API did not initialize");

const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function closeDialogue(count = 8) {
  for (let i = 0; i < count; i += 1) game.enqueue({ type: "DIALOGUE_NEXT" });
}
function winCurrentBattle() {
  const before = game.getState();
  assert(before.battle?.phase === "player", "battle is not awaiting player input");
  game.setState({ battle: { ...before.battle, enemyHp: 1 } });
  game.enqueue({ type: "BATTLE_ACTION", action: "strike" });
  const won = game.getState();
  assert(won.battle?.phase === "victory", "lethal strike did not enter victory phase");
  game.enqueue({ type: "BATTLE_CONTINUE" });
  closeDialogue();
}

test("all map rows are 16×16", () => {
  for (const [name, map] of Object.entries(game.maps)) {
    assert(map.rows.length === 16, `${name} has ${map.rows.length} rows`);
    assert(map.rows.every((row) => row.length === 16), `${name} has a malformed row`);
  }
});

test("new journey starts safely", () => {
  storage.clear();
  game.reset();
  closeDialogue();
  const s = game.getState();
  assert(s.started && s.story === 1, "new journey did not start at story 1");
  assert(s.mapId === "ludus" && s.px === 2 && s.py === 3, "new journey start position is wrong");
  assert(s.hp === 50 && s.focus === 8 && s.bandages === 2, "new journey resources are wrong");
});

test("world movement obeys collision", () => {
  game.setState({ mapId: "ludus", px: 1, py: 1, facing: "left", battle: null });
  game.enqueue({ type: "MOVE", dx: -1, dy: 0 });
  let s = game.getState();
  assert(s.px === 1 && s.py === 1, "wall collision moved the player");
  game.enqueue({ type: "MOVE", dx: 1, dy: 0 });
  s = game.getState();
  assert(s.px === 2 && s.py === 1, "walkable movement failed");
});

test("trial fight advances story and pays once", () => {
  game.setState({ story: 3, mapId: "ludus", px: 7, py: 13, facing: "down", gold: 0, xp: 0, completed: {}, battle: null });
  game.enqueue({ type: "INTERACT" });
  closeDialogue(10);
  let s = game.getState();
  assert(s.battle?.enemyId === "trial", "arena gate did not start the trial");
  winCurrentBattle();
  s = game.getState();
  assert(s.story === 4, "trial did not advance to story 4");
  assert(s.gold === 15, `trial purse was ${s.gold}, expected 15`);
  assert(s.completed.trial === true, "trial completion was not recorded");
  assert(s.mapId === "ludus" && !s.battle, "trial did not return to a playable overworld");
});

test("battle input isolates overworld movement", () => {
  game.setState({ mapId: "quarry", px: 2, py: 2, safe: { mapId: "quarry", px: 2, py: 2 }, battle: null, completed: {} });
  game.beginBattle("dust-raider", "random");
  const before = game.getState();
  game.enqueue({ type: "MOVE", dx: 1, dy: 0 });
  const after = game.getState();
  assert(after.px === before.px && after.py === before.py, "overworld moved during battle");
  game.setState({ battle: null });
});

test("lethal action never schedules an enemy counter-turn", () => {
  game.setState({ hp: 31, completed: {}, battle: null });
  game.beginBattle("trial", "story");
  const started = game.getState();
  game.setState({ battle: { ...started.battle, enemyHp: 1 } });
  game.enqueue({ type: "BATTLE_ACTION", action: "strike" });
  const hpAtVictory = game.getState().hp;
  runTimers();
  const afterTimers = game.getState();
  assert(afterTimers.battle?.phase === "victory", "victory was overwritten by an enemy turn");
  assert(afterTimers.hp === hpAtVictory, "enemy damaged the player after defeat");
  game.enqueue({ type: "BATTLE_CONTINUE" });
  closeDialogue();
});

test("guard restores Focus and heavy attacks remain survivable", () => {
  game.setState({ hp: 50, maxHp: 50, focus: 2, maxFocus: 8, completed: {}, battle: null });
  game.beginBattle("brutus", "random");
  const started = game.getState();
  game.setState({ battle: { ...started.battle, intentIndex: 0 } });
  game.enqueue({ type: "BATTLE_ACTION", action: "guard" });
  assert(game.getState().focus === 4, "guard did not restore two Focus");
  runTimers();
  const after = game.getState();
  assert(after.hp > 40, `guarded heavy attack dealt too much damage: HP ${after.hp}`);
  assert(after.battle.edge >= 1, "guarded attack did not build Edge");
  game.setState({ battle: null });
});

test("BREAK spends setup and interrupts a heavy windup", () => {
  game.setState({ hp: 50, maxHp: 50, focus: 6, maxFocus: 8, completed: {}, battle: null });
  game.beginBattle("brutus", "random");
  const started = game.getState();
  game.setState({ battle: { ...started.battle, intentIndex: 0, edge: 2 } });
  game.enqueue({ type: "BATTLE_ACTION", action: "break" });
  let after = game.getState();
  assert(after.focus === 3, "BREAK did not spend three Focus");
  assert(after.battle.edge === 0, "BREAK did not consume stored Edge");
  assert(after.battle.interrupted === true, "BREAK did not mark the heavy windup interrupted");
  const hpBeforeCounter = after.hp;
  runTimers();
  after = game.getState();
  assert(after.hp === hpBeforeCounter, "interrupted heavy windup still dealt damage");
  assert(after.battle.phase === "player", "battle did not return to the player after interruption");
  game.setState({ battle: null });
});

test("death recovery preserves continuation", () => {
  game.setState({ hp: 1, maxHp: 50, focus: 1, maxFocus: 8, gold: 100, deaths: 0, completed: {}, battle: null, safe: { mapId: "quarry", px: 2, py: 2 } });
  game.beginBattle("dust-raider", "random");
  const started = game.getState();
  game.setState({ hp: 1, battle: { ...started.battle, phase: "enemy", intentIndex: 1 } });
  const token = game.getState().battle.token;
  game.enqueue({ type: "ENEMY_TURN", token });
  let fallen = game.getState();
  assert(fallen.battle?.phase === "defeat", "lethal enemy turn did not enter defeat phase");
  assert(fallen.gold < 100 && fallen.gold >= 82, "death fee is outside the bounded recovery rule");
  game.enqueue({ type: "BATTLE_CONTINUE" });
  fallen = game.getState();
  assert(!fallen.battle && fallen.mapId === "ludus", "death did not recover to ludus");
  assert(fallen.hp === fallen.maxHp && fallen.focus === fallen.maxFocus, "death recovery did not restore playability");
  closeDialogue();
});

test("save strips orphaned half-battles", () => {
  game.setState({ story: 11, mapId: "quarry", px: 7, py: 11, safe: { mapId: "quarry", px: 7, py: 11 }, hp: 23, gold: 77, completed: {}, battle: null });
  game.beginBattle("kest", "story");
  game.save();
  game.setState({ mapId: "ludus", px: 2, py: 3, hp: 1, gold: 0, battle: null });
  assert(game.load() === true, "saved state could not load");
  const restored = game.getState();
  assert(restored.battle === null, "save restored an orphaned battle");
  assert(restored.mapId === "quarry" && restored.px === 7 && restored.py === 11, "save did not restore the safe overworld position");
  assert(restored.hp === 23 && restored.gold === 77, "durable resources did not restore");
});

test("mandatory purse curve funds freedom after two upgrades", () => {
  const scheduled = ["trial", "vela", "doran", "maro", "quarry-ambush", "kest", "sava", "brutus", "ilyra", "aurex"];
  const purse = scheduled.reduce((sum, id) => sum + game.enemies[id].purse, 0) + 25;
  assert(purse === 365, `mandatory purse curve changed to ${purse}`);
  assert(purse - 60 >= 300, "two upgrades make the required ending unreachable without grinding");
});

test("the entire scheduled season advances without a progression gap", () => {
  storage.clear();
  game.reset();
  closeDialogue();
  game.setState({ completed: {}, gold: 0, xp: 0, level: 1, hp: 50, maxHp: 50, focus: 8, maxFocus: 8, story: 3, mapId: "ludus", px: 7, py: 13, safe: { mapId: "ludus", px: 7, py: 13 }, battle: null });
  const route = [
    ["trial", 4], ["vela", 6], ["doran", 7], ["maro", 8],
    ["quarry-ambush", 11], ["kest", 12],
    ["sava", 14], ["brutus", 15], ["ilyra", 16], ["aurex", 17]
  ];
  for (const [enemyId, expectedStory] of route) {
    game.beginBattle(enemyId, "story");
    winCurrentBattle();
    const after = game.getState();
    assert(after.story === expectedStory, `${enemyId} advanced to story ${after.story}, expected ${expectedStory}`);
    if (enemyId === "kest") {
      game.setState({ mapId: "ludus", px: 12, py: 7, facing: "up", safe: { mapId: "ludus", px: 12, py: 7 }, battle: null });
      game.enqueue({ type: "INTERACT" });
      closeDialogue();
      assert(game.getState().story === 13, "quarry return did not unlock the silver card");
    }
  }
  const complete = game.getState();
  assert(complete.story === 17, "festival final did not unlock payment");
  assert(complete.gold === 365, `scheduled season produced ${complete.gold} marks instead of 365`);
  assert(complete.level >= 5, "scheduled XP curve did not materially grow Cassian");
});

test("freedom payment and home ending are reachable", () => {
  game.setState({ started: true, ended: false, free: false, story: 17, gold: 300, mapId: "ludus", px: 12, py: 7, facing: "up", safe: { mapId: "ludus", px: 12, py: 7 }, battle: null });
  game.enqueue({ type: "PAY_FREEDOM" });
  closeDialogue(10);
  let s = game.getState();
  assert(s.story === 18 && s.free && s.gold === 0, "freedom payment did not resolve exactly");
  game.setState({ story: 19, mapId: "harbor", px: 7, py: 2, facing: "up", safe: { mapId: "harbor", px: 7, py: 2 }, battle: null });
  game.enqueue({ type: "INTERACT" });
  closeDialogue(10);
  s = game.getState();
  assert(s.story === 20 && s.ended, "ship interaction did not reach the home ending");
});

const failed = results.filter((result) => !result.ok);
for (const result of results) console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${result.error ? ` — ${result.error}` : ""}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
