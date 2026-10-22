'use strict';

(() => {
  const $ = selector => document.querySelector(selector);
  const gallery = $('#gallery');
  const plane = $('#gallery-plane');
  const viewport = $('#gallery-viewport');
  const menu = $('#menu-dialog');
  const about = $('#about-dialog');
  const detail = $('#product-dialog');
  const media = $('#media-stage');
  const order = ['repaste', 'readless', 'mindmap', 'uipicks', 'wtd'];
  let entered = false;
  let preparingEntry = false;
  let entryGeneration = 0;
  let productIndex = 0;
  let lastArtwork = null;
  let detailBusy = false;
  let closing = false;
  const siteRoot = new URL('../../', document.currentScript.src);
  const asset = path => /^(https?:|data:)/.test(path) ? path : new URL(path, siteRoot).href;
  const announce = message => { $('#announcement').textContent = message; };
  const hallway = new ProductHallway({ viewport, plane, order, products: productCatalog, asset, announce,
    onOpen(index, card) { lastArtwork = card; showProduct(index); }
  });
  hallway.cards.forEach(({ card }) => {
    card.querySelector('.artwork-caption small').classList.add('artwork-demo-status');
  });
  const music = new GalleryMusic({ hallway, audio: $('#gallery-music'), panel: $('#music-controls'),
    toggle: $('#music-toggle'), detailToggle: $('#detail-music-toggle'),
    floor: $('#music-floor-glow'), rail: $('#music-horizon'),
    environment: $('#music-environment'), wallMask: $('#music-wall-mask'), backdrop: $('#music-wall-glow') });
  const previews = new GalleryCardPreviews({ hallway, onStep: updateStep });
  new ResizeObserver(() => previews.fit()).observe(media);
  detail.addEventListener('scroll', () => previews.fit(), { passive: true });

  async function enterGallery() {
    if (entered || preparingEntry) return;
    music.beginEntry();
    preparingEntry = true;
    const generation = ++entryGeneration;
    const enterButton = $('#enter-gallery');
    enterButton.setAttribute('aria-busy', 'true');
    // Decode real artwork before the first moving frame, including a cold visit.
    await Promise.allSettled([
      document.fonts.ready,
      ...Array.from(document.querySelectorAll('.artwork-image,.hallway-product-icon'), image => image.decode())
    ]);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (generation !== entryGeneration) return;
    preparingEntry = false;
    enterButton.removeAttribute('aria-busy');
    entered = true;
    gallery.inert = false;
    $('#entrance').inert = true;
    document.body.dataset.scene = 'gallery';
    music.commitEntry();
    setView('wall');
    hallway.enter();
  }

  function entrance() {
    music.leave();
    ++entryGeneration;
    preparingEntry = false;
    $('#enter-gallery').removeAttribute('aria-busy');
    hallway.leave();
    entered = false;
    gallery.inert = true;
    $('#entrance').inert = false;
    document.body.dataset.scene = 'entrance';
    $('#enter-gallery').focus({ preventScroll: true });
  }

  function setView(next) {
    gallery.dataset.view = next;
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === next)));
    hallway.setMode(next);
    announce(next === 'list' ? '已切换为作品列表。' : '已切换为横向展墙。');
  }

  $('#enter-gallery').addEventListener('click', () => enterGallery());
  $('.wordmark').addEventListener('click', event => { event.preventDefault(); entrance(); });
  $('#open-menu').addEventListener('click', () => menu.showModal());
  $('[data-close-menu]').addEventListener('click', () => menu.close());
  $('#menu-work').addEventListener('click', () => { menu.close(); enterGallery(); });
  $('#menu-about').addEventListener('click', () => { menu.close(); about.showModal(); });
  $('[data-close-about]').addEventListener('click', () => about.close());
  document.querySelectorAll('.view-switch button').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  function fillProduct(index) {
    productIndex = (index + order.length) % order.length;
    const product = productCatalog[order[productIndex]];
    $('#product-position').textContent = `${String(productIndex + 1).padStart(2, '0')} / 05`;
    $('#product-category').textContent = product.category;
    $('#product-title').textContent = product.name;
    $('#product-headline').textContent = product.headline;
    $('#product-description').textContent = product.description;
    $('#product-icon').src = asset(product.icon);
    $('#product-link').href = asset(product.href);
    const facts = product.facts.map(fact => { const li = document.createElement('li'); li.textContent = fact; return li; });
    $('#product-facts').replaceChildren(...facts);
    const image = document.createElement('img');
    image.src = asset(product.image);
    image.alt = product.imageAlt;
    media.style.setProperty('--media-background', product.background);
    media.style.setProperty('--media-ratio', `${product.imageWidth} / ${product.imageHeight}`);
    media.dataset.product = order[productIndex];
    media.replaceChildren(image);
    $('#media-label').textContent = '准备演示';
    $('#demo-step-description').textContent = '跟随演示，看看它如何解决日常的小麻烦。';
    const chapters = window.PortfolioDemoGuide?.chapters?.[order[productIndex]] || [];
    $('#demo-chapters').replaceChildren(...chapters.map((chapter, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.chapter = i;
      button.setAttribute('aria-pressed', 'false');
      button.disabled = true;
      const number = document.createElement('span');
      number.textContent = String(i + 1).padStart(2, '0');
      const label = document.createElement('span');
      label.textContent = chapter.label;
      button.append(number, label);
      button.addEventListener('click', () => previews.selectChapter(i));
      return button;
    }));
    $('#play-demo').disabled = true;
  }

  function setDetailBusy(busy) {
    detailBusy = busy;
    $('#previous-product').disabled = busy;
    $('#next-product').disabled = busy;
    $('#close-product').disabled = busy;
    detail.setAttribute('aria-busy', String(busy));
  }

  async function showProduct(index) {
    if (detailBusy) return;
    const wasOpen = detail.open;
    setDetailBusy(true);
    fillProduct(index);
    detail.scrollTop = 0;
    if (wasOpen) {
      await previews.switchDetail(productIndex);
    } else {
      const source = hallway.cards[productIndex].card.querySelector('.artwork-frame');
      previews.beginDetail(productIndex, media, source);
      detail.classList.add('is-opening');
      detail.showModal();
      detail.scrollTop = 0;
      await previews.expand();
      detail.classList.remove('is-opening');
    }
    setDetailBusy(false);
    if (!wasOpen) $('#close-product').focus({ preventScroll: true });
    const record = previews.current;
    if (record?.ready) updateStep({ index: record.index, step: record.step });
    else if (!previews.enabled || previews.reduced.matches) {
      $('#media-label').textContent = '产品界面 · 点击步骤开始演示';
      $('#play-demo').disabled = false;
      document.querySelectorAll('#demo-chapters button').forEach(button => { button.disabled = false; });
    }
  }

  function updateStep({ index, step, failed }) {
    if (!detail.open || index !== productIndex) return;
    if (failed) {
      $('#media-label').textContent = '暂未载入演示 · 产品界面仍可查看';
      $('#play-demo').textContent = '重新载入演示 ↻';
      $('#play-demo').disabled = false;
      return;
    }
    if (!step) return;
    $('#media-label').textContent = `正在演示 · ${step.label}`;
    $('#demo-step-description').textContent = step.description || '';
    $('#play-demo').textContent = '从头播放 ↻';
    $('#play-demo').disabled = false;
    document.querySelectorAll('#demo-chapters button').forEach((button, i) => {
      button.disabled = false;
      button.setAttribute('aria-pressed', String(i === step.index));
    });
  }

  async function closeProduct() {
    if (!detail.open || detailBusy || closing) return;
    closing = true;
    setDetailBusy(true);
    detail.classList.add('is-closing');
    detail.scrollTop = 0;
    previews.fit();
    await previews.collapse();
    detail.close();
    detail.classList.remove('is-closing');
    previews.endDetail();
    media.replaceChildren();
    closing = false;
    setDetailBusy(false);
    lastArtwork = hallway.cards[productIndex].card;
    lastArtwork.focus({ preventScroll: true });
  }

  $('#play-demo').addEventListener('click', () => {
    const record = previews.current;
    if (!record?.frame) {
      previews.loadDemo(record);
      $('#media-label').textContent = '准备演示';
      $('#play-demo').disabled = true;
    } else previews.restart();
  });
  $('#close-product').addEventListener('click', closeProduct);
  $('#previous-product').addEventListener('click', () => showProduct(productIndex - 1));
  $('#next-product').addEventListener('click', () => showProduct(productIndex + 1));
  detail.addEventListener('cancel', event => { event.preventDefault(); closeProduct(); });
  [menu, about, detail].forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) { if (dialog === detail) closeProduct(); else dialog.close(); }
  }));
  document.addEventListener('keydown', event => {
    if (detail.open && !['INPUT', 'TEXTAREA', 'IFRAME'].includes(document.activeElement?.tagName)) {
      if (event.key === 'ArrowRight') { event.preventDefault(); showProduct(productIndex + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); showProduct(productIndex - 1); }
    }
  });
})();
