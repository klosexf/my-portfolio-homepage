'use strict';

// Native CSS + Web Animations. No background loop: pointer work runs only on input.
const workspaceMotion = (() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const desktopMotion = matchMedia('(min-width: 901px)');
  const desktopTiming = { open: 440, close: 300, dialog: 320, copy: 240, tab: 240, switch: 320, leave: 220, ease: 'cubic-bezier(.2,.76,.2,1)' };
  const existingTiming = { open: 560, close: 380, dialog: 420, copy: 320, tab: 340, switch: 400, leave: 340, ease: 'cubic-bezier(.22,1,.36,1)' };
  const timing = () => desktopMotion.matches ? desktopTiming : existingTiming;
  const overview = document.querySelector('.overview');
  const horizontal = overview.dataset.layout === 'carousel';
  const fan = overview.dataset.layout === 'fan';
  const cards = [...overview.querySelectorAll('.project[data-open]')];
  const dock = document.querySelector('.dock');
  const dockItems = [...dock.querySelectorAll('.dock-item')];
  const dialog = document.querySelector('#product-dialog');
  const media = document.querySelector('#detail-media');
  const tabs = document.querySelector('.detail-tabs');
  const indicator = document.createElement('span');
  indicator.className = 'tab-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  tabs.prepend(indicator);
  const order = [...tabs.querySelectorAll('[data-open]')].map(button => button.dataset.open);
  const sceneAnimations = new Set();
  const ambientAnimations = new Set();
  const transientNodes = new Set();
  let sceneVersion = 0;
  let suppressedClick = null;
  let tabPosition = null;
  let originalRects = new Map();
  let originalWidth = 0;

  function animate(element, frames, options, ambient = false) {
    const set = ambient ? ambientAnimations : sceneAnimations;
    const animation = element.animate(frames, { fill: 'backwards', ...options });
    set.add(animation);
    // Scene animations with fill:forwards must remain tracked until explicit cleanup.
    // Otherwise a finished close animation can keep the next modal invisible.
    animation.finished.catch(() => {}).finally(() => { if (ambient) set.delete(animation); });
    return animation;
  }

  function cancelScene() {
    sceneVersion++;
    sceneAnimations.forEach(animation => animation.cancel());
    sceneAnimations.clear();
    transientNodes.forEach(node => node.remove());
    transientNodes.clear();
    media.classList.remove('is-transferring');
  }

  function highlight(name) {
    overview.classList.toggle('is-spotlighting', Boolean(name));
    cards.forEach(card => card.toggleAttribute('data-highlight', card.dataset.open === name));
    dockItems.forEach(item => item.toggleAttribute('data-related', item.dataset.open === name));
  }

  function setActive(name) {
    dockItems.forEach(item => {
      if (item.dataset.open === name) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
  }

  function resetDock() {
    dockItems.forEach(item => {
      item.style.removeProperty('--dock-scale');
      item.style.removeProperty('--dock-lift');
      item.removeAttribute('data-nearest');
    });
    highlight(null);
  }

  function dockWave(x, bounds) {
    if (reduced.matches || !finePointer.matches) return;
    let nearest = null;
    let distance = Infinity;
    bounds.forEach(({ item, center }) => {
      const d = Math.abs(center - x);
      const influence = Math.exp(-Math.pow(d / 72, 2));
      item.style.setProperty('--dock-scale', String(1 + .14 * influence));
      item.style.setProperty('--dock-lift', `${-4 * influence}px`);
      if (d < distance) { nearest = item; distance = d; }
    });
    const name = distance < 54 ? nearest.dataset.open : null;
    dockItems.forEach(item => item.toggleAttribute('data-nearest', item.dataset.open === name));
    highlight(name);
  }

  let dockBounds = [];
  let dockFrame = 0;
  let dockPointerX = 0;
  dock.addEventListener('pointerenter', () => {
    dockBounds = dockItems.map(item => {
      const rect = item.getBoundingClientRect();
      return { item, center: rect.left + rect.width / 2 };
    });
  });
  dock.addEventListener('pointermove', event => {
    dockPointerX = event.clientX;
    if (!dockFrame) dockFrame = requestAnimationFrame(() => {
      dockFrame = 0;
      dockWave(dockPointerX, dockBounds);
    });
  });
  dock.addEventListener('pointerleave', () => {
    cancelAnimationFrame(dockFrame);
    dockFrame = 0;
    resetDock();
  });
  dockItems.forEach(item => {
    item.addEventListener('focus', () => {
      const bounds = dockItems.map(button => {
        const rect = button.getBoundingClientRect();
        return { item: button, center: rect.left + rect.width / 2 };
      });
      dockWave(bounds.find(bound => bound.item === item).center, bounds);
    });
    item.addEventListener('blur', resetDock);
  });

  // Drag is a temporary displacement. Release springs back to the authored layout.
  cards.forEach(card => {
    if (fan) return; // The fan owns its curved poses, gestures and selection.
    let drag = null;
    let rect = null;
    let pointerFrame = 0;
    let pointer = null;
    let spring = null;
    const clearPose = () => ['--drag-x', '--drag-y', '--drag-turn', '--rx', '--ry'].forEach(key => card.style.removeProperty(key));
    const pose = () => {
      pointerFrame = 0;
      if (!pointer || reduced.matches) return;
      if (drag?.moved) {
        const x = Math.tanh((pointer.x - drag.x) / 140) * 92;
        const y = Math.tanh((pointer.y - drag.y) / 140) * 92;
        card.style.setProperty('--drag-x', `${x}px`);
        card.style.setProperty('--drag-y', `${y}px`);
        card.style.setProperty('--drag-turn', `${x * .025}deg`);
      } else if (rect) {
        card.style.setProperty('--rx', `${(pointer.y - rect.top - rect.height / 2) / rect.height * -4}deg`);
        card.style.setProperty('--ry', `${(pointer.x - rect.left - rect.width / 2) / rect.width * 6}deg`);
      }
    };
    card.addEventListener('pointerenter', () => {
      rect = card.getBoundingClientRect();
      if (finePointer.matches && !dialog.open) highlight(card.dataset.open);
    });
    card.addEventListener('focus', () => { if (!dialog.open) highlight(card.dataset.open); });
    card.addEventListener('blur', () => highlight(null));
    card.addEventListener('pointerdown', event => {
      if (horizontal || event.button !== 0 || !finePointer.matches || reduced.matches || innerWidth <= 1050) return;
      if (spring) spring.cancel();
      drag = { x: event.clientX, y: event.clientY, moved: false };
    });
    card.addEventListener('pointermove', event => {
      if (!finePointer.matches || reduced.matches) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (drag && !drag.moved && Math.hypot(pointer.x - drag.x, pointer.y - drag.y) > 6) {
        drag.moved = true;
        card.setPointerCapture(event.pointerId);
        card.classList.add('is-dragging');
        highlight(null);
      }
      if (!pointerFrame) pointerFrame = requestAnimationFrame(pose);
    });
    const release = event => {
      if (!drag) return;
      const moved = drag.moved;
      const from = getComputedStyle(card).transform;
      const x = Number.parseFloat(card.style.getPropertyValue('--drag-x')) || 0;
      const y = Number.parseFloat(card.style.getPropertyValue('--drag-y')) || 0;
      drag = null;
      cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      card.classList.remove('is-dragging');
      card.style.transition = 'none';
      clearPose();
      if (card.hasPointerCapture(event.pointerId)) card.releasePointerCapture(event.pointerId);
      if (moved) {
        suppressedClick = { card, until: performance.now() + 300 };
        const to = getComputedStyle(card).transform;
        spring = animate(card, [
          { transform: from, offset: 0 },
          { transform: `translate(${-x * .12}px, ${-y * .12}px) ${to === 'none' ? '' : to}`, offset: .65 },
          { transform: to, offset: 1 }
        ], { duration: 620, easing: 'cubic-bezier(.22,1,.36,1)' }, true);
      }
      card.style.removeProperty('transition');
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
    card.addEventListener('lostpointercapture', release);
    card.addEventListener('pointerleave', () => {
      if (drag?.moved) return;
      drag = null;
      pointer = null;
      cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      clearPose();
      highlight(null);
    });
    card.addEventListener('click', event => {
      if (suppressedClick?.card === card && performance.now() < suppressedClick.until) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressedClick = null;
      }
    }, true);
  });

  function enter() {
    if (fan || dialog.open || reduced.matches) return;
    ambientAnimations.forEach(animation => animation.cancel());
    resetDock();
    const wide = innerWidth > 1050 && overview.dataset.layout === 'scattered';
    const dockRect = dock.getBoundingClientRect();
    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      if (rect.top > innerHeight || rect.left > innerWidth || rect.right < 0) return;
      const icon = dockItems.find(item => item.dataset.open === card.dataset.open) || dock.querySelector('[data-overview]');
      const iconRect = icon.getBoundingClientRect();
      const dx = wide ? iconRect.left + iconRect.width / 2 - rect.left - rect.width / 2 : 0;
      const dy = wide ? dockRect.top - rect.top - rect.height / 2 : 24;
      const to = getComputedStyle(card).transform;
      animate(card, [
        { transform: `translate(${dx}px, ${dy}px) scale(${wide ? .16 : .96}) rotate(${(index % 2 ? 1 : -1) * (horizontal ? 2 : 8)}deg)`, opacity: 0, offset: 0 },
        { transform: `translateY(-8px) scale(1.025) ${to === 'none' ? '' : to}`, opacity: 1, offset: .78 },
        { transform: to, opacity: 1, offset: 1 }
      ], { duration: wide ? 850 : 560, delay: index * 85, easing: 'cubic-bezier(.2,.8,.25,1)' }, true);
    });
  }

  function selectTab() {
    const selected = tabs.querySelector('[aria-pressed="true"]');
    tabs.scrollTo({ left: Math.max(0, selected.offsetLeft - (tabs.clientWidth - selected.offsetWidth) / 2), behavior: 'instant' });
    const tabRect = selected.getBoundingClientRect();
    const navRect = tabs.getBoundingClientRect();
    const next = { x: tabRect.left - navRect.left + tabs.scrollLeft, y: tabRect.top - navRect.top, width: tabRect.width };
    indicator.style.width = `${next.width}px`;
    indicator.style.height = `${tabRect.height}px`;
    indicator.style.transform = `translate(${next.x}px, ${next.y}px)`;
    if (tabPosition && !reduced.matches) animate(indicator, [
      { transform: `translate(${tabPosition.x}px, ${next.y}px) scaleX(${tabPosition.width / next.width})` },
      { transform: `translate(${next.x}px, ${next.y}px) scaleX(1)` }
    ], { duration: timing().tab, easing: timing().ease });
    tabPosition = next;
  }

  function flyImage(from, to, image, background, name, reverse = false) {
    if (!from || from.bottom < 0 || from.top > innerHeight || from.right < 0 || from.left > innerWidth) return null;
    const ghost = document.createElement('div');
    ghost.className = 'window-flight';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.setAttribute('popover', 'manual');
    ghost.style.cssText = `left:${to.left}px;top:${to.top}px;width:${to.width}px;height:${to.height}px;background:${background}`;
    const img = document.createElement('img');
    img.src = image;
    img.alt = '';
    ghost.append(img);
    // A manual popover keeps this noninteractive image above the modal's top layer.
    const supportsPopover = typeof ghost.showPopover === 'function';
    if (!supportsPopover) return null;
    document.body.append(ghost);
    transientNodes.add(ghost);
    ghost.showPopover();
    const dx = from.left + from.width / 2 - to.left - to.width / 2;
    const dy = from.top + from.height / 2 - to.top - to.height / 2;
    const small = `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    const frames = desktopMotion.matches
      ? [{ transform: small, opacity: 1, borderRadius: '14px' }, { transform: 'none', opacity: 1, borderRadius: '10px' }]
      : [{ transform: small, opacity: 1 }, { transform: 'none', opacity: 1 }];
    if (reverse) frames.reverse();
    else if (desktopMotion.matches) {
      // Give the already-playing demo the final part of the shared-image handoff.
      frames[1].offset = .94;
      frames.push({ transform: 'none', opacity: 0, borderRadius: '10px' });
    }
    // Ease from the thumbnail crop into the complete product framing.
    const thumbnail = cards.find(card => card.dataset.open === name)?.querySelector('.project-visual img');
    const zoom = thumbnail ? getComputedStyle(thumbnail).getPropertyValue('--thumbnail-scale').trim() || '1' : '1';
    const cropFrames = [{ transform: `scale(${zoom})` }, { transform: 'scale(1)' }];
    if (reverse) cropFrames.reverse();
    img.style.transformOrigin = 'center top';
    const duration = reverse ? timing().close : timing().open;
    animate(img, cropFrames, { duration, easing: timing().ease });
    media.classList.add('is-transferring');
    return animate(ghost, frames, { duration, easing: reverse && desktopMotion.matches ? 'cubic-bezier(.4,0,.8,1)' : timing().ease });
  }

  async function expand(name, product) {
    cancelScene();
    ambientAnimations.forEach(animation => animation.cancel());
    resetDock();
    originalWidth = innerWidth;
    originalRects = new Map(cards.map(card => [card.dataset.open, card.querySelector('.project-visual').getBoundingClientRect()]));
    selectTab();
    document.body.classList.add('is-product-open');
    if (reduced.matches) return;
    const version = sceneVersion;
    flyImage(originalRects.get(name), media.getBoundingClientRect(), product.image, product.background, name);
    animate(dialog, [{ opacity: 0, transform: `translateY(${desktopMotion.matches ? 10 : 16}px) scale(${desktopMotion.matches ? .985 : .975})` }, { opacity: 1, transform: 'none' }], { duration: timing().dialog, easing: timing().ease });
    [...document.querySelector('.detail-info').children].forEach((child, index) => {
      animate(child, [{ opacity: 0, transform: `translateY(${desktopMotion.matches ? 6 : 10}px)` }, { opacity: 1, transform: 'none' }], { duration: timing().copy, delay: desktopMotion.matches ? 60 + index * 16 : 110 + index * 28, easing: timing().ease });
    });
    await Promise.allSettled([...sceneAnimations].map(animation => animation.finished));
    if (version === sceneVersion) cancelScene();
  }

  async function switchProduct(previous, next, previousProduct) {
    cancelScene();
    selectTab();
    if (reduced.matches) return;
    const version = sceneVersion;
    const direction = order.indexOf(next) > order.indexOf(previous) ? 1 : -1;
    const outgoing = document.createElement('img');
    outgoing.src = previousProduct.image;
    outgoing.alt = '';
    outgoing.setAttribute('aria-hidden', 'true');
    outgoing.className = 'outgoing-snapshot';
    outgoing.style.background = previousProduct.background;
    if (previous === 'wtd') outgoing.style.padding = '8px';
    media.append(outgoing);
    transientNodes.add(outgoing);
    const travel = desktopMotion.matches ? 32 : 48;
    animate(outgoing, [{ transform: 'none', opacity: 1 }, { transform: `translateX(${-direction * travel}px) scale(.98)`, opacity: 0 }], { duration: timing().leave, easing: timing().ease, fill: 'forwards' });
    animate(media.querySelector('video, iframe, img:not(.outgoing-snapshot)'), [{ transform: `translateX(${direction * (desktopMotion.matches ? 36 : 54)}px) scale(${desktopMotion.matches ? 1.008 : 1.015})`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: timing().switch, easing: timing().ease });
    animate(document.querySelector('.detail-info'), [{ opacity: 0, transform: `translateX(${direction * (desktopMotion.matches ? 6 : 10)}px)` }, { opacity: 1, transform: 'none' }], { duration: timing().copy, easing: desktopMotion.matches ? timing().ease : 'ease-out' });
    await Promise.allSettled([...sceneAnimations].map(animation => animation.finished));
    if (version === sceneVersion) cancelScene();
  }

  async function collapse(name, product) {
    cancelScene();
    document.body.classList.remove('is-product-open');
    if (reduced.matches) return;
    const version = sceneVersion;
    const returnRect = fan
      ? cards.find(card => card.dataset.open === name)?.querySelector('.project-visual').getBoundingClientRect()
      : originalRects.get(name);
    if (innerWidth === originalWidth) flyImage(returnRect, media.getBoundingClientRect(), product.image, product.background, name, true);
    animate(dialog, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${desktopMotion.matches ? 8 : 12}px) scale(${desktopMotion.matches ? .985 : .975})` }], { duration: desktopMotion.matches ? 260 : 340, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    await Promise.allSettled([...sceneAnimations].map(animation => animation.finished));
    if (version === sceneVersion) cancelScene();
    tabPosition = null;
  }

  function returnTo(name) {
    const card = cards.find(item => item.dataset.open === name);
    if (!card || reduced.matches) return;
    if (fan) {
      if (desktopMotion.matches) animate(card, [{ scale: '.996' }, { scale: '1' }], { duration: 180, easing: timing().ease }, true);
      return;
    }
    const transform = getComputedStyle(card).transform;
    animate(card, [
      { transform: `scale(.985) ${transform === 'none' ? '' : transform}`, offset: 0 },
      { transform: `scale(1.01) ${transform === 'none' ? '' : transform}`, offset: .55 },
      { transform, offset: 1 }
    ], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' }, true);
  }

  reduced.addEventListener('change', () => {
    cancelScene();
    ambientAnimations.forEach(animation => animation.cancel());
    resetDock();
    cards.forEach(card => {
      card.classList.remove('is-dragging');
      ['--drag-x', '--drag-y', '--drag-turn', '--rx', '--ry'].forEach(key => card.style.removeProperty(key));
    });
  });
  window.addEventListener('resize', () => {
    if (dialog.open) selectTab();
  });
  if (document.readyState === 'complete') enter();
  else window.addEventListener('load', enter, { once: true });

  return { expand, collapse, switchProduct, cancelScene, setActive, returnTo };
})();
