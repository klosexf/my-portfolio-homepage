'use strict';

// A small, interactive presentation of UIpicks using its real catalogue records.
// Demo bookmarks stay in this frame and never change the visitor's UIpicks data.
(() => {
  const $ = selector => document.querySelector(selector);
  const { sites, cases } = UIPICKS_DEMO_DATA;
  const state = { view: 'all', category: '', query: '', code: false, layout: 'all', style: 'all', saved: new Map() };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let playing = !reduced.matches;
  let timer = 0;
  let toastTimer = 0;
  let step = 0;
  let previewItem = null;
  let previewTrigger = null;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function setPlayback(value) {
    playing = value;
    clearTimeout(timer);
    $('#play').textContent = playing ? '暂停' : '播放';
    $('#play').setAttribute('aria-label', playing ? '暂停自动演示' : '播放自动演示');
    $('#play').setAttribute('aria-pressed', String(playing));
    document.body.classList.toggle('is-paused', !playing);
    if (playing) schedule();
  }

  function chapter(index, caption) {
    document.querySelectorAll('[data-chapter]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.chapter) === index)));
    $('#demo-caption').textContent = caption;
  }

  function toast(text) {
    clearTimeout(toastTimer);
    $('#toast').textContent = text;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 2200);
  }

  function toggleSave(item, feedback = true) {
    const saved = state.saved.has(item.id);
    if (saved) state.saved.delete(item.id);
    else state.saved.set(item.id, item);
    render();
    updatePreviewSave();
    if (feedback) toast(saved ? '已取消收藏' : '已加入演示收藏');
  }

  function updatePreviewSave() {
    if (!previewItem) return;
    const saved = state.saved.has(previewItem.id);
    $('#preview-save').textContent = saved ? '取消收藏' : '收藏这个参考';
    $('#preview-save').setAttribute('aria-pressed', String(saved));
  }

  function openPreview(item, trigger) {
    previewItem = item;
    previewTrigger = trigger || null;
    $('#preview-title').textContent = item.name;
    $('#preview-origin').textContent = item.source ? `具体案例 · 来自 ${item.source}` : `资源网站 · ${item.category}`;
    const image = $('#preview-image');
    image.hidden = false;
    $('.image-error').hidden = true;
    image.src = item.image;
    image.alt = `${item.name} 的已收录参考画面`;
    $('#preview-link').href = item.url;
    $('#preview-note').textContent = item.source ? `已收录画面 · ${item.capturedAt}。当前内容与获取条件请以原站为准。` : '预览来自已收录的公开展示内容；完整案例与获取条件请查看原站。';
    updatePreviewSave();
    if (!$('#preview').open) $('#preview').showModal();
  }

  function closePreview() {
    if ($('#preview').open) $('#preview').close();
  }

  function results() {
    if (state.view === 'saved') return [...state.saved.values()];
    if (state.view === 'finder') return cases.filter(item =>
      (state.layout === 'all' || item.layouts.includes(state.layout)) &&
      (state.style === 'all' || item.styles.includes(state.style)) &&
      (!state.query || `${item.name} ${item.description}`.toLowerCase().includes(state.query.toLowerCase())));
    return sites.filter(item =>
      (!state.category || item.category === state.category) &&
      (!state.code || item.code) &&
      (!state.query || `${item.name} ${item.description} ${item.category} ${item.keywords.join(' ')}`.toLowerCase().includes(state.query.toLowerCase())));
  }

  function render() {
    document.body.dataset.view = state.view;
    const finder = state.view === 'finder';
    const saved = state.view === 'saved';
    $('#workspace-title').textContent = finder ? '找到适合你的官网参考' : saved ? '我的收藏' : state.category || 'UI 设计资源与灵感导航';
    $('#workspace-description').textContent = finder ? '按布局与风格，找到具体的页面案例。' : saved ? '把值得回看的网站和案例，留在手边。' : '把分散的设计资源，收在一处。';
    $('#finder').hidden = !finder;
    $('#resource-filters').hidden = finder || saved;
    $('#search').disabled = saved;
    $('#saved-count').textContent = String(state.saved.size);
    document.querySelectorAll('[data-view]').forEach(button => {
      const active = button.dataset.view === state.view && !state.category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === state.category)));
    document.querySelectorAll('[data-code]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.code === 'true') === state.code)));
    document.querySelectorAll('[data-facet]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.value === state[button.dataset.facet])));
    const items = results();
    $('#result-count').textContent = `${items.length} ${finder ? '个案例' : saved ? '项收藏' : '个网站'} · 演示精选`;
    $('#empty').hidden = items.length !== 0;
    $('#empty-message').textContent = saved ? '还没有收藏，点卡片旁的 ♡ 试试。' : '还没有找到匹配的参考';
    $('#results').replaceChildren(...items.map((item, index) => {
      const article = node('article', 'site-card');
      article.style.setProperty('--i', index);
      const preview = node('button', 'card-preview');
      preview.type = 'button';
      preview.dataset.preview = item.id;
      preview.setAttribute('aria-label', `预览 ${item.name}`);
      const image = node('img');
      image.src = item.image;
      image.alt = `${item.name} 已收录画面`;
      image.decoding = 'async';
      image.addEventListener('error', () => { image.hidden = true; preview.append(node('span', 'image-error', '图片暂不可用，点击查看来源')); }, { once: true });
      preview.append(image, node('span', 'preview-hint', '预览 ↗'));
      preview.addEventListener('click', () => openPreview(item, preview));
      const head = node('div', 'card-head');
      const save = node('button', 'save-button', state.saved.has(item.id) ? '♥' : '♡');
      save.type = 'button';
      save.dataset.save = item.id;
      save.setAttribute('aria-label', `${state.saved.has(item.id) ? '取消收藏' : '收藏'} ${item.name}`);
      save.setAttribute('aria-pressed', String(state.saved.has(item.id)));
      save.addEventListener('click', () => {
        toggleSave(item);
        const replacement = [...document.querySelectorAll('[data-save]')].find(button => button.dataset.save === item.id);
        (replacement || $('[data-view="saved"]')).focus({ preventScroll: true });
      });
      head.append(node('h2', '', item.name), save);
      const tags = node('div', 'card-tags');
      (item.source ? ['产品官网', item.layouts.includes('center') ? '居中布局' : '左右分栏', '深色'] : [item.category, ...(item.code ? ['可提供代码'] : [])]).forEach(text => tags.append(node('span', '', text)));
      article.append(preview, head, node('p', '', item.source ? `来自 ${item.source} · 具体页面案例` : item.description), tags);
      return article;
    }));
  }

  function setView(view, category = '') {
    closePreview();
    Object.assign(state, { view, category, query: '', code: false, layout: 'all', style: 'all' });
    $('#search').value = '';
    $('.workspace').scrollTop = 0;
    render();
  }

  const steps = [
    () => { state.saved.clear(); setView('all'); chapter(0, '从网站、组件到动效，按用途找到设计来源。'); },
    () => { setView('all', 'UI 组件库'); chapter(0, '选择 UI 组件库，再筛出可以提供代码的资源。'); },
    () => { state.code = true; render(); },
    () => { setView('finder'); chapter(1, '想做产品官网？从布局与风格开始缩小范围。'); },
    () => { state.layout = 'center'; state.style = 'dark'; render(); $('#results').scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'instant' : 'smooth' }); chapter(1, '居中布局 + 深色，留下同时满足条件的具体案例。'); },
    () => { openPreview(cases[0]); chapter(2, '打开真实案例画面，保留原始出处。'); },
    () => { if (!state.saved.has(cases[0].id)) toggleSave(cases[0]); chapter(2, '收藏中意的参考，做设计时随时回看。'); },
    () => { setView('saved'); chapter(2, '网站与具体案例，都可以收进自己的参考库。'); }
  ];
  const durations = [4500, 3500, 3500, 4500, 4500, 4500, 3000, 4500];

  function schedule() {
    clearTimeout(timer);
    if (!playing || document.hidden) return;
    timer = setTimeout(() => { step = (step + 1) % steps.length; steps[step](); schedule(); }, durations[step]);
  }

  // Direct interaction takes over immediately; the automatic story stays paused.
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.playback')) setPlayback(false);
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('#preview').open) {
      event.preventDefault();
      closePreview();
      setPlayback(false);
      return;
    }
    if (event.key !== 'Escape' && !event.target.closest('.playback')) setPlayback(false);
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (state.view === 'saved') setView('all');
      $('#search').focus();
    }
  });
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    setView(button.dataset.view);
    chapter(button.dataset.view === 'finder' ? 1 : button.dataset.view === 'saved' ? 2 : 0, '可以直接操作：搜索、筛选、预览或收藏。');
  }));
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => { setView('all', button.dataset.category); chapter(0, '按当前需求，找到合适的资源分类。'); }));
  document.querySelectorAll('[data-code]').forEach(button => button.addEventListener('click', () => { state.code = button.dataset.code === 'true'; render(); }));
  document.querySelectorAll('[data-facet]').forEach(button => button.addEventListener('click', () => { state[button.dataset.facet] = button.dataset.value; render(); }));
  $('#search').addEventListener('input', event => { setPlayback(false); state.query = event.target.value.trim(); render(); });
  $('#reset').addEventListener('click', () => { setView(state.view === 'finder' ? 'finder' : 'all'); });
  $('#show-all').addEventListener('click', () => setView('all'));
  $('#close-preview').addEventListener('click', closePreview);
  $('#preview').addEventListener('close', () => {
    if (!previewTrigger) return;
    const target = previewTrigger.isConnected ? previewTrigger : [...document.querySelectorAll('[data-preview]')].find(button => button.dataset.preview === previewItem?.id);
    target?.focus({ preventScroll: true });
  });
  $('#preview').addEventListener('cancel', () => setPlayback(false));
  $('#preview-image').addEventListener('error', () => { $('#preview-image').hidden = true; $('.image-error').hidden = false; });
  $('#preview-save').addEventListener('click', () => { if (previewItem) toggleSave(previewItem); });
  document.querySelectorAll('[data-chapter]').forEach(button => button.addEventListener('click', () => {
    setPlayback(false);
    const index = Number(button.dataset.chapter);
    step = [0, 3, 5][index];
    if (index === 2) { setView('finder'); state.layout = 'center'; state.style = 'dark'; render(); }
    steps[step]();
  }));
  $('#play').addEventListener('click', () => setPlayback(!playing));
  $('#replay').addEventListener('click', () => { step = 0; steps[0](); setPlayback(true); });
  document.addEventListener('visibilitychange', () => { clearTimeout(timer); if (!document.hidden) schedule(); });
  reduced.addEventListener('change', () => { if (reduced.matches) setPlayback(false); });
  steps[0]();
  setPlayback(playing);
})();
