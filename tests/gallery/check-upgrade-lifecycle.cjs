'use strict';

// Source-class regressions for async lifecycle boundaries. DOM geometry and
// timers are controlled here; this does not claim browser/rendering acceptance.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.resolve(__dirname, '../../portfolio-demos/gallery/card-previews.js');
const source = fs.readFileSync(sourcePath, 'utf8');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function element(tag = 'div') {
  const attributes = new Map();
  const listeners = new Map();
  const classes = new Set();
  return {
    tagName: tag.toUpperCase(), children: [], parentElement: null, dataset: {},
    textContent: '', disabled: false,
    style: { setProperty(name, value) { this[name] = value; } },
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      contains(name) { return classes.has(name); }
    },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    append(...items) {
      items.forEach(item => { item.remove(); item.parentElement = this; this.children.push(item); });
    },
    remove() {
      if (!this.parentElement) return;
      const siblings = this.parentElement.children;
      const index = siblings.indexOf(this);
      if (index >= 0) siblings.splice(index, 1);
      this.parentElement = null;
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    async emit(type, event = {}) {
      await Promise.all((listeners.get(type) || []).map(fn => fn(event)));
    },
    querySelector() { return null; },
    getBoundingClientRect() { return this.rect; },
    animate(keyframes, options) {
      this.lastAnimation = { keyframes, options };
      return { finished: Promise.resolve(), cancel() {} };
    }
  };
}

function environment({ enabled = true, reduced = false, mode = 'wall' } = {}) {
  const timers = new Map();
  const rafs = new Map();
  const requests = [];
  const attachCalls = [];
  let serial = 0;
  const document = element('document');
  document.body = element('body');
  document.body.dataset.scene = 'gallery';
  document.baseURI = 'http://127.0.0.1:5173/portfolio-demos/gallery/';
  document.hidden = false;
  document.createElement = tag => element(tag);
  document.querySelectorAll = () => [];
  const window = element('window');
  window.PortfolioDemoGuide = {
    prepareSource: (_, html) => html,
    attach(frame) { attachCalls.push(frame); return { destroy() {}, seek() {} }; }
  };
  const preference = element('media-query');
  preference.matches = reduced;
  const context = vm.createContext({
    console, document, window, URL, AbortController,
    innerWidth: 1280, innerHeight: 720,
    matchMedia: () => preference,
    MutationObserver: class { observe() {} },
    getComputedStyle: item => ({ transform: item.style.transform || 'none' }),
    setTimeout(fn, delay) { const id = ++serial; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { const id = ++serial; rafs.set(id, fn); return id; },
    cancelAnimationFrame(id) { rafs.delete(id); },
    // Deliberately allow a request to resolve after cancellation, to test the
    // frame identity guard independently from browser AbortController behavior.
    fetch(url, options) {
      const request = { url, options, ...deferred() };
      requests.push(request);
      return request.promise;
    }
  });
  vm.runInContext(source + '\nglobalThis.TestPreviews = GalleryCardPreviews;', context, { filename: sourcePath });
  const product = {
    name: 'Repaste', tagline: '剪贴板，藏进刘海里',
    image: 'poster.jpg', imageWidth: 980, imageHeight: 640,
    demo: 'embed-repaste.html', background: '#272536'
  };
  const sourceFrame = element('span');
  sourceFrame.rect = { left: 17, top: 231, width: 320, height: 210, right: 337, bottom: 441 };
  const status = element('span');
  const card = element('button');
  card.querySelector = selector => selector === '.artwork-frame' ? sourceFrame : status;
  const hallway = {
    index: 0, phase: 'ready', mode, gallery: element(),
    order: ['repaste'], cards: [{ product, card, illumination: '1' }],
    asset: value => value, perspective: 1203.2, layoutWidth: 1280, layoutHeight: 720,
    sizes: [{ width: 550, height: 360 }], stops: [0], plane: element(),
    goTo(...args) { this.lastGoTo = args; }
  };
  hallway.plane.style.transform = 'translate3d(0,0,0)';
  const media = element();
  media.rect = { left: 80, top: 100, width: 600, height: 360, right: 680, bottom: 460 };
  const bar = element();
  bar.rect = { bottom: 90 };
  media.closest = () => ({ querySelector: () => bar });
  const reportedSteps = [];
  const preview = new context.TestPreviews({ hallway, toggle: element('button'), onStep: step => reportedSteps.push(step) });
  preview.enabled = enabled;
  preview.motion.settled = true;
  return {
    preview, hallway, sourceFrame, media, window, document, timers, rafs, requests, attachCalls, reportedSteps,
    expire(id) { const timer = timers.get(id); assert.ok(timer, 'timer exists'); timers.delete(id); timer.fn(); },
    respond(request) { request.resolve({ ok: true, text: async () => '<html><head></head><body></body></html>' }); },
    countFrames() { return preview.layer.children.flatMap(surface => surface.children).filter(child => child.tagName === 'IFRAME').length; }
  };
}

async function flush() { for (let i = 0; i < 6; i++) await Promise.resolve(); }
const passed = [];
async function test(name, check) { await check(); passed.push(name); }

(async () => {
  await test('empty load requests safely do nothing', async () => {
    const env = environment();
    await env.preview.loadDemo(null);
    await env.preview.loadDemo(undefined);
    assert.equal(env.requests.length, 0);
  });

  await test('timed-out response and stale frame events cannot append or remove the retry', async () => {
    const env = environment();
    const { preview } = env;
    preview.detail = { index: 0, media: env.media };
    const record = preview.createFrame(0, true);
    const first = preview.loadDemo(record);
    const oldFrame = record.frame;
    const firstRequest = env.requests[0];
    env.expire(record.timeout);
    assert.equal(firstRequest.options.signal.aborted, true);
    assert.equal(record.frame, null);
    const retry = preview.loadDemo(record);
    const retryFrame = record.frame;
    assert.notEqual(retryFrame, oldFrame);
    env.respond(firstRequest);
    await first;
    assert.equal(env.countFrames(), 0, 'late response must not append the old iframe');
    assert.equal(record.frame, retryFrame);
    env.respond(env.requests[1]);
    await retry;
    assert.equal(env.countFrames(), 1);
    assert.equal(record.surface.children.at(-1), retryFrame);
    await oldFrame.emit('error');
    await oldFrame.emit('load');
    assert.equal(record.frame, retryFrame, 'old handlers must not fail the retry');
    assert.equal(env.countFrames(), 1);
    assert.equal(env.attachCalls.length, 0, 'stale load must not prepare a different frame');
  });

  await test('a rejected cancelled fetch cannot tear down the retry', async () => {
    const env = environment();
    const { preview } = env;
    preview.detail = { index: 0, media: env.media };
    const record = preview.createFrame(0, true);
    const first = preview.loadDemo(record);
    env.expire(record.timeout);
    const retry = preview.loadDemo(record);
    const retryFrame = record.frame;
    env.requests[0].reject(new Error('cancelled request'));
    await first;
    assert.equal(record.frame, retryFrame);
    assert.equal(env.requests[1].options.signal.aborted, false);
    env.respond(env.requests[1]);
    await retry;
    assert.equal(env.countFrames(), 1);
  });

  await test('old preparation waiting on fonts cannot attach after a retry starts', async () => {
    const env = environment();
    const { preview } = env;
    preview.detail = { index: 0, media: env.media };
    const record = preview.createFrame(0, true);
    const firstLoad = preview.loadDemo(record);
    env.respond(env.requests[0]);
    await firstLoad;
    const oldFrame = record.frame;
    const fonts = deferred();
    oldFrame.contentDocument = { querySelector: () => ({}), documentElement: {}, fonts: { ready: fonts.promise } };
    const preparing = preview.prepare(record, oldFrame);
    env.expire(record.timeout);
    const retry = preview.loadDemo(record);
    const retryFrame = record.frame;
    fonts.resolve();
    await preparing;
    assert.equal(record.frame, retryFrame);
    assert.equal(record.ready, false);
    assert.equal(env.attachCalls.length, 0);
    env.respond(env.requests[1]);
    await retry;
    assert.equal(env.countFrames(), 1);
  });

  await test('pagehide and pageshow rebuild an open detail exactly once', async () => {
    const env = environment();
    const { preview } = env;
    const before = preview.beginDetail(0, env.media, env.sourceFrame);
    await env.window.emit('pagehide');
    assert.equal(preview.current, null);
    assert.ok(preview.detail);
    assert.equal(env.requests[0].options.signal.aborted, true);
    await env.window.emit('pageshow');
    const restored = preview.current;
    assert.ok(restored);
    assert.notEqual(restored, before);
    assert.equal(restored.index, 0);
    assert.equal(restored.visible, true);
    assert.equal(preview.layer.children.length, 1);
    assert.equal(env.requests.length, 2);
    env.requests.forEach(request => env.respond(request));
    await flush();
    assert.equal(env.countFrames(), 1, 'cancelled old request cannot create a second iframe');
    await env.window.emit('pageshow');
    assert.equal(preview.current, restored);
    assert.equal(env.requests.length, 2);
    assert.equal(env.countFrames(), 1);
  });

  for (const option of [{ enabled: false }, { reduced: true }]) {
    await test(`pageshow preserves poster-only preference ${JSON.stringify(option)}`, async () => {
      const env = environment(option);
      const { preview } = env;
      preview.beginDetail(0, env.media, env.sourceFrame);
      await env.window.emit('pagehide');
      await env.window.emit('pageshow');
      assert.ok(preview.current);
      assert.equal(preview.current.frame, null);
      assert.equal(preview.current.visible, true);
      assert.equal(env.requests.length, 0);
      const manual = preview.loadDemo(preview.current);
      env.respond(env.requests[0]);
      await manual;
      assert.equal(env.countFrames(), 1, 'explicit play remains possible');
    });
  }

  await test('closing from list mode returns to the actual list card rectangle', async () => {
    const env = environment({ enabled: false, mode: 'list' });
    const { preview } = env;
    const record = preview.beginDetail(0, env.media, env.sourceFrame);
    await preview.collapse();
    const target = record.surface.lastAnimation.keyframes.at(-1).transform;
    assert.equal(target, `translate3d(18px,232px,0) scale(${318 / 980})`);
    assert.deepEqual(env.hallway.lastGoTo, [0, false, true]);
    preview.endDetail();
    assert.equal(preview.detail, null);
    assert.equal(preview.current, null);
    assert.equal(preview.layer.children.length, 0);
  });

  console.log(JSON.stringify({ source: sourcePath, passed: passed.length, tests: passed, boundary: 'Source lifecycle checks only; real layout and motion are verified separately in the browser.' }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
