'use strict';

// Landscape cards travel along an actual arc. One gesture advances at most one
// card. No timer, autoplay, wheel hijack, or extra animation library is used.
(() => {
  const stage = document.querySelector('#fan-stage');
  if (!stage) return;
  const cards = [...stage.querySelectorAll('.project')];
  const count = cards.length;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const modes = {
    hand: { label: '方案 A / 紧凑手牌', description: '卡片紧密叠放，选中的一张轻轻提起。' },
    arc: { label: '方案 B / 宽弧扇形', description: '圆弧展开得更宽，让两侧的作品露出更多。' },
    focus: { label: '方案 C / 聚焦拨牌', description: '中间一张更大，两侧沿弧线退后；拨动时下一张接手。' }
  };
  const params = new URLSearchParams(location.search);
  let mode = Object.hasOwn(modes, params.get('mode')) ? params.get('mode') : 'focus';
  let selected = Math.min(1, count - 1);
  let position = selected;
  let target = position;
  let velocity = 0;
  let layout = null;
  let frame = 0;
  let lastTime = 0;
  let gesture = null;
  let ignoreClickUntil = 0;
  const announcement = document.querySelector('#fan-status');
  const choice = document.querySelector('#fan-count');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const name = card => card.querySelector('.project-caption strong').textContent;

  cards.forEach((card, index) => {
    card.dataset.fanIndex = index;
    if (!card.dataset.open) card.setAttribute('aria-label', `选择第 ${index + 1} 张，排布占位`);
  });

  function dimensions() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const phone = width < 600;
    const settings = {
      hand: { width: Math.min(width * (phone ? .80 : .38), 450, height * 1.10), radius: width * (phone ? .58 : .43), step: count > 6 ? 9 : 14, bend: .50, lift: phone ? 9 : 20, base: .44, limit: 4.3 },
      arc: { width: Math.min(width * (phone ? .68 : .28), 355, height * 1.02), radius: width * (phone ? .66 : .49), step: count > 6 ? 12 : 20, bend: .39, lift: 0, base: phone ? .42 : .36, limit: 4.3 },
      focus: { width: Math.min(width * .94, 800, height * 1.62), radius: Math.min(width * .46, height * 1.20), step: 28, bend: .30, lift: 0, base: .49, limit: 2.8 }
    }[mode];
    settings.radius = Math.min(settings.radius, mode === 'arc' ? 660 : mode === 'focus' ? 650 : 600);
    settings.width = Math.round(settings.width);
    const cardHeight = Math.round(settings.width / (mode === 'focus' ? 1.72 : 1.64));
    stage.style.setProperty('--fan-card-width', `${settings.width}px`);
    stage.style.setProperty('--fan-card-height', `${cardHeight}px`);
    layout = { ...settings, height, cardHeight, phone };
    paint();
  }

  function paint() {
    if (!layout) return;
    const { width, height, cardHeight, radius, step, bend, lift, base, limit } = layout;
    cards.forEach((card, index) => {
      const distance = index - position;
      const absolute = Math.abs(distance);
      const maxAngle = mode === 'hand' ? 36 : 48;
      const degrees = mode === 'focus' ? clamp(distance * step, -65, 65) : maxAngle * Math.tanh(distance * step / maxAngle);
      const theta = degrees * Math.PI / 180;
      const active = Math.exp(-distance * distance * 3.5);
      const scale = mode === 'focus'
        ? Math.max(.30, 1 - absolute * .34)
        : 1 - Math.min(absolute, 4) * (mode === 'hand' ? .065 : .045);
      const x = radius * Math.sin(theta) - width / 2;
      const y = height * base + radius * (1 - Math.cos(theta)) * bend - cardHeight / 2 - lift * active;
      const angle = mode === 'focus' ? clamp(distance * 17, -42, 42) : theta * 180 / Math.PI;
      const visibility = clamp((limit - absolute) / .6, 0, 1);
      const opacity = visibility * (mode === 'focus' ? clamp(1 - absolute * .20, .35, 1) : clamp(1 - absolute * .07, .55, 1));
      card.style.setProperty('--fan-x', `${x.toFixed(2)}px`);
      card.style.setProperty('--fan-y', `${y.toFixed(2)}px`);
      card.style.setProperty('--fan-angle', `${angle.toFixed(2)}deg`);
      card.style.setProperty('--fan-scale', scale.toFixed(4));
      card.style.opacity = opacity.toFixed(3);
      card.style.zIndex = String(100 - Math.round(absolute * 18));
      card.style.pointerEvents = opacity > .08 ? 'auto' : 'none';
      card.setAttribute('aria-hidden', String(opacity <= .08));
    });
    stage.dataset.position = position.toFixed(3);
  }

  function settle(now) {
    const dt = Math.min((now - (lastTime || now - 16.67)) / 16.67, 2);
    lastTime = now;
    velocity = (velocity + (target - position) * .10 * dt) * Math.pow(.64, dt);
    position += velocity * dt;
    if (Math.abs(position - target) < .001 && Math.abs(velocity) < .001) {
      position = target;
      velocity = 0;
      frame = 0;
      lastTime = 0;
      paint();
      return;
    }
    paint();
    frame = requestAnimationFrame(settle);
  }

  function moveTo(value, instant = false) {
    target = value;
    if (instant || reduced.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      position = target;
      velocity = 0;
      paint();
    } else if (!frame) frame = requestAnimationFrame(settle);
  }

  function status() {
    cards.forEach((card, index) => {
      const current = index === selected;
      card.toggleAttribute('data-fan-active', current);
      card.tabIndex = current ? 0 : -1;
      if (current) card.setAttribute('aria-current', 'true');
      else card.removeAttribute('aria-current');
      if (card.dataset.open) card.setAttribute('aria-label', current ? `打开 ${name(card)} 预览` : `选中 ${name(card)} 卡片`);
    });
    announcement.textContent = `第 ${selected + 1} 张，共 ${count} 张。${name(cards[selected])}，${cards[selected].querySelector('.project-caption small').textContent}。`;
    stage.dataset.selected = selected;
  }

  function select(index, instant = false) {
    selected = clamp(index, 0, count - 1);
    status();
    moveTo(selected, instant);
  }

  function setMode(value) {
    mode = value;
    document.body.dataset.fanMode = mode;
    document.querySelectorAll('[data-mode-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.modeChoice === mode)));
    document.querySelector('#fan-mode-label').textContent = modes[mode].label;
    document.querySelector('#fan-mode-description').textContent = modes[mode].description;
    const url = new URL(location.href);
    url.searchParams.set('mode', mode);
    url.searchParams.set('count', count);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    moveTo(selected, true);
    dimensions();
    // A short gather-and-deal transition makes the alternative pose easy to read.
    if (!reduced.matches) cards.forEach(card => {
      card.getAnimations().forEach(animation => animation.cancel());
      const to = getComputedStyle(card).transform;
      card.animate([
        { transform: `translate(${-layout.width / 2}px, ${layout.height * .48 - layout.cardHeight / 2}px) scale(.86)`, opacity: .25 },
        { transform: to, opacity: card.style.opacity }
      ], { duration: mode === 'focus' ? 520 : 650, easing: 'cubic-bezier(.22,1,.36,1)' });
    });
  }

  document.querySelectorAll('[data-mode-choice]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.modeChoice)));
  choice.value = String(count);
  choice.addEventListener('change', () => {
    const url = new URL(location.href);
    url.searchParams.set('count', choice.value);
    url.hash = '';
    location.assign(url.pathname + url.search);
  });
  stage.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    select(event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : selected + (event.key === 'ArrowRight' ? 1 : -1));
    cards[selected].focus({ preventScroll: true });
  });

  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0 || gesture) return;
    // A fresh press is intentional; only the release-generated click is blocked.
    ignoreClickUntil = 0;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, start: selected, time: performance.now(), dx: 0, moved: false };
  });
  stage.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.moved) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { gesture = null; return; }
      if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy)) return;
      gesture.moved = true;
      stage.setPointerCapture(event.pointerId);
      cards.forEach(card => card.getAnimations().forEach(animation => animation.cancel()));
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      velocity = 0;
      stage.classList.add('is-fan-dragging');
    }
    gesture.dx = dx;
    const delta = clamp(-dx / (layout.width * .65), -.95, .95);
    const proposed = gesture.start + delta;
    position = proposed < 0 ? proposed * .16 : proposed > count - 1 ? count - 1 + (proposed - count + 1) * .16 : proposed;
    paint();
  });
  function release(event, cancelled = false) {
    if (!gesture || gesture.id !== event.pointerId) return;
    const drag = gesture;
    gesture = null;
    stage.classList.remove('is-fan-dragging');
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (!drag.moved) return;
    ignoreClickUntil = performance.now() + 400;
    const speed = Math.abs(drag.dx) / Math.max(1, performance.now() - drag.time);
    const advance = !cancelled && (Math.abs(drag.dx) > layout.width * .16 || (Math.abs(drag.dx) > 24 && speed > .35));
    select(drag.start + (advance ? (drag.dx < 0 ? 1 : -1) : 0));
  }
  stage.addEventListener('pointerup', event => release(event));
  stage.addEventListener('pointercancel', event => release(event, true));
  stage.addEventListener('lostpointercapture', event => release(event, true));
  stage.addEventListener('pointerleave', event => {
    if (gesture && !gesture.moved && gesture.id === event.pointerId) gesture = null;
  });
  stage.addEventListener('click', event => {
    const card = event.target.closest('.project');
    if (performance.now() < ignoreClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (!card) return;
    const index = Number(card.dataset.fanIndex);
    if (index !== selected || !card.dataset.open) {
      event.preventDefault();
      event.stopImmediatePropagation();
      select(index);
    }
  }, true);
  new ResizeObserver(dimensions).observe(stage);
  reduced.addEventListener('change', () => {
    cards.forEach(card => card.getAnimations().forEach(animation => animation.cancel()));
    moveTo(selected, true);
  });
  window.workspaceFan = {
    reveal(id) {
      const index = cards.findIndex(card => card.dataset.open === id);
      if (index !== -1) {
        cards.forEach(card => card.getAnimations().forEach(animation => animation.cancel()));
        select(index, true);
      }
    }
  };
  status();
  setMode(mode);
})();
