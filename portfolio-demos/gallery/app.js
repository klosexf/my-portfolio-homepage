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
  let layoutMoving = false;
  let layoutFinished = Promise.resolve();
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
    await layoutFinished;
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

  async function setView(next, animate = false) {
    if (layoutMoving || hallway.journey || gallery.dataset.view === next) return;
    const cards = hallway.cards.map(item => item.card);
    const before = cards.map(card => card.getBoundingClientRect());
    const focusedCard = cards.includes(document.activeElement) ? document.activeElement : null;
    if (hallway.frame) cancelAnimationFrame(hallway.frame);
    hallway.frame = 0;
    gallery.dataset.layoutMoving = 'true';
    layoutMoving = true;
    previews.sync();
    gallery.dataset.view = next;
    hallway.setMode(next);
    hallway.resize();
    hallway.renderNavigation(hallway.index);
    viewport.setAttribute('aria-label', next === 'list' ? '全部五款作品，点击查看产品详情' : '横向作品展墙，滚轮或向左拖动浏览，也可使用左右方向键');
    if (next === 'list') viewport.removeAttribute('aria-roledescription');
    else viewport.setAttribute('aria-roledescription', '轮播');
    const toggle = $('#overview-toggle');
    toggle.setAttribute('aria-pressed', String(next === 'list'));
    toggle.querySelector('span').textContent = next === 'list' ? '回到展厅' : '全部作品';
    toggle.setAttribute('aria-label', next === 'list' ? '回到当前作品的展厅位置' : '查看全部五款作品');
    const reduce = hallway.reducedMotion.matches;
    if (animate && !reduce) {
      const after = cards.map(card => card.getBoundingClientRect());
      const animations = cards.map((card, index) => {
        const from = before[index];
        const to = after[index];
        const matrix = new DOMMatrixReadOnly(getComputedStyle(card).transform);
        const sx = from.width / Math.max(1, to.width);
        const sy = from.height / Math.max(1, to.height);
        card.style.transformOrigin = '0 0';
        return card.animate([
          { transform: `matrix(${sx},0,0,${sy},${matrix.e + from.left - to.left},${matrix.f + from.top - to.top})` },
          { transform: matrix.toString() }
        ], { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)' });
      });
      layoutFinished = Promise.allSettled(animations.map(animation => animation.finished));
      await layoutFinished;
      cards.forEach(card => { card.style.transformOrigin = ''; });
    }
    delete gallery.dataset.layoutMoving;
    layoutMoving = false;
    previews.sync();
    if (focusedCard && next === 'wall') hallway.cards[hallway.index].card.focus({ preventScroll: true });
    announce(next === 'list' ? '已展开全部五款作品，点击作品查看详情。' : '已回到横向展厅，继续浏览当前作品。');
  }

  $('#enter-gallery').addEventListener('click', () => enterGallery());
  $('.wordmark').addEventListener('click', event => { event.preventDefault(); entrance(); });
  $('#open-menu').addEventListener('click', () => menu.showModal());
  $('[data-close-menu]').addEventListener('click', () => menu.close());
  $('#menu-work').addEventListener('click', () => { menu.close(); enterGallery(); });
  $('#menu-about').addEventListener('click', () => { menu.close(); about.showModal(); });
  $('[data-close-about]').addEventListener('click', () => about.close());
  $('#overview-toggle').addEventListener('click', () => setView(gallery.dataset.view === 'list' ? 'wall' : 'list', true));
  const dismissHint = () => { gallery.dataset.navigated = 'true'; };
  $('#hallway-pagination').addEventListener('click', dismissHint);
  $('#hallway-previous').addEventListener('click', dismissHint);
  $('#hallway-next').addEventListener('click', dismissHint);
  viewport.addEventListener('wheel', () => { if (hallway.phase === 'ready') dismissHint(); }, { passive: true });
  viewport.addEventListener('pointermove', () => { if (hallway.drag?.distance) dismissHint(); }, { passive: true });
  viewport.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) dismissHint(); });
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
    if (detailBusy || layoutMoving) return;
    const wasOpen = detail.open;
    setDetailBusy(true);
    $('#close-product').textContent = hallway.mode === 'list' ? '← 返回总览' : '← 返回展厅';
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
