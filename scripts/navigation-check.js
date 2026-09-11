"use strict";
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");

// Deterministic lifecycle coverage; no listening or signal analysis.
function harness(options = {}) {
  let wall = 0, serial = 0, starts = 0;
  const timers = new Map(), events = {}, navigations = [], clicks = [];
  const param = () => ({ value: 0, cancelScheduledValues() {}, setTargetAtTime() {}, setValueAtTime(v) { this.value = v; } });
  const node = () => ({ connect() {}, disconnect() {}, gain: param() });
  class Context {
    constructor() { this.state = options.stalled ? "suspended" : "running"; this.destination = {}; this.baseLatency = 0; this.outputLatency = 0.02; }
    get currentTime() { return Math.max(0, wall - (options.coldStartMs || 0)) / 1000; }
    getOutputTimestamp() { return { contextTime: Math.max(0, this.currentTime - 0.02), performanceTime: wall }; }
    resume() { return new Promise(() => {}); }
    createGain() { return node(); }
    createDynamicsCompressor() { return Object.assign(node(), Object.fromEntries(["threshold", "knee", "ratio", "attack", "release"].map(k => [k, param()]))); }
    createBuffer(channels, length, rate) { return { duration: length / rate, copyToChannel() {} }; }
    createBufferSource() { return Object.assign(node(), { playbackRate: {}, start() { starts++; }, stop() {} }); }
  }
  if (options.noTimestamp) Context.prototype.getOutputTimestamp = undefined;
  const link = { href: "https://game.test/arena.html", hasAttribute() { return false; }, addEventListener(name, fn) { if (name === "click") clicks.push(fn); } };
  const sandbox = {
    AudioContext: options.unsupported ? undefined : Context,
    performance: { now: () => wall },
    localStorage: { getItem: () => JSON.stringify({ muted: !!options.muted, volume: options.volume ?? 0.75 }), setItem() {} },
    location: { href: "https://game.test/index.html", assign(href) { navigations.push({ href, wall }); } },
    setTimeout(fn, ms) { const id = ++serial; timers.set(id, { fn, time: wall + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener(name, fn) { (events[name] ||= []).push(fn); },
    document: { hidden: false, addEventListener() {}, querySelectorAll: () => [link], getElementById: () => null }
  };
  sandbox.window = sandbox;
  for (const file of ["src/shared/sfxConfig.js", "src/shared/sfx.js"]) runInNewContext(readFileSync(file, "utf8"), sandbox);
  function dispatch(name) { for (const fn of events[name] || []) fn(); }
  dispatch("DOMContentLoaded");
  return {
    click() { for (const fn of clicks) fn({ isTrusted: true, button: 0, preventDefault() {} }); },
    advance(ms) {
      const until = wall + ms;
      for (;;) {
        const next = [...timers].filter(([, t]) => t.time <= until).sort((a, b) => a[1].time - b[1].time)[0];
        if (!next) break;
        timers.delete(next[0]); wall = next[1].time; next[1].fn();
      }
      wall = until;
    },
    dispatch, navigations, starts: () => starts, change: sandbox.ContainmentSfx.change
  };
}
for (const options of [{}, { noTimestamp: true }, { coldStartMs: 40 }]) {
  const h = harness(options);
  h.dispatch("DOMContentLoaded"); h.click(); h.click();
  assert.equal(h.starts(), 1, "rebind and rapid repeated activation queue only one source");
  h.advance(64); assert.equal(h.navigations.length, 0, "queued audio is not enough to leave");
  h.advance(96); assert.equal(h.navigations.length, 1, "navigate after output advances, without waiting for the ceiling");
  assert(h.navigations[0].wall < 180);
}
for (const options of [{ muted: true }, { volume: 0 }, { unsupported: true }]) {
  const h = harness(options); h.click();
  assert.equal(h.starts(), 0); assert.equal(h.navigations.length, 1);
  assert.equal(h.navigations[0].wall, 0, "silent or unsupported playback navigates immediately");
}
const blocked = harness({ stalled: true }); blocked.click(); blocked.advance(200);
assert.equal(blocked.navigations.length, 1, "blocked resume cannot hold navigation indefinitely");
assert(blocked.navigations[0].wall <= 188);
const muted = harness(); muted.click(); muted.change({ muted: true }); muted.advance(8);
assert.equal(muted.navigations.length, 1, "muting releases the short wait");
const restored = harness(); restored.click(); restored.dispatch("pagehide"); restored.advance(200);
assert.equal(restored.navigations.length, 0, "external navigation cancels the pending callback");
restored.dispatch("pageshow"); restored.click(); restored.advance(160);
assert.equal(restored.navigations.length, 1, "restored page rearms navigation");
console.log("Navigation lifecycle checks passed: output timing, cold start, fallback, silence, duplicates and restoration.");
