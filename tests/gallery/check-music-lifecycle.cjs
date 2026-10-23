'use strict';

// Exercise the actual controller with controllable media promises and browser
// lifecycle events. This checks state/races, not audible output or rendering.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourcePath = path.resolve(__dirname, '../../portfolio-demos/gallery/gallery-music.js');
const source = fs.readFileSync(sourcePath, 'utf8');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function namedError(name) { return Object.assign(new Error(name), { name }); }
function element() {
  const listeners = new Map(), attributes = new Map();
  const label = { textContent: '' };
  return {
    dataset: {}, style: { setProperty(key, value) { this[key] = value; } }, disabled: false, textContent: '', open: false,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    dispatchEvent(event) { listeners.get(event.type)?.forEach(listener => listener(event)); },
    emit(type, detail) { this.dispatchEvent({ type, detail }); },
    setAttribute(key, value) { attributes.set(key, String(value)); },
    getAttribute(key) { return attributes.get(key) ?? null; },
    querySelector: () => label,
    querySelectorAll: () => []
  };
}

function setup(options = {}) {
  let now = 0, nextId = 0, position = 0, frequencyLevel = 150, waveformLevel = 140;
  const timers = new Map(), frames = new Map(), observers = [];
  const calls = [], plays = [], contexts = [];
  const stats = { sources: 0, frequency: 0, waveform: 0, pauses: 0, loads: 0, layoutReads: 0, currentTimeWrites: [] };
  const panel = element(), bars = Array.from({ length: 4 }, element);
  panel.querySelectorAll = () => bars;
  const toggle = element(), detailToggle = element(), reactiveToggle = element();
  const floor = element(), rail = element(), reduced = element();
  const environment = element(), wallMask = element(), backdrop = element(), card = element(), artworkFrame = element();
  environment.getBoundingClientRect = () => { stats.layoutReads++; return { left: 0, top: 0, width: 1280, height: 800 }; };
  card.getBoundingClientRect = () => { stats.layoutReads++; return { left: 320, top: 160, right: 960, bottom: 620 }; };
  artworkFrame.getBoundingClientRect = () => { stats.layoutReads++; return { left: 320, top: 160, right: 960, bottom: 560 }; };
  card.querySelector = () => artworkFrame;
  reduced.matches = false;
  const dialogs = [element(), element()];
  const document = Object.assign(element(), {
    hidden: false, body: { dataset: { scene: 'entrance' } },
    querySelectorAll: selector => selector === 'dialog' ? dialogs : [],
    querySelector: selector => selector === 'dialog[open]' ? dialogs.find(dialog => dialog.open) || null : null
  });
  const audio = Object.assign(element(), {
    paused: true, error: null,
    play() {
      calls.push('play');
      const pending = deferred(); plays.push(pending);
      this.paused = false;
      return pending.promise;
    },
    pause() { stats.pauses++; const changed = !this.paused; this.paused = true; if (changed) this.emit('pause'); },
    load() { stats.loads++; this.error = null; }
  });
  Object.defineProperty(audio, 'currentTime', {
    get() { return position; },
    set(value) {
      stats.currentTimeWrites.push(value);
      // Reproduce the local endpoint's observed non-seekable behavior.
      position = options.unseekable ? 0 : value;
    }
  });
  class AudioContext {
    constructor() {
      contexts.push(this); this.state = 'suspended'; this.currentTime = 0;
      this.sampleRate = 48000; this.destination = {};
    }
    resume() {
      calls.push('resume');
      if (options.resumeError) return Promise.reject(namedError(options.resumeError));
      if (!options.resumeStaysSuspended) this.state = 'running';
      return Promise.resolve();
    }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    createMediaElementSource(media) {
      assert.equal(media, audio);
      stats.sources++;
      return { connect() {} };
    }
    createGain() {
      const gain = {
        value: 0, ramps: [], cancelScheduledValues() {},
        setValueAtTime(value) { this.value = value; },
        linearRampToValueAtTime(value, at) { this.ramps.push({ value, at }); this.value = value; }
      };
      return { gain, connect() {} };
    }
    createAnalyser() {
      return {
        fftSize: 1024, get frequencyBinCount() { return this.fftSize / 2; }, connect() {},
        getByteFrequencyData(array) { stats.frequency++; array.fill(frequencyLevel); },
        getByteTimeDomainData(array) { stats.waveform++; array.fill(waveformLevel); }
      };
    }
  }
  const window = element();
  if (!options.noAudioContext) window.AudioContext = AudioContext;
  const saved = new Map(Object.entries(options.preferences || {}));
  const sandbox = vm.createContext({
    console, document, window, URLSearchParams, Uint8Array, DOMException, location: { search: '' },
    matchMedia: () => reduced,
    localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
    CustomEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
    MutationObserver: class {
      constructor(callback) { observers.push(callback); }
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame(callback) { const id = ++nextId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(callback, delay) { const id = ++nextId; timers.set(id, { at: now + delay, callback }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  vm.runInContext(source + '\nglobalThis.TestGalleryMusic = GalleryMusic;', sandbox, { filename: sourcePath });
  const hallway = { phase: 'idle', mode: 'wall', gallery: element(), cards: [{ card }] };
  const music = new sandbox.TestGalleryMusic({ hallway, audio, panel, toggle, detailToggle, reactiveToggle: options.noReactiveToggle ? undefined : reactiveToggle, floor, rail, environment, wallMask, backdrop });
  const fixture = {
    music, audio, panel, bars, toggle, detailToggle, reactiveToggle, floor, rail, environment, wallMask, backdrop,
    reduced, document, window, dialogs, calls, plays, contexts, stats, frames,
    progressTo(value) { position = value; },
    energy(frequency, waveform) { frequencyLevel = frequency; waveformLevel = waveform; },
    motion(detail) { hallway.gallery.emit('hallway-motion', { phase: 'ready', mode: 'wall', settled: true, index: 0, ...detail }); },
    frame(time = now + 34) {
      now = time;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now));
    },
    advance(ms) {
      const end = now + ms;
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]); now = next[1].at; next[1].callback();
      }
      now = end;
    },
    async resolvePlay(index = plays.length - 1, emitPlaying = true) {
      if (emitPlaying) audio.emit('playing');
      plays[index].resolve(); await fixture.flush();
    },
    async rejectPlay(name, index = plays.length - 1) {
      audio.paused = true; plays[index].reject(namedError(name)); await fixture.flush();
    },
    async flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); },
    hidden(value) { document.hidden = value; document.emit('visibilitychange'); },
    reduce(value) { reduced.matches = value; reduced.emit('change'); },
    dialog(value) { dialogs[0].open = value; observers.forEach(callback => callback()); },
    async start() {
      music.beginEntry(); document.body.dataset.scene = 'gallery'; music.commitEntry();
      fixture.motion({ phase: 'entering', settled: false });
      await fixture.resolvePlay();
      fixture.motion({}); await fixture.resolvePlay();
    }
  };
  return fixture;
}

const tests = [];
function test(name, run) { tests.push({ name, run }); }

test('entry primes from the gesture, pauses silently, then plays and fades in after ready', async () => {
  const f = setup(); f.music.beginEntry();
  assert.deepEqual(f.calls, ['resume', 'play']);
  assert.equal(f.music.gain.gain.ramps.at(-1).value, 0);
  f.motion({ phase: 'entering', settled: false });
  await f.resolvePlay();
  assert.equal(f.audio.paused, true, 'priming must not silently consume the song during the journey');
  assert.equal(f.contexts[0].state, 'running', 'the gesture-unlocked engine stays available');
  assert.equal(f.frames.size, 0);
  assert.equal(f.music.gain.gain.ramps.at(-1).value, 0);
  assert.equal(f.plays.length, 1);
  f.motion({});
  assert.equal(f.plays.length, 2, 'ready starts the same primed media element');
  await f.resolvePlay();
  assert.equal(f.audio.paused, false);
  assert.equal(f.music.status, 'on');
  assert.equal(f.music.gain.gain.ramps.at(-1).value, .26);
  assert.equal(f.stats.currentTimeWrites.length, 0);
});

test('a late play completion cannot turn music back on after toggle off', async () => {
  const f = setup(); f.music.beginEntry(); f.toggle.emit('click');
  await f.resolvePlay(0);
  f.advance(180);
  assert.equal(f.music.status, 'off');
  assert.equal(f.toggle.getAttribute('aria-pressed'), 'false');
  assert.equal(f.audio.paused, true);
  assert.equal(f.frames.size, 0);
});

test('quick off/on cancels delayed pause and reuses the audio source', async () => {
  const f = setup(); await f.start();
  f.toggle.emit('click'); f.detailToggle.emit('click');
  await f.resolvePlay(); f.advance(250);
  assert.equal(f.audio.paused, false);
  assert.equal(f.music.status, 'on');
  assert.equal(f.stats.sources, 1);
  assert.equal(f.contexts.length, 1);
});

test('hidden stops playback and a late completion; visible resumes only when enabled', async () => {
  const f = setup(); f.music.beginEntry(); f.hidden(true);
  await f.resolvePlay(0);
  assert.equal(f.audio.paused, true);
  assert.equal(f.music.status, 'paused');
  assert.equal(f.frames.size, 0);
  f.hidden(false); assert.equal(f.plays.length, 2);
  f.motion({});
  await f.resolvePlay(); assert.equal(f.music.status, 'on');
  f.toggle.emit('click'); f.advance(180);
  const count = f.plays.length;
  f.hidden(true); f.hidden(false);
  assert.equal(f.plays.length, count);
});

test('leave invalidates pending playback; reentry reuses one source and awaits its own play', async () => {
  const f = setup(); f.music.beginEntry(); f.music.leave();
  f.music.beginEntry();
  await f.resolvePlay(0, false);
  assert.equal(f.music.status, 'loading');
  f.motion({});
  await f.resolvePlay(1, false);
  assert.equal(f.music.status, 'loading', 'ready playback must supersede the pending priming request');
  await f.resolvePlay(2);
  assert.equal(f.music.status, 'on');
  assert.equal(f.stats.sources, 1);
  f.music.leave(); f.hidden(true); f.hidden(false);
  assert.equal(f.plays.length, 3);
});

test('reentry preserves 78 seconds natively even when the media endpoint cannot seek', async () => {
  const f = setup({ unseekable: true }); await f.start();
  f.progressTo(78);
  f.music.leave();
  assert.equal(f.audio.paused, true);
  assert.equal(f.audio.currentTime, 78);
  f.music.beginEntry();
  f.motion({ phase: 'idle', settled: false });
  f.motion({ phase: 'entering', settled: false });
  await f.resolvePlay();
  assert.equal(f.audio.paused, true);
  f.advance(5200);
  assert.equal(f.audio.currentTime, 78, 'the paused song retains its native position during entry');
  f.motion({});
  await f.resolvePlay();
  assert.equal(f.audio.currentTime, 78);
  assert.equal(f.stats.currentTimeWrites.length, 0, 'entry and reentry must never seek');
  assert.equal(f.music.gain.gain.ramps.at(-1).value, .26);
  f.progressTo(79.25);
  f.motion({ settled: false });
  f.motion({});
  assert.equal(f.audio.currentTime, 79.25, 'later navigation must not repeat the entry seek');
  assert.equal(f.stats.sources, 1);
});

test('cancelling primed reentry prevents stale ready from replaying or seeking', async () => {
  const f = setup(); await f.start();
  f.progressTo(78);
  f.music.leave(); f.music.beginEntry();
  await f.resolvePlay();
  assert.equal(f.audio.paused, true);
  const playCount = f.plays.length;
  f.music.leave();
  f.motion({});
  assert.equal(f.plays.length, playCount);
  assert.equal(f.stats.currentTimeWrites.length, 0);
  assert.equal(f.audio.currentTime, 78);
  assert.equal(f.audio.paused, true);
  assert.equal(f.music.status, 'off');
});

test('the temporary idle emitted inside hallway.enter does not pause music', async () => {
  const f = setup(); await f.start();
  const pauses = f.stats.pauses;
  f.motion({ phase: 'idle', settled: false });
  assert.equal(f.stats.pauses, pauses);
  assert.equal(f.music.status, 'on');
  assert.equal(f.audio.paused, false);
  assert.equal(f.floor.style.opacity, '0');
});

test('room visuals stop during travel, dialogs and list mode, and return when settled', async () => {
  const f = setup(); await f.start(); f.frame();
  assert.ok(Number(f.floor.style.opacity) > 0);
  f.motion({ settled: false }); f.frame(); assert.equal(f.floor.style.opacity, '0');
  f.motion({}); f.frame(); assert.ok(Number(f.floor.style.opacity) > 0);
  f.dialog(true); f.frame(); assert.equal(f.floor.style.opacity, '0');
  f.dialog(false); f.frame(); assert.ok(Number(f.floor.style.opacity) > 0);
  f.motion({ mode: 'list', settled: false }); f.frame(); assert.equal(f.floor.style.opacity, '0');
});

test('reactive off stops analysis work while music continues; on resumes it', async () => {
  const f = setup(); await f.start(); f.frame();
  f.reactiveToggle.emit('click');
  const reads = f.stats.frequency;
  f.frame(); f.frame();
  assert.equal(f.audio.paused, false);
  assert.equal(f.floor.style.opacity, '0');
  assert.equal(f.backdrop.style.opacity, '0');
  assert.equal(f.stats.frequency, reads, 'disabled reactivity should not keep sampling FFT data');
  assert.equal(f.frames.size, 0, 'disabled reactivity should not keep a RAF loop alive');
  f.reactiveToggle.emit('click'); f.frame();
  assert.ok(f.stats.frequency > reads);
});

test('the music-only control enables room light despite a legacy off preference, then follows music and reduced motion', async () => {
  const f = setup({ noReactiveToggle: true, preferences: { 'minimaze-reactive': 'off' } });
  await f.start(); f.frame();
  assert.equal(f.panel.dataset.reactive, 'true');
  assert.ok(Number(f.floor.style.opacity) > 0);
  f.toggle.emit('click'); f.advance(180);
  assert.equal(f.audio.paused, true);
  assert.equal(f.floor.style.opacity, '0');
  assert.equal(f.frames.size, 0);
  f.toggle.emit('click'); await f.resolvePlay(); f.frame();
  assert.ok(Number(f.floor.style.opacity) > 0);
  assert.equal(f.stats.sources, 1);
  f.reduce(true);
  assert.equal(f.audio.paused, false);
  assert.equal(f.panel.dataset.reactive, 'false');
  assert.equal(f.frames.size, 0);
});

test('room light excludes artwork and labels, with no repeated layout reads between stops', async () => {
  const f = setup(); await f.start(); f.frame();
  const cutout = f.wallMask.style.clipPath;
  assert.ok(cutout.startsWith('polygon(evenodd,'));
  assert.ok(cutout.includes('308.0px 148.0px'));
  assert.ok(cutout.includes('972.0px 572.0px'), 'wall lighting must exclude the artwork with a 12px margin');
  assert.equal(f.floor.style['--music-floor-clearance'], '634.0px', 'ground light starts 14px below the exhibit label');
  assert.equal(f.rail.style['--music-floor-clearance'], '634.0px');
  assert.equal(f.stats.layoutReads, 3);
  for (let i = 0; i < 20; i++) f.frame();
  assert.equal(f.stats.layoutReads, 3, 'audio updates must never keep measuring artwork');
  f.motion({ settled: false }); f.frame();
  assert.equal(f.stats.layoutReads, 3, 'travel must not trigger measurements');
  f.motion({}); f.frame(); assert.equal(f.stats.layoutReads, 6);
});

test('reduced motion suspends analysis without disabling music, then restores it', async () => {
  const f = setup(); await f.start(); f.frame();
  f.reduce(true);
  const reads = f.stats.frequency;
  f.frame(); f.frame();
  assert.equal(f.audio.paused, false);
  assert.equal(f.reactiveToggle.disabled, true);
  assert.equal(f.stats.frequency, reads, 'reduced motion should not keep sampling hidden effects');
  assert.equal(f.frames.size, 0);
  f.reduce(false); f.frame();
  assert.equal(f.reactiveToggle.disabled, false);
  assert.ok(f.stats.frequency > reads);
});

test('a rejected play reports blocked, and a gesture retries without duplicating the source', async () => {
  const f = setup(); f.music.beginEntry(); await f.rejectPlay('NotAllowedError');
  assert.equal(f.music.status, 'blocked');
  assert.equal(f.toggle.getAttribute('aria-pressed'), 'false');
  f.motion({});
  await f.rejectPlay('NotAllowedError');
  f.toggle.emit('click'); await f.resolvePlay();
  assert.equal(f.music.status, 'on'); assert.equal(f.stats.sources, 1);
});

test('media load errors expose retry and clear a failed resource before replay', async () => {
  const f = setup(); f.music.beginEntry(); await f.rejectPlay('NotSupportedError');
  assert.equal(f.music.status, 'error');
  f.motion({});
  await f.rejectPlay('NotSupportedError');
  f.audio.error = { code: 4 }; f.detailToggle.emit('click');
  assert.equal(f.stats.loads, 1);
  await f.resolvePlay(); assert.equal(f.music.status, 'on');
});

test('a rejected AudioContext resume cannot falsely report audible playback', async () => {
  const f = setup({ resumeError: 'NotAllowedError' });
  f.music.beginEntry(); f.motion({}); await f.resolvePlay();
  assert.equal(f.music.status, 'blocked');
  assert.equal(f.toggle.getAttribute('aria-pressed'), 'false');
  assert.equal(f.frames.size, 0);
});

test('a resolved resume with an engine still suspended is treated as blocked', async () => {
  const f = setup({ resumeStaysSuspended: true });
  f.music.beginEntry(); await f.resolvePlay();
  assert.equal(f.music.status, 'blocked');
  assert.equal(f.audio.paused, true);
  assert.equal(f.frames.size, 0);
});

test('an external pause updates both controls and a click resumes the same source', async () => {
  const f = setup(); await f.start(); f.audio.pause();
  assert.equal(f.music.status, 'paused');
  assert.equal(f.toggle.getAttribute('aria-pressed'), 'false');
  assert.equal(f.detailToggle.getAttribute('aria-pressed'), 'false');
  assert.equal(f.frames.size, 0);
  f.detailToggle.emit('click'); await f.resolvePlay();
  assert.equal(f.music.status, 'on');
  assert.equal(f.music.enabled, true);
  assert.equal(f.stats.sources, 1);
});

test('pagehide/pageshow resumes the current position without creating another source', async () => {
  const f = setup(); await f.start(); f.progressTo(12);
  f.window.emit('pagehide');
  assert.equal(f.audio.paused, true); assert.equal(f.frames.size, 0);
  f.window.emit('pageshow'); await f.resolvePlay();
  assert.equal(f.music.status, 'on');
  assert.equal(f.audio.currentTime, 12);
  assert.equal(f.stats.sources, 1);
});

test('a saved off preference prevents entry autoplay until explicitly switched on', async () => {
  const f = setup({ preferences: { 'minimaze-music': 'off' } });
  f.music.beginEntry(); f.motion({});
  assert.equal(f.plays.length, 0); assert.equal(f.stats.sources, 0);
  f.toggle.emit('click'); await f.resolvePlay();
  assert.equal(f.music.status, 'on'); assert.equal(f.stats.sources, 1);
});

test('without Web Audio, music still plays while unavailable reactivity is disabled', async () => {
  const f = setup({ noAudioContext: true }); await f.start();
  assert.equal(f.music.status, 'on');
  assert.equal(f.audio.volume, .26);
  assert.equal(f.reactiveToggle.disabled, true);
  assert.equal(f.frames.size, 0);
});

// Synthetic levels verify response timing and state; real audio and rendering
// remain covered by the browser checks.
const variable = (fixture, name) => Number(fixture.music.hallway.gallery.style[name]);

async function hit() {
  const f = setup();
  await f.start();
  f.energy(0, 128); f.frame(1000);
  assert.equal(f.music.beats, 0);
  f.energy(210, 160); f.frame(1017);
  return f;
}

function assertReset(f) {
  assert.equal(variable(f, '--music-drive'), 0, 'brand intensity returns to its static baseline');
  assert.equal(variable(f, '--music-beat'), 0, 'brand expansion returns to its static baseline');
  assert.equal(f.music.pulse, 0, 'the transient is cleared');
  assert.equal(f.music.lightPulse, 0, 'the smoothed visual transient is cleared');
  for (const surface of [f.floor, f.rail, f.backdrop]) assert.equal(Number(surface.style.opacity), 0);
}

test('a bass onset starts a soft response in the same frame across all room layers', async () => {
  const f = await hit();
  assert.equal(f.music.beats, 1);
  assert.equal(f.music.pulse, 1, 'the raw detected onset remains accurate');
  assert.ok(f.music.lightPulse > .1 && f.music.lightPulse < .3, 'the displayed onset begins softly instead of jumping to full brightness');
  assert.ok(Math.abs(variable(f, '--music-beat') - f.music.lightPulse) < .001);
  assert.ok(variable(f, '--music-drive') > .03 && variable(f, '--music-drive') < .1);
  assert.ok(Number(f.floor.style.opacity) > .02);
  assert.ok(Number(f.rail.style.opacity) > .04);
  assert.ok(Number(f.backdrop.style.opacity) > .02);
  for (let time = 1034; time <= 1600; time += 17) {
    f.frame(time);
    assert.ok(variable(f, '--music-drive') <= .23, 'visible energy stays within the subdued ceiling');
    for (const surface of [f.floor, f.rail, f.backdrop]) {
      assert.ok(Number(surface.style.opacity) < .35, 'all room layers remain subdued');
    }
  }
});

test('light rises smoothly then settles after the beat without dimming the audio', async () => {
  const f = await hit();
  const onset = variable(f, '--music-drive');
  let peak = onset;
  for (let time = 1034; time <= 1204; time += 17) {
    const previous = variable(f, '--music-drive');
    f.frame(time);
    const current = variable(f, '--music-drive');
    assert.ok(Math.abs(current - previous) < .05, 'neighboring frames do not create a sharp flash');
    peak = Math.max(peak, current);
  }
  assert.ok(peak > onset * 1.5, 'a real onset still has a visible rise');
  for (let time = 1221; time <= 1612; time += 17) f.frame(time);
  assert.ok(variable(f, '--music-drive') < peak * .9, 'the softer light settles gradually within 600 ms');
  for (let time = 1629; time <= 2224; time += 17) f.frame(time);
  assert.ok(variable(f, '--music-drive') < peak * .65, 'by 1.2 seconds the light is near its quiet level');
  assert.equal(f.music.gain.gain.value, .26, 'only light intensity changes');
});

test('sustained loudness does not invent repeated beats', async () => {
  const f = await hit();
  for (let time = 1034; time <= 3017; time += 17) f.frame(time);
  assert.equal(f.music.beats, 1);
  assert.ok(variable(f, '--music-drive') < .23, 'continuous energy cannot occupy the transient peak range');
});

test('a second low-frequency onset 500 ms later starts another soft rise', async () => {
  const f = await hit();
  f.energy(0, 128);
  for (let time = 1037; time < 1517; time += 20) f.frame(time);
  const before = variable(f, '--music-drive');
  f.energy(210, 160); f.frame(1517);
  assert.equal(f.music.beats, 2);
  assert.equal(f.music.pulse, 1);
  assert.ok(f.music.lightPulse > 0 && f.music.lightPulse < 1);
  assert.ok(variable(f, '--music-drive') > before);
  assert.ok(variable(f, '--music-drive') <= .23);
});

test('a nearby spike 300 ms later does not produce another flash', async () => {
  const f = await hit();
  f.energy(0, 128);
  for (let time = 1037; time < 1317; time += 20) f.frame(time);
  f.energy(230, 170); f.frame(1317);
  assert.equal(f.music.beats, 1);
  assert.ok(f.music.pulse < 1);
});

test('silence and a slow sustained fade-in do not create bass transients', async () => {
  const f = setup(); await f.start();
  f.energy(220, 128); f.frame(1000);
  assert.equal(f.music.beats, 0, 'the RMS silence gate rejects a spectrum-only rise');
  f.energy(0, 128); f.frame(1017);
  // Rise by one byte per 17 ms: slower than the onset threshold.
  for (let i = 1; i <= 210; i++) { f.energy(i, 150); f.frame(1017 + i * 17); }
  assert.equal(f.music.beats, 0);
});

test('layout transitions defer artwork cutouts until final geometry', async () => {
  const f = await hit();
  const gallery = f.music.hallway.gallery;
  gallery.dataset.layoutMoving = 'true';
  // The fixture flushes registered attribute observers through dialog().
  f.dialog(false);
  assertReset(f);
  const reads = f.stats.layoutReads;
  f.frame(1034);
  assert.equal(f.stats.layoutReads, reads, 'never cache intermediate FLIP bounds');
  delete gallery.dataset.layoutMoving;
  f.dialog(false); f.frame(1051);
  assert.equal(f.stats.layoutReads, reads + 3, 'read final geometry once');
  f.frame(1068);
  assert.equal(f.stats.layoutReads, reads + 3);
});

test('a completed hallway resize invalidates the cached light cutout', async () => {
  const f = await hit();
  const reads = f.stats.layoutReads;
  f.music.hallway.gallery.emit('hallway-layout');
  f.frame(1034);
  assert.equal(f.stats.layoutReads, reads + 3);
  f.frame(1051);
  assert.equal(f.stats.layoutReads, reads + 3);
});

const resetCases = [
  ['music off', f => f.toggle.emit('click')],
  ['reactivity off', f => f.reactiveToggle.emit('click')],
  ['a product dialog opens', f => f.dialog(true)],
  ['overview opens', f => f.motion({ mode: 'list', settled: false })],
  ['camera travel begins', f => f.motion({ settled: false })],
  ['the tab becomes hidden', f => f.hidden(true)],
  ['reduced motion becomes enabled', f => f.reduce(true)],
  ['the gallery is left', f => f.music.leave()]
];
for (const [name, action] of resetCases) {
  test(`${name} clears both brand-light variables immediately`, async () => {
    const f = await hit();
    assert.ok(variable(f, '--music-drive') > 0, 'light must be active before testing its reset');
    action(f); assertReset(f);
    f.frame(1051); assertReset(f);
  });
}

(async () => {
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log('PASS ' + name); }
    catch (error) { failures++; console.error('FAIL ' + name + '\n  ' + error.message); }
  }
  console.log(`${tests.length - failures}/${tests.length} music lifecycle and light-response checks passed`);
  if (failures) process.exitCode = 1;
})();
