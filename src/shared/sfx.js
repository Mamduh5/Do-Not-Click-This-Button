(function () {
  "use strict";
  if (window.ContainmentSfx) { return; }
  var C = window.SFX_CONFIG, context = null, engine = null, resumePending = null;
  var listeners = [], settings = { muted: false, volume: C.defaultVolume };
  function readSettings() {
    try {
      var saved = JSON.parse(localStorage.getItem(C.storageKey));
      if (saved && typeof saved.muted === "boolean" && Number.isFinite(saved.volume)) {
        return { muted: saved.muted, volume: Math.max(0, Math.min(1, saved.volume)) };
      }
      // Respect an existing opt-out when migrating the two old per-game switches.
      var arena = JSON.parse(localStorage.getItem("containmentSwarmSave"));
      var breach = JSON.parse(localStorage.getItem("doNotClickThisButtonSave"));
      return { muted: Boolean((arena && arena.muted) || (breach && breach.audioEnabled === false)), volume: C.defaultVolume };
    } catch (_) { return { muted: false, volume: C.defaultVolume }; }
  }
  settings = readSettings();

  function synthesize(def, variant) {
    var rate = C.sampleRate;
    var duration = Math.max.apply(null, def.layers.map(function (l) { return l.delay + l.seconds; }));
    var samples = new Float32Array(Math.ceil(duration * rate));
    var seed = 7321 + variant * 971, pitch = 1 + (variant - 1) * 0.018;
    def.layers.forEach(function (l) {
      var phase = 0, low = 0, offset = Math.round(l.delay * rate);
      var length = Math.min(samples.length - offset, Math.ceil(l.seconds * rate));
      for (var i = 0; i < length; i++) {
        var t = i / rate, fraction = t / l.seconds;
        var envelope = Math.min(1, t / 0.0015) * Math.exp(-C.mix.decay[def.group] * fraction) * Math.min(1, (l.seconds - t) / 0.006);
        var value;
        if (l.noise) {
          seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
          var white = (seed >>> 0) / 2147483648 - 1;
          low += (white - low) * (1 - Math.exp(-2 * Math.PI * l.hz / rate));
          value = low;
        } else {
          phase += 2 * Math.PI * (l.hz + (l.end - l.hz) * fraction) * pitch / rate;
          value = Math.sin(phase) + l.rough * (0.5 * Math.sin(phase * 2) + 0.25 * Math.sin(phase * 3));
        }
        samples[offset + i] += value * envelope * l.gain;
      }
    });
    var peak = samples.reduce(function (p, v) { return Math.max(p, Math.abs(v)); }, 0);
    samples.forEach(function (v, i) { samples[i] = v * 0.85 / Math.max(peak, 0.001); });
    return samples;
  }
  // Precompute before interaction: playback only allocates a source and gain node.
  var pcm = {};
  Object.keys(C.cues).forEach(function (name) {
    pcm[name] = Array.from({ length: C.cues[name].variants || 1 }, function (_, i) { return synthesize(C.cues[name], i); });
  });

  // The same graph can be rendered in OfflineAudioContext for peak/masking tests.
  function createEngine(ctx, destination, monitors) {
    var buses = {}, voices = [], last = {}, serial = 0, quietUntil = 0, duckUntil = 0;
    var stats = { played: {}, limited: 0, maxVoices: 0 };
    var input = ctx.createGain(), compressor = ctx.createDynamicsCompressor(), output = ctx.createGain(), master = ctx.createGain();
    input.gain.value = C.mix.input;
    input.connect(compressor);
    ["threshold", "knee", "ratio", "attack", "release"].forEach(function (k) { compressor[k].value = C.mix[k]; });
    output.gain.value = C.mix.output;
    compressor.connect(output); output.connect(master); master.connect(destination);
    Object.keys(C.mix.caps).forEach(function (group) {
      buses[group] = ctx.createGain(); buses[group].connect(input);
      if (monitors && monitors[group]) { buses[group].connect(monitors[group]); }
    });
    var bank = {};
    Object.keys(pcm).forEach(function (name) {
      bank[name] = pcm[name].map(function (data) { var b = ctx.createBuffer(1, data.length, C.sampleRate); b.copyToChannel(data, 0); return b; });
    });
    function stopVoice(v, now) {
      v.gain.gain.cancelScheduledValues(now); v.gain.gain.setTargetAtTime(0, now, 0.002);
      v.source.stop(now + 0.01); v.end = Math.min(v.end, now + 0.01);
    }
    function stop(tag, at) {
      var now = at === undefined ? ctx.currentTime : at;
      voices.forEach(function (v) { if (!tag || v.tag === tag) { stopVoice(v, now); } });
    }
    function duck(until, critical, now) {
      duckUntil = Math.max(duckUntil, until);
      var gain = buses.spam.gain;
      gain.cancelScheduledValues(now); gain.setTargetAtTime(C.mix.duck, now, 0.004);
      gain.setTargetAtTime(1, duckUntil, C.mix.duckRelease);
      if (critical) {
        gain = buses.info.gain;
        gain.cancelScheduledValues(now); gain.setTargetAtTime(C.mix.infoDuck, now, 0.004);
        gain.setTargetAtTime(1, duckUntil, C.mix.duckRelease);
      }
    }
    function play(name, options) {
      var def = C.cues[name]; options = options || {};
      if (!def) { return false; }
      var now = options.at === undefined ? ctx.currentTime + (options.delay || 0) : options.at;
      var clock = options.at === undefined ? ctx.currentTime : now;
      voices = voices.filter(function (v) { return v.end > clock; });
      if (now < quietUntil && name !== "bank") { stats.limited++; return false; }
      var key = /^(press|strained|unstable|redPress)$/.test(name) ? "button" : name;
      if (last[key] !== undefined && now - last[key] < (def.gap || 0)) { stats.limited++; return false; }
      var sameGroup = voices.filter(function (v) { return v.group === def.group && !v.retiring; });
      if (sameGroup.length >= C.mix.caps[def.group]) {
        if (def.group === "spam") { stats.limited++; return false; }
        stopVoice(sameGroup[0], now);
        sameGroup[0].retiring = true;
      }
      if (def.quiet) { stop(null, now); quietUntil = now + def.quiet; }
      if (def.duck) { duck(now + def.duck, def.group === "critical", now); }
      var source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = bank[name][serial++ % bank[name].length];
      var rate = def.variants ? 1 + (Math.random() - 0.5) * C.mix.variation * 2 : 1;
      source.playbackRate.value = rate;
      gain.gain.value = def.volume;
      source.connect(gain); gain.connect(buses[def.group]);
      var voice = { source: source, gain: gain, group: def.group, tag: options.tag, end: now + source.buffer.duration / rate };
      source.onended = function () { source.disconnect(); gain.disconnect(); var i = voices.indexOf(voice); if (i >= 0) { voices.splice(i, 1); } };
      voices.push(voice); source.start(now); last[key] = now;
      stats.played[name] = (stats.played[name] || 0) + 1;
      stats.maxVoices = Math.max(stats.maxVoices, voices.length);
      return true;
    }
    function setSettings(value) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      var level = value.muted ? 0 : value.volume;
      master.gain.value = level;
      master.gain.setValueAtTime(level, ctx.currentTime);
      if (value.muted || value.volume === 0) { stop(); }
    }
    return { play: play, stop: stop, setSettings: setSettings, snapshot: function () {
      return { played: Object.assign({}, stats.played), limited: stats.limited, maxVoices: stats.maxVoices,
        active: voices.filter(function (v) { return v.end > ctx.currentTime; }).length, master: master.gain.value,
        ducked: ctx.currentTime < duckUntil, buffers: Object.keys(bank).length };
    } };
  }
  function unlock() {
    if (document.hidden) { return false; }
    try {
      if (!context) {
        var Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) { return false; }
        context = new Context({ latencyHint: "interactive" });
        engine = createEngine(context, context.destination); engine.setSettings(settings);
      }
      if (context.state !== "running" && !resumePending) {
        resumePending = context.resume().catch(function () {}).finally(function () { resumePending = null; });
      }
      return true;
    } catch (_) { return false; }
  }
  function play(name, options) {
    if (!engine || settings.muted || settings.volume === 0 || document.hidden || context.state === "closed") { return false; }
    // A source started during the first gesture's resume is ready on its first audio frame.
    if (context.state !== "running" && !resumePending) { return false; }
    return engine.play(name, options);
  }
  function notify() {
    if (engine) { engine.setSettings(settings); }
    listeners.forEach(function (fn) { fn(Object.assign({}, settings)); });
  }
  function change(next) {
    if (typeof next.muted === "boolean") { settings.muted = next.muted; }
    if (Number.isFinite(next.volume)) { settings.volume = Math.max(0, Math.min(1, next.volume)); }
    try { localStorage.setItem(C.storageKey, JSON.stringify(settings)); } catch (_) { /* Session controls still work. */ }
    notify();
  }
  function subscribe(fn) { listeners.push(fn); fn(Object.assign({}, settings)); return function () { listeners = listeners.filter(function (v) { return v !== fn; }); }; }
  function bindControls(buttonId, sliderId) {
    var button = document.getElementById(buttonId), slider = document.getElementById(sliderId);
    if (!button || !slider) { return; }
    subscribe(function (s) {
      button.textContent = "SFX: " + (s.muted ? "OFF" : "ON"); button.setAttribute("aria-pressed", String(s.muted));
      button.setAttribute("aria-label", s.muted ? "Unmute sound effects" : "Mute sound effects");
      slider.value = Math.round(s.volume * 100); slider.setAttribute("aria-valuetext", slider.value + "%");
      document.getElementById(sliderId + "Value").textContent = slider.value + "%";
    });
    slider.addEventListener("input", function () { unlock(); change({ volume: Number(slider.value) / 100 }); });
    slider.addEventListener("change", function () { play("ui"); });
  }
  function warningTracker() {
    var latches = {};
    return function (key, value, threshold, name) {
      var now = performance.now() / 1000, latch = latches[key] || (latches[key] = { armed: true, last: -Infinity });
      if (value <= threshold - C.warnings.hysteresis) { latch.armed = true; }
      if (value >= threshold && latch.armed && now - latch.last >= C.warnings.cooldown) {
        if (play(name)) { latch.armed = false; latch.last = now; return true; }
      }
      return false;
    };
  }
  var enteringGame = false, entryNavigationTimer = null, entryLinksBound = false;
  function bindGameEntry() {
    if (entryLinksBound) { return; }
    entryLinksBound = true;
    document.querySelectorAll('.game-card[href="arena.html"], .game-card[href="breach.html"]').forEach(function (link) {
      link.addEventListener("click", function (event) {
        // Preserve modified/new-tab navigation and ignore internal synthetic activation.
        if (!event.isTrusted || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || (link.target && link.target !== "_self")) { return; }
        event.preventDefault();
        if (enteringGame) { return; }
        enteringGame = true;
        unlock();
        // The next page has a new audio context: finish this gesture-unlocked cue
        // here rather than queueing a second cue behind destination autoplay rules.
        if (play("enterGame")) {
          entryNavigationTimer = window.setTimeout(function () { window.location.assign(link.href); }, C.enterGameNavigationMs);
        } else {
          window.location.assign(link.href);
        }
      });
    });
  }
  window.ContainmentSfx = { unlock: unlock, play: play, change: change, subscribe: subscribe, bindControls: bindControls,
    stop: function (tag) { if (engine) { engine.stop(tag); } }, warningTracker: warningTracker,
    settings: function () { return Object.assign({}, settings); },
    snapshot: function () { return Object.assign({ state: context ? context.state : "locked" }, engine ? engine.snapshot() : {}); },
    createEngine: createEngine };
  document.addEventListener("pointerdown", unlock, true);
  document.addEventListener("keydown", unlock, true);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && context) { engine.stop(); context.suspend().catch(function () {}); }
    else if (context) { unlock(); }
  });
  window.addEventListener("pagehide", function () { if (engine) { engine.stop(); } });
  window.addEventListener("pageshow", function () {
    window.clearTimeout(entryNavigationTimer); entryNavigationTimer = null; enteringGame = false;
  });
  window.addEventListener("storage", function (event) { if (event.key === C.storageKey || event.key === null) { settings = readSettings(); notify(); } });
  window.addEventListener("DOMContentLoaded", function () {
    bindGameEntry();
    bindControls("arenaMuteBtn", "arenaSfxVolume"); bindControls("soundBtn", "breachSfxVolume"); bindControls("lobbyMuteBtn", "lobbySfxVolume");
    var button = document.getElementById("lobbyMuteBtn");
    if (button) { button.addEventListener("click", function () { change({ muted: !settings.muted }); if (!settings.muted) { play("ui"); } }); }
  });
})();
