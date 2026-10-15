'use strict';

const dialog = document.querySelector('#product-dialog');
const media = document.querySelector('#detail-media');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let activeProduct = null;
let lastTrigger = null;
let closing = false;

function stopDemo() {
  const video = media.querySelector('video');
  if (video) video.pause();
  // Removing an iframe disposes its autoplay timers and prevents hidden focus changes.
  media.replaceChildren();
}

function showSnapshot() {
  const product = products[activeProduct];
  stopDemo();
  const image = document.createElement('img');
  image.src = product.image;
  image.alt = `${product.name} 现有界面演示`;
  media.append(image);
}

function renderProduct(name) {
  activeProduct = name;
  const product = products[name];
  document.querySelector('#detail-name').textContent = product.name;
  document.querySelector('#detail-category').textContent = product.category;
  document.querySelector('#detail-headline').textContent = product.headline;
  document.querySelector('#detail-description').textContent = product.description;
  document.querySelector('#product-link').href = product.href;
  document.querySelector('.demo-note').textContent = product.demoNote || '画面沿用已有产品演示';
  const facts = document.querySelector('#detail-facts');
  facts.replaceChildren(...product.facts.map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  const icon = document.createElement('img');
  icon.src = product.icon;
  icon.alt = '';
  const iconContainer = document.querySelector('#detail-icon');
  iconContainer.replaceChildren();
  if (name === 'mindmap') {
    const badge = document.createElement('span');
    badge.className = 'mindmap-icon';
    badge.append(icon);
    iconContainer.append(badge);
  } else iconContainer.append(icon);
  media.dataset.app = name;
  media.style.setProperty('--media-bg', product.background);
  media.style.setProperty('--poster-aspect', `${product.imageWidth} / ${product.imageHeight}`);
  document.querySelectorAll('.detail-tabs [data-open]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.open === name));
  });
  showSnapshot();
  workspaceMotion.setActive(name);
  history.replaceState(null, '', `#${name}`);
}

function openProduct(name, trigger) {
  if (!products[name] || closing) return;
  if (dialog.open && activeProduct === name) return;
  const isNewWindow = !dialog.open;
  const previous = activeProduct;
  if (isNewWindow) lastTrigger = trigger || document.querySelector(`[data-open="${name}"]`);
  window.workspaceCarousel?.reveal(name);
  window.workspaceFan?.reveal(name);
  workspaceMotion.cancelScene();
  renderProduct(name);
  if (isNewWindow) dialog.showModal();
  dialog.scrollTop = 0;
  startDemo();
  if (isNewWindow) workspaceMotion.expand(name, products[name]);
  else workspaceMotion.switchProduct(previous, name, products[previous]);
}

async function closeProduct() {
  if (!dialog.open || closing) return;
  closing = true;
  const returnedProduct = activeProduct;
  workspaceMotion.cancelScene();
  showSnapshot();
  await workspaceMotion.collapse(activeProduct, products[activeProduct]);
  dialog.close();
  stopDemo();
  activeProduct = null;
  workspaceMotion.setActive(window.workspaceFan ? returnedProduct : null);
  closing = false;
  history.replaceState(null, '', location.pathname + location.search);
  const returnTrigger = window.workspaceCarousel || window.workspaceFan
    ? document.querySelector(`.overview [data-open="${returnedProduct}"]`) : lastTrigger;
  if (returnTrigger?.isConnected) returnTrigger.focus({ preventScroll: true });
  workspaceMotion.returnTo(returnedProduct);
}

function stepProduct(offset) {
  if (!activeProduct || closing) return;
  const next = productOrder[(productOrder.indexOf(activeProduct) + offset + productOrder.length) % productOrder.length];
  const button = document.querySelector(`.detail-tabs [data-open="${next}"]`);
  openProduct(next, button);
  button.focus({ preventScroll: true });
}

function startDemo() {
  if (!activeProduct || closing) return;
  const product = products[activeProduct];
  stopDemo();
  if (product.video) {
    const video = document.createElement('video');
    video.src = product.video;
    video.poster = product.image;
    video.controls = true;
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.autoplay = true;
    video.addEventListener('error', () => { if (video.isConnected) showSnapshot(); });
    media.append(video);
    video.play().catch(() => {
      // Native video controls remain available if the browser blocks autoplay.
    });
  } else {
    const frame = document.createElement('iframe');
    const demoURL = new URL(product.demo, document.baseURI);
    demoURL.searchParams.set('presentation', 'portfolio');
    frame.src = demoURL.href;
    frame.title = `${product.name} 产品操作演示`;
    frame.addEventListener('load', () => {
      if (!frame.isConnected) return;
      try {
        frame.contentDocument.addEventListener('keydown', event => {
          if (event.key === 'Escape') { event.preventDefault(); closeProduct(); }
        });
      } catch (_) { /* Existing demos are same-origin; browser restrictions may vary. */ }
    });
    media.append(frame);
  }
}

document.querySelectorAll('[data-open]').forEach(button => {
  button.addEventListener('click', () => openProduct(button.dataset.open, button));
});
document.querySelectorAll('[data-overview]').forEach(button => {
  button.addEventListener('click', () => {
    if (dialog.open) closeProduct();
    else window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'instant' : 'smooth' });
  });
});
document.querySelector('#close-detail').addEventListener('click', closeProduct);
dialog.addEventListener('cancel', event => { event.preventDefault(); closeProduct(); });
dialog.addEventListener('keydown', event => {
  if (closing || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  if (event.target.closest('input, textarea, select, video, [contenteditable="true"]')) return;
  event.preventDefault();
  const offset = event.key === 'ArrowRight' ? 1 : -1;
  stepProduct(offset);
});
let backdropPressed = false;
function isOutsideDialog(event) {
  const bounds = dialog.getBoundingClientRect();
  return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
}
dialog.addEventListener('pointerdown', event => {
  backdropPressed = event.target === dialog && isOutsideDialog(event);
});
dialog.addEventListener('click', event => {
  if (backdropPressed && event.target === dialog && isOutsideDialog(event)) closeProduct();
  backdropPressed = false;
});
document.querySelector('.wordmark').addEventListener('click', event => {
  event.preventDefault();
  document.querySelector('[data-overview]').click();
});

const themeToggle = document.querySelector('#theme-toggle');
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.body.dataset.theme = dark ? 'dark' : 'light';
  themeToggle.textContent = dark ? '浅色' : '深色';
  themeToggle.setAttribute('aria-label', dark ? '切换到浅色' : '切换到深色');
  themeToggle.setAttribute('aria-pressed', String(dark));
}
themeToggle.addEventListener('click', () => {
  const theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try { localStorage.setItem('xiaofeng-homepage-theme', theme); } catch (_) { /* Theme still works without local storage. */ }
});
try {
  const savedTheme = localStorage.getItem('xiaofeng-homepage-theme');
  if (savedTheme === 'dark' || savedTheme === 'light') applyTheme(savedTheme);
} catch (_) { /* Keep the initial dark palette. */ }

const initialProduct = location.hash.slice(1);
workspaceMotion.setActive(document.querySelector('.overview .project[aria-current="true"]')?.dataset.open || null);
if (products[initialProduct]) openProduct(initialProduct, null);
