'use strict';

// A horizontal camera moving along one long exhibition wall.
// Wheel, drag, touch and keyboard all move the same position, with one settling loop.
class ProductHallway {
  constructor({ viewport, plane, order, products, asset, onOpen, announce }) {
    Object.assign(this, { viewport, plane, order, products, asset, onOpen, announce });
    this.mode = 'wall';
    this.index = 0;
    this.current = 0;
    this.target = 0;
    this.depth = 0;
    this.turn = 0;
    this.cameraY = 0;
    this.journey = null;
    this.phase = 'idle';
    this.frame = 0;
    this.lastTime = 0;
    this.drag = null;
    this.suppressClickUntil = 0;
    this.stops = [];
    this.cards = [];
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.gallery = document.querySelector('#gallery');
    this.controls = document.querySelector('.view-controls');
    this.hint = document.querySelector('.gallery-hint');
    this.counter = document.querySelector('#hallway-current');
    this.pagination = document.querySelector('#hallway-pagination');
    this.markers = [];
    this.navigationState = '';
    this.motionState = '';
    this.previous = document.querySelector('#hallway-previous');
    this.next = document.querySelector('#hallway-next');
    for (const name of ['wall', 'floor', 'ceiling']) {
      const element = document.createElement('div');
      element.className = 'room-' + name;
      element.setAttribute('aria-hidden', 'true');
      plane.append(element);
    }
    order.forEach((id, index) => this.createArtwork(id, index));
    this.previous.addEventListener('click', () => this.goTo(this.nearest(this.target) - 1));
    this.next.addEventListener('click', () => this.goTo(this.nearest(this.target) + 1));
    this.bindInput();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(viewport);
  }

  createArtwork(id, index) {
    const product = this.products[id];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'artwork';
    card.dataset.product = id;
    card.setAttribute('aria-label', `查看 ${product.name}：${product.tagline}`);
    const light = document.createElement('span');
    light.className = 'artwork-light';
    light.setAttribute('aria-hidden', 'true');
    const wires = document.createElement('span');
    wires.className = 'artwork-wires';
    wires.setAttribute('aria-hidden', 'true');
    const frame = document.createElement('span');
    frame.className = 'artwork-frame';
    const image = document.createElement('img');
    image.className = 'artwork-image';
    image.src = this.asset(product.image);
    image.alt = product.imageAlt;
    image.width = product.imageWidth;
    image.height = product.imageHeight;
    image.draggable = false;
    frame.style.setProperty('--image-bg', product.background);
    frame.append(image);
    const caption = document.createElement('span');
    caption.className = 'artwork-caption';
    const identity = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = product.name;
    const tagline = document.createElement('small');
    tagline.textContent = product.tagline;
    identity.append(title, tagline);
    const arrow = document.createElement('span');
    arrow.className = 'artwork-arrow';
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden', 'true');
    caption.append(identity, arrow);
    card.append(light, wires, frame, caption);
    card.addEventListener('click', event => {
      if (this.journey) return;
      if (performance.now() < this.suppressClickUntil && event.detail !== 0) return;
      if (this.mode === 'wall' && (index !== this.index || Math.abs(this.current - this.stops[index]) > 45)) {
        this.goTo(index);
        return;
      }
      this.onOpen(index, card);
    });
    this.plane.append(card);
    const reflection = document.createElement('div');
    reflection.className = 'artwork-reflection';
    reflection.setAttribute('aria-hidden', 'true');
    const reflectedImage = document.createElement('img');
    reflectedImage.src = image.src;
    reflectedImage.alt = '';
    reflectedImage.draggable = false;
    reflection.append(reflectedImage);
    this.plane.append(reflection);
    this.cards.push({ card, reflection, product });
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'hallway-product';
    marker.dataset.product = id;
    marker.setAttribute('aria-label', `浏览 ${product.name}，第 ${index + 1} 件，共 ${this.order.length} 件作品`);
    marker.setAttribute('aria-controls', this.viewport.id);
    marker.title = product.name;
    const markerIcon = document.createElement('img');
    markerIcon.className = 'hallway-product-icon';
    markerIcon.src = this.asset(product.icon);
    markerIcon.alt = '';
    markerIcon.width = 24;
    markerIcon.height = 24;
    markerIcon.decoding = 'async';
    markerIcon.draggable = false;
    const markerLabel = document.createElement('span');
    markerLabel.className = 'hallway-product-label';
    markerLabel.textContent = product.name;
    marker.append(markerIcon, markerLabel);
    marker.addEventListener('click', () => this.goTo(index));
    this.pagination.append(marker);
    this.markers.push(marker);
  }

  resize() {
    const width = this.viewport.clientWidth;
    const height = this.viewport.clientHeight;
    if (!width || !height) return;
    if (this.layoutWidth === width && this.layoutHeight === height) return;
    this.layoutWidth = width;
    this.layoutHeight = height;
    const currentIndex = this.index;
    const phone = width < 701;
    const gap = phone ? width * .18 : width * .17;
    let cursor = 0;
    const sizes = this.sizes = this.cards.map(({ product }) => {
      const ratio = product.imageWidth / product.imageHeight;
      const maxWidth = phone ? width * .84 : Math.min(width * .65, height * 1.13);
      const maxHeight = phone ? height * .42 : height * .50;
      const imageHeight = Math.min(maxHeight, maxWidth / ratio);
      return { width: imageHeight * ratio, height: imageHeight };
    });
    this.stops = sizes.map((size, i) => {
      if (i) cursor += sizes[i - 1].width / 2 + gap + size.width / 2;
      return cursor;
    });
    this.limit = this.stops.at(-1) || 0;
    this.plane.style.setProperty('--room-width', (this.limit + width * 1.8) + 'px');
    this.plane.style.setProperty('--room-left', -width * .9 + 'px');
    this.plane.style.setProperty('--room-height', height * 1.23 + 'px');
    this.plane.style.setProperty('--room-top', -height * .75 + 'px');
    this.plane.style.setProperty('--floor-y', height * .33 + 'px');
    this.plane.style.setProperty('--bay-width', (sizes[0].width + gap) + 'px');
    this.perspective = Math.max(680, width * .94);
    this.viewport.style.perspective = this.perspective + 'px';
    this.cards.forEach(({ card, reflection }, i) => {
      const size = sizes[i];
      for (const element of [card, reflection]) {
        element.style.setProperty('--work-x', this.stops[i] + 'px');
        element.style.setProperty('--work-width', size.width + 'px');
        element.style.setProperty('--image-height', size.height + 'px');
      }
      card.style.setProperty('--work-top', (-size.height / 2 - height * .025) + 'px');
      card.style.setProperty('--light-height', height * .75 - size.height / 2 - height * .025 + 'px');
    });
    if (this.journey) {
      this.journey.path = this.buildEntryPath(this.journey.destination);
      this.target = this.stops[this.journey.destination];
      this.updateJourney(performance.now());
    } else {
      this.current = this.target = this.stops[currentIndex] || 0;
      this.turn = 0;
    }
    this.render();
    // ResizeObserver runs after window resize listeners. Publish the completed
    // layout even when the settled product/motion state has not changed.
    this.gallery.dispatchEvent(new CustomEvent('hallway-layout'));
  }

  nearest(position) {
    return this.stops.reduce((best, stop, index) => Math.abs(stop - position) < Math.abs(this.stops[best] - position) ? index : best, 0);
  }

  setMode(mode) {
    if (this.journey) return;
    clearTimeout(this.wheelTimer);
    this.wheelTimer = 0;
    this.drag = null;
    this.mode = mode;
    this.navigationState = '';
    this.viewport.scrollTop = 0;
    this.cards.forEach(({ card }) => { card.tabIndex = mode === 'list' ? 0 : -1; });
    this.hint.textContent = mode === 'list' ? '点击作品查看详情' : innerWidth < 701 ? '向左滑动浏览' : '滚动或向左拖动';
    if (mode === 'wall') this.goTo(this.index, false, true);
    this.publishMotion();
  }

  enter() {
    this.leave();
    this.resize();
    this.index = 0;
    this.target = this.stops[0];
    if (this.mode === 'wall' && !this.reducedMotion.matches) {
      this.journey = {
        startedAt: performance.now(),
        duration: this.layoutWidth < 701 ? 4400 : 5200,
        destination: 0,
        path: this.buildEntryPath(0),
        elapsed: 0,
        progress: 0,
        speed: 0
      };
      this.setPhase('entering');
      this.updateJourney(this.journey.startedAt);
      this.render();
      this.start();
      this.announce('正在进入展厅，沿作品墙靠近第一款作品。');
    } else {
      this.current = this.target;
      this.depth = this.turn = this.cameraY = 0;
      this.setPhase('ready');
      this.render();
    }
    this.viewport.focus({ preventScroll: true });
  }

  leave() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lastTime = 0;
    clearTimeout(this.wheelTimer);
    this.wheelTimer = 0;
    this.drag = null;
    this.viewport.classList.remove('dragging');
    this.journey = null;
    this.depth = this.turn = this.cameraY = 0;
    this.setPhase('idle');
  }

  setPhase(phase) {
    this.phase = phase;
    this.gallery.dataset.phase = phase;
    this.viewport.setAttribute('aria-busy', String(phase === 'entering'));
    this.controls.inert = phase === 'entering';
    this.pagination.inert = phase === 'entering';
    this.publishMotion();
  }

  // Notify the demo player only at lifecycle boundaries, not on every frame.
  publishMotion() {
    const settled = this.phase === 'ready' && this.mode === 'wall' && !this.journey &&
      !this.frame && !this.drag && !this.wheelTimer &&
      Math.abs(this.current - this.target) < .1 && Math.abs(this.turn) < .015;
    const state = `${this.phase}:${this.mode}:${settled}:${settled ? this.index : -1}`;
    if (state === this.motionState) return;
    this.motionState = state;
    this.gallery.dispatchEvent(new CustomEvent('hallway-motion', {
      detail: { phase: this.phase, mode: this.mode, settled, index: this.index }
    }));
  }

  buildEntryPath(destination) {
    const width = this.layoutWidth;
    const artLeft = -this.sizes[0].width / 2;
    const artRight = this.limit + this.sizes.at(-1).width / 2;
    const fromX = (artLeft + artRight) / 2;
    const fromZ = Math.max(this.layoutHeight, this.perspective * ((artRight - artLeft) / (width * .86) - 1));
    const toX = this.stops[destination];
    const control = [[fromX, fromZ], [fromX, fromZ * .70], [toX, fromZ * .40], [toX, 0]];
    const samples = [];
    let length = 0;
    for (let i = 0; i <= 96; i++) {
      const t = i / 96;
      const u = 1 - t;
      const weights = [u ** 3, 3 * u * u * t, 3 * u * t * t, t ** 3];
      const x = control.reduce((sum, point, j) => sum + weights[j] * point[0], 0);
      const z = control.reduce((sum, point, j) => sum + weights[j] * point[1], 0);
      if (i) length += Math.hypot(x - samples[i - 1].x, z - samples[i - 1].z);
      samples.push({ x, z, length });
    }
    return samples.map(point => ({ ...point, at: point.length / length }));
  }

  updateJourney(time) {
    const journey = this.journey;
    const normalized = Math.max(0, Math.min(1, (time - journey.startedAt) / journey.duration));
    const accelerate = .22;
    const decelerate = .34;
    const rate = 1 / (1 - accelerate / 2 - decelerate / 2);
    let progress, speed;
    if (normalized < accelerate) {
      progress = rate * normalized * normalized / (2 * accelerate);
      speed = normalized / accelerate;
    } else if (normalized < 1 - decelerate) {
      progress = rate * (normalized - accelerate / 2);
      speed = 1;
    } else {
      progress = 1 - rate * (1 - normalized) ** 2 / (2 * decelerate);
      speed = (1 - normalized) / decelerate;
    }
    const path = journey.path;
    let next = 1;
    while (next < path.length - 1 && path[next].at < progress) next++;
    const from = path[next - 1];
    const to = path[next];
    const mix = (progress - from.at) / Math.max(.00001, to.at - from.at);
    const x = from.x + (to.x - from.x) * mix;
    this.depth = from.z + (to.z - from.z) * mix;
    const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
    const elapsed = (time - journey.startedAt) / 1000;
    const sway = this.layoutWidth < 701 ? 0 : 1;
    this.current = x + Math.sin(elapsed * Math.PI * .925) * this.layoutHeight * .0022 * speed * sway;
    this.cameraY = -Math.abs(Math.sin(elapsed * Math.PI * 1.85)) * this.layoutHeight * .006 * speed * sway;
    this.turn = Math.max(-28, Math.min(28, Math.atan2(this.target - x, this.depth + this.perspective) * 180 / Math.PI)) * smooth((progress - .1) / .3);
    Object.assign(journey, { elapsed, progress, speed });
    return normalized >= 1;
  }

  goTo(index, focus = false, immediate = false) {
    if (this.gallery.dataset.layoutMoving === 'true' && !immediate) return;
    if (this.journey) return;
    this.index = Math.max(0, Math.min(this.order.length - 1, index));
    this.target = this.stops[this.index] || 0;
    if (immediate || this.reducedMotion.matches) {
      this.current = this.target;
      this.depth = this.turn = 0;
      this.render();
    } else this.start();
    if (focus) this.cards[this.index].card.focus({ preventScroll: true });
    this.announce(`第 ${this.index + 1} 款作品，${this.products[this.order[this.index]].name}。`);
  }

  start() {
    if (!this.frame && this.mode === 'wall') this.frame = requestAnimationFrame(time => this.tick(time));
    this.publishMotion();
  }

  tick(time) {
    this.frame = 0;
    if (this.mode !== 'wall') { this.lastTime = 0; return; }
    if (this.journey) {
      const complete = this.updateJourney(time);
      if (complete) {
        this.current = this.target;
        this.depth = this.turn = this.cameraY = 0;
        this.journey = null;
        this.setPhase('ready');
        this.lastTime = 0;
        this.announce('已到达第一款作品，滚动或向左拖动继续浏览。');
      }
      this.render();
      if (!complete) this.start();
      return;
    }
    const dt = this.lastTime ? Math.min(.05, (time - this.lastTime) / 1000) : 1 / 60;
    this.lastTime = time;
    const distance = this.target - this.current;
    const ease = this.reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 7.5);
    const turnTarget = this.reducedMotion.matches ? 0 : Math.max(-4, Math.min(4, -distance / this.layoutWidth * 6));
    this.turn += (turnTarget - this.turn) * (1 - Math.exp(-dt * 6));
    this.current += distance * ease;
    this.depth += -this.depth * ease;
    if (Math.abs(this.target - this.current) < .1 && this.depth < .1 && Math.abs(this.turn) < .015) {
      this.current = this.target;
      this.depth = this.turn = 0;
      this.lastTime = 0;
    } else this.start();
    this.render();
  }

  render() {
    const shown = this.journey ? this.journey.destination : this.nearest(this.current);
    this.index = shown;
    // Rotate around the camera, then move through the exhibition in world coordinates.
    this.plane.style.transform = `rotateY(${this.turn.toFixed(3)}deg) translate3d(${-this.current.toFixed(3)}px, ${-this.cameraY.toFixed(3)}px, ${-this.depth.toFixed(3)}px)`;
    this.plane.style.setProperty('--mobile-camera', this.plane.style.transform);
    this.plane.style.setProperty('--floor-scale', (Math.max(520, this.depth + this.perspective * .72) / 1000).toFixed(5));
    this.plane.dataset.cameraX = this.current.toFixed(2);
    this.plane.dataset.targetX = this.target.toFixed(2);
    this.plane.dataset.active = this.order[shown];
    this.plane.dataset.cameraDepth = this.depth.toFixed(2);
    this.plane.dataset.cameraTurn = this.turn.toFixed(2);
    this.plane.dataset.journeyProgress = this.journey ? this.journey.progress.toFixed(4) : this.phase === 'ready' ? '1' : '0';
    const step = this.stops.length > 1 ? Math.abs(this.stops[1] - this.stops[0]) : 1;
    this.cards.forEach((artwork, i) => {
      const { card, reflection } = artwork;
      const distance = Math.abs(this.current - this.stops[i]) / step;
      let light = Math.max(.22, 1 - distance * .65);
      if (this.journey) {
        const on = Math.max(0, Math.min(1, (this.journey.elapsed - .9 - i * .12) / .4));
        const focus = Math.max(0, Math.min(1, (this.journey.progress - .5) / .5));
        light = on * ((1 - focus) * .8 + focus * light);
      }
      const illumination = light.toFixed(3);
      if (artwork.illumination !== illumination) {
        artwork.illumination = illumination;
        card.style.setProperty('--illumination', illumination);
        reflection.style.opacity = (light * .16).toFixed(3);
      }
    });
    this.renderNavigation(shown);
    this.publishMotion();
  }

  renderNavigation(shown) {
    const destination = this.nearest(this.target);
    const state = `${shown}:${destination}:${this.phase}:${this.mode}`;
    if (state === this.navigationState) return;
    this.navigationState = state;
    this.cards.forEach(({ card }, i) => {
      card.classList.toggle('is-current', i === shown);
      card.tabIndex = this.journey ? -1 : this.mode === 'list' || i === shown ? 0 : -1;
      if (i === shown) card.setAttribute('aria-current', 'true');
      else card.removeAttribute('aria-current');
    });
    this.previous.disabled = destination === 0;
    this.next.disabled = destination === this.order.length - 1;
    this.counter.textContent = String(shown + 1).padStart(2, '0');
    this.markers.forEach((button, i) => {
      button.setAttribute('aria-current', String(i === shown));
      button.dataset.destination = String(i === destination && destination !== shown);
    });
  }

  bindInput() {
    this.viewport.addEventListener('wheel', event => {
      if (this.gallery.dataset.layoutMoving === 'true') { event.preventDefault(); return; }
      if (this.mode !== 'wall' || event.ctrlKey || document.querySelector('dialog[open]')) return;
      if (this.journey) { event.preventDefault(); return; }
      const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * (event.deltaMode === 1 ? 16 : 1);
      if (!delta) return;
      event.preventDefault();
      if (!this.wheelTimer) this.wheelStart = this.nearest(this.target);
      this.target = Math.max(0, Math.min(this.limit, this.target + delta * 1.05));
      this.start();
      clearTimeout(this.wheelTimer);
      this.wheelTimer = setTimeout(() => {
        const origin = this.wheelStart;
        const shift = this.target - this.stops[origin];
        let destination = this.nearest(this.target);
        if (destination === origin && Math.abs(shift) > 35) destination += Math.sign(shift);
        this.wheelTimer = 0;
        this.goTo(destination);
      }, 180);
    }, { passive: false });
    this.viewport.addEventListener('pointerdown', event => {
      if (this.gallery.dataset.layoutMoving === 'true') return;
      if (this.mode !== 'wall' || this.journey || event.button !== 0) return;
      clearTimeout(this.wheelTimer);
      this.wheelTimer = 0;
      this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, target: this.target, index: this.nearest(this.target), distance: 0, axis: event.pointerType === 'mouse' ? 'x' : null };
      this.publishMotion();
    });
    this.viewport.addEventListener('pointermove', event => {
      if (!this.drag || event.pointerId !== this.drag.id) return;
      const dx = event.clientX - this.drag.x;
      const dy = event.clientY - this.drag.y;
      // Lock a touch gesture to its initial axis so a diagonal movement cannot
      // reverse the camera direction when dx and dy cross in magnitude.
      if (!this.drag.axis) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
        this.drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      const move = this.drag.axis === 'x' ? dx : dy;
      if (Math.abs(move) < 6 && !this.drag.distance) return;
      this.drag.distance = move;
      this.suppressClickUntil = performance.now() + 350;
      this.viewport.classList.add('dragging');
      if (!this.viewport.hasPointerCapture(event.pointerId)) this.viewport.setPointerCapture(event.pointerId);
      this.target = Math.max(0, Math.min(this.limit, this.drag.target - move * 1.25));
      this.start();
    });
    const release = () => {
      if (!this.drag) return;
      const drag = this.drag;
      this.drag = null;
      this.viewport.classList.remove('dragging');
      if (Math.abs(drag.distance) < 6) { this.publishMotion(); return; }
      let destination = this.nearest(this.target);
      if (destination === drag.index && Math.abs(drag.distance) > 35) destination -= Math.sign(drag.distance);
      this.goTo(destination);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    this.viewport.addEventListener('keydown', event => {
      if (this.gallery.dataset.layoutMoving === 'true') { event.preventDefault(); return; }
      if (this.journey) {
        if (['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', ' '].includes(event.key)) event.preventDefault();
        return;
      }
      if (this.mode === 'wall' && event.key === 'Enter' && event.target === this.viewport) {
        event.preventDefault();
        this.onOpen(this.index, this.cards[this.index].card);
        return;
      }
      if (this.mode !== 'wall' || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = this.nearest(this.target);
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? this.order.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1);
      this.goTo(index, true);
    });
  }
}
