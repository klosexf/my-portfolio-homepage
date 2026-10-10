'use strict';

const dialog = document.querySelector('#product-dialog');
const media = document.querySelector('#detail-media');
const playButton = document.querySelector('#play-demo');
const stageStatus = document.querySelector('#stage-status');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let activeProduct = null;
let lastTrigger = null;
let playing = false;
let closing = false;

function stopDemo() {
  const video = media.querySelector('video');
  if (video) video.pause();
  // Removing an iframe disposes its autoplay timers and prevents hidden focus changes.
  media.replaceChildren();
  playing = false;
  playButton.setAttribute('aria-pressed', 'false');
}

function showSnapshot() {
  const product = products[activeProduct];
  stopDemo();
  const image = document.createElement('img');
  image.src = product.image;
  image.alt = `${product.name} 现有界面演示`;
  media.append(image);
  stageStatus.textContent = '界面预览';
  playButton.innerHTML = '播放演示 <span aria-hidden="true">▷</span>';
}

function renderProduct(name) {
  activeProduct = name;
  const product = products[name];
  document.querySelector('#detail-name').textContent = product.name;
  document.querySelector('#detail-category').textContent = product.category;
  document.querySelector('#detail-window-name').textContent = product.name;
  const index = productOrder.indexOf(name);
  document.querySelector('#detail-position').textContent = `${String(index + 1).padStart(2, '0')} / ${String(productOrder.length).padStart(2, '0')}`;
  [-1, 1].forEach(offset => {
    const next = productOrder[(index + offset + productOrder.length) % productOrder.length];
    const direction = offset < 0 ? 'previous' : 'next';
    document.querySelector(`#${direction}-name`).textContent = products[next].name;
    document.querySelector(`#${direction}-product`).setAttribute('aria-label', `${offset < 0 ? '上一款' : '下一款'}：${products[next].name}`);
  });
  document.querySelector('#detail-headline').textContent = product.headline;
  document.querySelector('#detail-description').textContent = product.description;
  document.querySelector('#product-link').href = product.href;
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
  if (isNewWindow) {
    dialog.showModal();
    dialog.scrollTop = 0;
    workspaceMotion.expand(name, products[name]);
  } else {
    dialog.scrollTop = 0;
    workspaceMotion.switchProduct(previous, name, products[previous]);
  }
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
  workspaceMotion.setActive(null);
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

function playDemo() {
  if (!activeProduct) return;
  workspaceMotion.cancelScene();
  if (playing) { showSnapshot(); return; }
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
    video.addEventListener('loadeddata', () => { if (video.isConnected) stageStatus.textContent = '正在播放已有演示'; });
    video.addEventListener('error', () => { if (video.isConnected) { showSnapshot(); stageStatus.textContent = '演示暂未加载，可查看产品页'; } });
    media.append(video);
    video.play().catch(() => { if (video.isConnected) stageStatus.textContent = '点击画面中的播放按钮'; });
  } else {
    const frame = document.createElement('iframe');
    frame.src = product.demo;
    frame.title = `${product.name} 已有产品演示`;
    frame.addEventListener('load', () => {
      if (!frame.isConnected) return;
      stageStatus.textContent = '正在播放已有演示';
      try {
        frame.contentDocument.addEventListener('keydown', event => {
          if (event.key === 'Escape') { event.preventDefault(); closeProduct(); }
        });
      } catch (_) { /* Existing demos are same-origin; browser restrictions may vary. */ }
    });
    media.append(frame);
  }
  playing = true;
  playButton.setAttribute('aria-pressed', 'true');
  stageStatus.textContent = '演示加载中…';
  playButton.innerHTML = '停止演示 <span aria-hidden="true">□</span>';
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
document.querySelector('#previous-product').addEventListener('click', () => stepProduct(-1));
document.querySelector('#next-product').addEventListener('click', () => stepProduct(1));
playButton.addEventListener('click', playDemo);
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
  try { localStorage.setItem('mission-control-preview-theme', theme); } catch (_) { /* Theme still works without local storage. */ }
});
try {
  const savedTheme = localStorage.getItem('mission-control-preview-theme');
  if (savedTheme === 'dark' || savedTheme === 'light') applyTheme(savedTheme);
} catch (_) { /* Keep the initial preview palette. */ }

const initialProduct = location.hash.slice(1);
workspaceMotion.setActive(null);
if (products[initialProduct]) openProduct(initialProduct, null);
