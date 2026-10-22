'use strict';

// Narrow interaction regressions against the real controller. This does not
// emulate rendering or claim browser/frame-rate verification.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.resolve(__dirname, '../../portfolio-demos/gallery/hallway.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const context = vm.createContext({
  console, performance: { now: () => 1000 }, innerWidth: 1280,
  requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  setTimeout, clearTimeout,
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  document: { querySelector: () => null },
  window: { addEventListener() {} }
});
vm.runInContext(source + '\nglobalThis.TestHallway = ProductHallway;', context, { filename: sourcePath });

function element() {
  const listeners = new Map();
  const attributes = new Map();
  const classes = new Set();
  const captures = new Set();
  return {
    dataset: {}, textContent: '', disabled: false, tabIndex: -1,
    style: { setProperty(name, value) { this[name] = value; } },
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }
    },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) { attributes.delete(name); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    addEventListener(type, listener) { listeners.set(type, listener); },
    dispatchEvent(event) { listeners.get(event.type)?.(event); },
    hasPointerCapture(id) { return captures.has(id); },
    setPointerCapture(id) { captures.add(id); },
    emit(type, event) {
      assert.ok(listeners.has(type), `listener exists: ${type}`);
      listeners.get(type)({ preventDefault() {}, ...event });
    },
    focus() {}
  };
}

function hallway() {
  const instance = Object.create(context.TestHallway.prototype);
  const order = ['first', 'second', 'third'];
  Object.assign(instance, {
    viewport: element(), plane: element(), gallery: element(), controls: element(),
    hint: element(), counter: element(), pagination: element(),
    previous: element(), next: element(), markers: order.map(element),
    cards: order.map(id => ({ card: element(), reflection: element(), product: { name: id } })),
    products: Object.fromEntries(order.map(id => [id, { name: id }])),
    order, stops: [0, 800, 1600], limit: 1600,
    layoutWidth: 1280, layoutHeight: 720, perspective: 1203.2,
    current: 800, target: 800, index: 1, depth: 0, turn: 0, cameraY: 0,
    mode: 'wall', phase: 'ready', journey: null, drag: null,
    frame: 0, lastTime: 0, wheelTimer: 0, suppressClickUntil: 0,
    navigationState: '', reducedMotion: { matches: false },
    announce() {}, onOpen() {}
  });
  instance.bindInput();
  return instance;
}

function pointer(instance, type, pointerType, x, y) {
  instance.viewport.emit(type, { pointerId: 7, pointerType, button: 0, clientX: x, clientY: y });
}

const passed = [];
function test(name, check) { check(); passed.push(name); }

test('touch locks vertical axis after threshold and does not reverse at the diagonal boundary', () => {
  const instance = hallway();
  pointer(instance, 'pointerdown', 'touch', 0, 0);
  pointer(instance, 'pointermove', 'touch', -5, 4);
  assert.equal(instance.drag.axis, null);
  assert.equal(instance.target, 800);
  pointer(instance, 'pointermove', 'touch', -70, 72);
  const firstTarget = instance.target;
  assert.equal(instance.drag.axis, 'y');
  assert.ok(firstTarget < 800);
  pointer(instance, 'pointermove', 'touch', -75, 73);
  assert.equal(instance.drag.axis, 'y');
  assert.ok(instance.target < firstTarget, 'continued vertical movement must not flip to horizontal direction');
});

test('touch locks horizontal axis even when vertical movement later becomes larger', () => {
  const instance = hallway();
  pointer(instance, 'pointerdown', 'touch', 0, 0);
  pointer(instance, 'pointermove', 'touch', -70, 69);
  const firstTarget = instance.target;
  assert.equal(instance.drag.axis, 'x');
  assert.ok(firstTarget > 800);
  pointer(instance, 'pointermove', 'touch', -71, 73);
  assert.equal(instance.drag.axis, 'x');
  assert.ok(instance.target > firstTarget, 'continued left movement must keep advancing right along the wall');
});

test('mouse drag always follows horizontal displacement', () => {
  const instance = hallway();
  pointer(instance, 'pointerdown', 'mouse', 100, 100);
  pointer(instance, 'pointermove', 'mouse', 120, 300);
  assert.equal(instance.drag.axis, 'x');
  assert.ok(instance.target < 800, 'moving right must move toward the previous artwork');
  pointer(instance, 'pointermove', 'mouse', 90, 600);
  assert.ok(instance.target > 800, 'moving left must move toward the next artwork despite larger positive Y');
});

test('wall-list-wall restores the active roving tabindex despite cached navigation state', () => {
  const instance = hallway();
  instance.wheelTimer = setTimeout(() => {}, 10000);
  instance.render();
  assert.deepEqual(instance.cards.map(item => item.card.tabIndex), [-1, 0, -1]);
  assert.equal(instance.cards[1].card.getAttribute('aria-current'), 'true');
  instance.setMode('list');
  assert.equal(instance.wheelTimer, 0, 'cancelled wheel input must not block settled previews');
  assert.deepEqual(instance.cards.map(item => item.card.tabIndex), [0, 0, 0]);
  instance.setMode('wall');
  assert.deepEqual(instance.cards.map(item => item.card.tabIndex), [-1, 0, -1]);
  assert.equal(instance.markers[1].getAttribute('aria-current'), 'true');
  assert.equal(instance.counter.textContent, '02');
});

test('preview start is gated until the entrance and camera have fully settled', () => {
  const instance = hallway();
  const states = [];
  instance.gallery.addEventListener('hallway-motion', event => states.push(event.detail));
  instance.phase = 'entering';
  instance.publishMotion();
  assert.equal(states.at(-1).settled, false);
  instance.phase = 'ready';
  instance.current = 795;
  instance.publishMotion();
  assert.equal(states.at(-1).settled, false);
  instance.current = 800;
  instance.frame = 1;
  instance.publishMotion();
  assert.equal(states.at(-1).settled, false);
  instance.frame = 0;
  instance.publishMotion();
  assert.equal(states.at(-1).settled, true);
  const count = states.length;
  instance.publishMotion();
  assert.equal(states.length, count, 'unchanged frames do not notify or restart previews');
  pointer(instance, 'pointerdown', 'mouse', 100, 100);
  assert.equal(states.at(-1).settled, false);
  instance.leave();
  assert.equal(states.at(-1).phase, 'idle');
  assert.equal(states.at(-1).settled, false);
});

console.log(JSON.stringify({ source: sourcePath, passed: passed.length, tests: passed }, null, 2));
