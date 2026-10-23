'use strict';

// Presentation-only enhancement. It listens to the existing hallway contract
// and never controls its camera, selection, playback, or dialog lifecycle.
(() => {
  const gallery = document.querySelector('#gallery');
  const plane = document.querySelector('#gallery-plane');
  if (!gallery || !plane) return;

  const palette = {
    repaste: '184, 159, 233',
    readless: '113, 154, 219',
    mindmap: '220, 194, 142',
    uipicks: '131, 183, 179',
    wtd: '218, 157, 126'
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const layoutProperties = ['--work-x', '--work-width', '--work-top', '--image-height'];
  const cards = [...plane.querySelectorAll('.artwork')];
  const lights = cards.map(card => {
    const layers = ['wall', 'floor'].map(surface => {
      const layer = document.createElement('span');
      layer.className = `preview-${surface}-wash`;
      layer.dataset.product = card.dataset.product;
      layer.setAttribute('aria-hidden', 'true');
      plane.insertBefore(layer, card);
      return layer;
    });
    return { card, layers, frame: card.querySelector('.artwork-frame') };
  });

  const syncLayout = () => {
    for (const { card, layers } of lights) {
      for (const property of layoutProperties) {
        const value = card.style.getPropertyValue(property);
        for (const layer of layers) layer.style.setProperty(property, value);
      }
    }
  };

  let currentProduct = '';
  const syncSelection = () => {
    const selected = cards.find(card => card.classList.contains('is-current')) || cards[0];
    if (!selected || selected.dataset.product === currentProduct) return;
    currentProduct = selected.dataset.product;
    gallery.dataset.lightProduct = currentProduct;
    gallery.style.setProperty('--preview-brand-rgb', palette[currentProduct] || palette.repaste);
    for (const { card, layers } of lights) {
      for (const layer of layers) layer.classList.toggle('is-active', card === selected);
    }
  };

  let pointerFrame = 0;
  let pendingPointer = null;
  const clearPointer = () => {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    pendingPointer = null;
    for (const { card } of lights) card.removeAttribute('data-rim-active');
  };
  const paintPointer = () => {
    pointerFrame = 0;
    if (!pendingPointer || reduced.matches || !finePointer.matches) return;
    const { card, frame, x, y } = pendingPointer;
    const bounds = frame.getBoundingClientRect();
    const inside = x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
    if (!inside || !bounds.width || !bounds.height) {
      card.removeAttribute('data-rim-active');
      return;
    }
    frame.style.setProperty('--rim-x', `${((x - bounds.left) / bounds.width * 100).toFixed(2)}%`);
    frame.style.setProperty('--rim-y', `${((y - bounds.top) / bounds.height * 100).toFixed(2)}%`);
    card.dataset.rimActive = 'true';
  };

  for (const { card, frame } of lights) {
    card.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || event.buttons || reduced.matches || !finePointer.matches || !frame) return;
      pendingPointer = { card, frame, x: event.clientX, y: event.clientY };
      if (!pointerFrame) pointerFrame = requestAnimationFrame(paintPointer);
    }, { passive: true });
    card.addEventListener('pointerleave', clearPointer);
    card.addEventListener('pointerdown', clearPointer);
  }

  const selectionObserver = new MutationObserver(syncSelection);
  for (const card of cards) selectionObserver.observe(card, { attributes: true, attributeFilter: ['class'] });
  gallery.addEventListener('hallway-layout', syncLayout);
  gallery.addEventListener('hallway-motion', () => { syncSelection(); clearPointer(); });
  reduced.addEventListener('change', clearPointer);
  finePointer.addEventListener('change', clearPointer);
  document.addEventListener('visibilitychange', clearPointer);
  window.addEventListener('pagehide', clearPointer);

  syncLayout();
  syncSelection();
})();
