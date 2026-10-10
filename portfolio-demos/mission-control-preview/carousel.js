'use strict';

// A finite, manually browsed shelf. Touch and trackpad scrolling stay native;
// CSS Scroll Snap supplies landing positions, without capturing vertical wheel input.
(() => {
  const overview = document.querySelector('.overview[data-layout="carousel"]');
  if (!overview) return;
  const cards = [...overview.querySelectorAll('.project')];
  const previous = document.querySelector('#carousel-previous');
  const next = document.querySelector('#carousel-next');
  const position = document.querySelector('#carousel-position');
  const name = document.querySelector('#carousel-name');
  const pagination = document.querySelector('.carousel-pagination');
  const progress = document.querySelector('.carousel-progress i');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let index = -1;
  let scrollFrame = 0;
  let resizeFrame = 0;
  let drag = null;
  let suppressClickUntil = 0;

  overview.tabIndex = 0;
  overview.setAttribute('aria-roledescription', '轮播');
  overview.setAttribute('aria-label', `横向浏览 ${cards.length} 个作品展示位置`);
  overview.setAttribute('aria-describedby', 'carousel-guidance');
  const dots = cards.map((card, itemIndex) => {
    const title = card.querySelector('strong').textContent;
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `浏览第 ${itemIndex + 1} 个位置：${title}`);
    button.addEventListener('click', () => go(itemIndex));
    pagination.append(button);
    return button;
  });

  function nearest() {
    const anchor = overview.scrollLeft + 12;
    return cards.reduce((closest, card, itemIndex) =>
      Math.abs(card.offsetLeft - anchor) < Math.abs(cards[closest].offsetLeft - anchor) ? itemIndex : closest, 0);
  }

  function sync() {
    scrollFrame = 0;
    const current = nearest();
    if (current === index) return;
    index = current;
    position.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    name.textContent = cards[index].querySelector('strong').textContent;
    previous.disabled = index === 0;
    next.disabled = index === cards.length - 1;
    progress.style.transform = `scaleX(${(index + 1) / cards.length})`;
    dots.forEach((dot, itemIndex) => {
      if (itemIndex === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    cards.forEach((card, itemIndex) => card.toggleAttribute('data-current', itemIndex === index));
  }

  function go(itemIndex, smooth = true) {
    const target = cards[Math.max(0, Math.min(cards.length - 1, itemIndex))];
    overview.scrollTo({ left: target.offsetLeft - 12, behavior: smooth && !reduced.matches ? 'smooth' : 'instant' });
    if (!smooth || reduced.matches) sync();
  }

  function resize() {
    resizeFrame = 0;
    const current = Math.max(0, index);
    const width = overview.clientWidth;
    const usable = width - 24;
    const size = innerWidth > 1050 ? Math.min(590, Math.round(usable / 2.15))
      : innerWidth > 540 ? Math.min(520, Math.round(usable * .8)) : Math.round(usable * .88);
    overview.style.setProperty('--slide-size', `${size}px`);
    // End padding lets the final card reach the same start anchor as the first.
    overview.style.setProperty('--tail-space', `${Math.max(12, width - size - 12)}px`);
    go(current, false);
  }

  overview.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(sync);
  }, { passive: true });
  previous.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  overview.addEventListener('keydown', event => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key) || document.querySelector('#product-dialog').open) return;
    event.preventDefault();
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1
      : index + (event.key === 'ArrowRight' ? 1 : -1);
    go(target);
    overview.focus({ preventScroll: true });
  });

  overview.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { start: event.clientX, scroll: overview.scrollLeft, moved: false, pointerId: event.pointerId };
  });
  overview.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const distance = event.clientX - drag.start;
    if (!drag.moved && Math.abs(distance) > 8) {
      drag.moved = true;
      overview.setPointerCapture(event.pointerId);
      overview.classList.add('is-carousel-dragging');
    }
    if (!drag.moved) return;
    event.preventDefault();
    overview.scrollLeft = drag.scroll - distance;
  });
  function release(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const moved = drag.moved;
    drag = null;
    overview.classList.remove('is-carousel-dragging');
    if (overview.hasPointerCapture(event.pointerId)) overview.releasePointerCapture(event.pointerId);
    if (moved) {
      suppressClickUntil = performance.now() + 350;
      go(nearest());
    }
  }
  overview.addEventListener('pointerup', release);
  overview.addEventListener('pointercancel', release);
  overview.addEventListener('lostpointercapture', release);
  overview.addEventListener('pointerleave', () => { if (drag && !drag.moved) drag = null; });
  overview.addEventListener('click', event => {
    if (event.detail > 0 && performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  const observer = new ResizeObserver(() => {
    if (!resizeFrame) resizeFrame = requestAnimationFrame(resize);
  });
  observer.observe(overview, { box: 'border-box' });
  reduced.addEventListener('change', () => go(Math.max(0, index), false));
  resize();
  window.workspaceCarousel = {
    reveal(id) {
      const target = cards.findIndex(card => card.dataset.open === id);
      if (target >= 0) go(target, false);
    }
  };
})();
