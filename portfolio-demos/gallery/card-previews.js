'use strict';

// One persistent playback surface: opening/closing changes only its transform.
// The iframe never changes parent, so a live demo survives the whole transition.
class GalleryCardPreviews {
  constructor({ hallway, toggle, onStep = () => {} }) {
    Object.assign(this, { hallway, toggle, onStep });
    this.enabled = true;
    this.current = null;
    this.detail = null;
    this.generation = 0;
    this.startTimer = this.fadeTimer = this.followFrame = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.motion = { settled: false, index: hallway.index, phase: hallway.phase, mode: hallway.mode };
    this.layer = document.createElement('div');
    this.layer.className = 'artwork-playback-layer';
    this.layer.setAttribute('popover', 'manual');
    this.layer.setAttribute('aria-hidden', 'true');
    this.layer.inert = true;
    document.body.append(this.layer);
    this.onMotion = event => { this.motion = { ...event.detail }; this.sync(); };
    this.onLayout = () => this.fit();
    this.onToggle = () => { this.enabled = !this.enabled; this.updateToggle(); this.sync(); };
    this.onPreference = () => { this.updateToggle(); this.sync(); };
    this.onVisibility = () => {
      if (!document.hidden && this.detail && !this.current) {
        const record = this.createFrame(this.detail.index, !this.enabled || this.reduced.matches);
        this.showLayer(true);
        this.reveal(record);
      }
      if (!document.hidden) this.fit();
      this.sync();
    };
    this.onPageHide = () => this.stop();
    this.onResize = () => this.fit();
    this.dialogs = new MutationObserver(() => this.sync());
    document.querySelectorAll('dialog').forEach(dialog => this.dialogs.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
    hallway.gallery.addEventListener('hallway-motion', this.onMotion);
    hallway.gallery.addEventListener('hallway-layout', this.onLayout);
    toggle?.addEventListener('click', this.onToggle);
    this.reduced.addEventListener('change', this.onPreference);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.onPageHide);
    window.addEventListener('pageshow', this.onVisibility);
    window.addEventListener('resize', this.onResize);
    this.updateToggle();
  }

  updateToggle() {
    if (!this.toggle) return;
    const reduced = this.reduced.matches;
    this.toggle.disabled = reduced;
    this.toggle.setAttribute('aria-pressed', String(this.enabled && !reduced));
    this.toggle.textContent = reduced ? '减少动态效果' : this.enabled ? '演示：开' : '演示：关';
    this.toggle.setAttribute('aria-label', reduced ? '系统已开启减少动态效果' : this.enabled ? '关闭作品自动演示' : '开启作品自动演示');
  }

  allowed() {
    return this.enabled && !this.reduced.matches && !document.hidden && this.motion.phase === 'ready' &&
      this.motion.mode === 'wall' && document.body.dataset.scene === 'gallery' && !document.querySelector('dialog[open]');
  }

  showLayer(front = false) {
    if (this.layer.showPopover) {
      if (front && this.layer.matches(':popover-open')) this.layer.hidePopover();
      if (!this.layer.matches(':popover-open')) this.layer.showPopover();
    } else this.layer.classList.add('is-fallback-visible');
  }

  sync() {
    if (this.detail) return;
    const generation = ++this.generation;
    clearTimeout(this.startTimer);
    clearTimeout(this.fadeTimer);
    this.startTimer = this.fadeTimer = 0;
    if (!this.allowed()) { this.removeFrame(); return; }
    if (this.current?.visible) this.current.surface.classList.add('is-visible');
    this.follow();
    if (!this.motion.settled) return;
    const index = this.motion.index;
    this.startTimer = setTimeout(() => {
      this.startTimer = 0;
      if (generation !== this.generation || !this.allowed() || !this.motion.settled) return;
      if (this.current?.index === index) { this.reveal(this.current); return; }
      if (this.current?.visible) {
        this.current.surface.classList.remove('is-visible');
        this.fadeTimer = setTimeout(() => {
          this.fadeTimer = 0;
          if (generation !== this.generation || !this.allowed() || !this.motion.settled) return;
          this.removeFrame();
          this.createFrame(index);
        }, 320);
      } else { this.removeFrame(); this.createFrame(index); }
    }, 200);
  }

  createFrame(index, posterOnly = false) {
    if (this.current) return this.current;
    const id = this.hallway.order[index];
    const product = this.hallway.cards[index].product;
    const surface = document.createElement('div');
    surface.className = 'artwork-playback-surface';
    surface.dataset.product = id;
    const poster = document.createElement('img');
    poster.src = this.hallway.asset(product.image);
    poster.alt = '';
    surface.append(poster);
    const record = this.current = { index, id, product, surface, frame: null, ready: false, visible: false,
      designWidth: product.imageWidth, designHeight: product.imageHeight, timeout: 0, readyTimer: 0, raf: 0, guide: null };
    Object.assign(surface.style, { width: `${record.designWidth}px`, height: `${record.designHeight}px`, background: product.background });
    this.layer.append(surface);
    this.showLayer();
    this.fit();
    if (!posterOnly) this.loadDemo(record);
    return record;
  }

  async loadDemo(record) {
    if (!record || record !== this.current || record.frame) return;
    const frame = document.createElement('iframe');
    record.frame = frame;
    frame.title = `${record.product.name} 自动演示`;
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.allow = 'autoplay';
    Object.assign(frame.style, { width: `${record.designWidth}px`, height: `${record.designHeight}px` });
    frame.addEventListener('load', () => this.prepare(record, frame), { once: true });
    frame.addEventListener('error', () => this.fail(record, frame), { once: true });
    record.timeout = setTimeout(() => this.fail(record, frame), 12000);
    record.abort = new AbortController();
    const url = new URL(this.hallway.asset(record.product.demo), document.baseURI);
    url.searchParams.set('presentation', 'portfolio');
    try {
      if (window.PortfolioDemoGuide?.prepareSource) {
        const response = await fetch(url, { signal: record.abort.signal });
        if (!response.ok) throw new Error('Demo unavailable');
        const html = await response.text();
        if (record !== this.current || record.frame !== frame) return;
        const source = window.PortfolioDemoGuide.prepareSource(record.id, html);
        frame.srcdoc = source.replace(/<head[^>]*>/i, match => `${match}<base href="${url.href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`);
      } else frame.src = url.href;
      record.surface.append(frame);
    } catch (_) { this.fail(record, frame); }
  }

  async prepare(record, frame) {
    if (record !== this.current || record.frame !== frame) return;
    try {
      const doc = record.frame.contentDocument;
      const roots = { repaste: '#screen', readless: '#scene', wtd: '#stage', mindmap: '.demo-player', uipicks: '.demo-player' };
      if (!doc?.querySelector(roots[record.id])) throw new Error('Incomplete demo');
      if (record.id === 'wtd') {
        const style = doc.createElement('style');
        style.textContent = '.stage .wg-wrap{opacity:1!important;transform:none!important}';
        doc.head.append(style);
      }
      doc.documentElement.inert = true;
      if (doc.fonts?.ready) await doc.fonts.ready;
      if (record !== this.current || record.frame !== frame) return;
      await new Promise(resolve => { record.raf = requestAnimationFrame(() => { record.raf = requestAnimationFrame(() => { record.raf = 0; resolve(); }); }); });
      if (record.id === 'wtd') await new Promise(resolve => { record.readyTimer = setTimeout(resolve, 800); });
      if (record !== this.current || record.frame !== frame) return;
      clearTimeout(record.timeout);
      record.timeout = record.readyTimer = 0;
      record.ready = true;
      record.guide = window.PortfolioDemoGuide?.attach(record.frame, record.id, {
        onStep: step => this.reportStep(record, step)
      });
      if (record.pendingChapter !== undefined) record.guide?.seek(record.pendingChapter);
      record.surface.classList.add('demo-ready');
      this.reveal(record);
    } catch (_) { this.fail(record, frame); }
  }

  reportStep(record, step) {
    if (record !== this.current) return;
    if (step?.chapter) step = { index: step.index, label: step.chapter.label, description: step.chapter.caption };
    record.step = step;
    const caption = this.hallway.cards[record.index].card.querySelector('.artwork-demo-status');
    if (caption && step?.label) caption.textContent = `正在演示 · ${step.label}`;
    this.onStep({ index: record.index, step, chapters: record.guide?.chapters || window.PortfolioDemoGuide?.chapters?.[record.id] || [] });
  }

  reveal(record) {
    if (record !== this.current) return;
    if (!this.detail && (!record.ready || !this.allowed() || !this.motion.settled || this.motion.index !== record.index)) return;
    record.visible = true;
    record.surface.classList.add('is-visible');
  }

  galleryTransform(record) {
    const hallway = this.hallway;
    const size = hallway.sizes[record.index];
    const x = hallway.stops[record.index] - size.width / 2 + 1;
    const y = -size.height / 2 - hallway.layoutHeight * .025 + 1;
    return `translate3d(${hallway.layoutWidth / 2}px,${hallway.layoutHeight * .48}px,0) ${hallway.plane.style.transform} translate3d(${x}px,${y}px,0) scale(${(size.width - 2) / record.designWidth})`;
  }

  detailTransform(record) {
    const rect = this.detail.media.getBoundingClientRect();
    const scale = Math.min((rect.width - 2) / record.designWidth, (rect.height - 2) / record.designHeight);
    const x = rect.left + (rect.width - record.designWidth * scale) / 2;
    const y = rect.top + (rect.height - record.designHeight * scale) / 2;
    return `translate3d(${x}px,${y}px,0) scale(${scale})`;
  }

  fit() {
    if (!this.current || this.transitioning) return;
    this.layer.style.perspective = this.detail ? 'none' : `${this.hallway.perspective}px`;
    const illumination = Number(this.hallway.cards[this.current.index].illumination || 1);
    this.current.surface.style.setProperty('--surface-light', this.detail ? '1' : String(.24 + illumination * .76));
    this.current.surface.style.transform = this.detail ? this.detailTransform(this.current) : this.galleryTransform(this.current);
    if (this.detail) {
      const rect = this.detail.media.getBoundingClientRect();
      const bar = this.detail.media.closest('dialog').querySelector('.dialog-bar').getBoundingClientRect();
      const top = Math.max(0, rect.top, bar.bottom);
      const bottom = Math.max(top, Math.min(innerHeight, rect.bottom));
      this.layer.style.clipPath = `inset(${top}px ${Math.max(0, innerWidth - rect.right)}px ${Math.max(0, innerHeight - bottom)}px ${Math.max(0, rect.left)}px)`;
    } else this.layer.style.clipPath = 'none';
  }

  follow() {
    if (this.followFrame || this.detail) return;
    const tick = () => {
      this.followFrame = 0;
      if (this.detail || !this.current) return;
      this.fit();
      if (!this.motion.settled) this.followFrame = requestAnimationFrame(tick);
    };
    this.followFrame = requestAnimationFrame(tick);
  }

  beginDetail(index, media, source) {
    ++this.generation;
    clearTimeout(this.startTimer);
    clearTimeout(this.fadeTimer);
    cancelAnimationFrame(this.followFrame);
    this.startTimer = this.fadeTimer = this.followFrame = 0;
    if (this.current?.index !== index) this.removeFrame();
    this.detail = { index, media };
    const record = this.current || this.createFrame(index, !this.enabled || this.reduced.matches);
    if (source) {
      const rect = source.getBoundingClientRect();
      record.surface.style.transform = `translate3d(${rect.left + 1}px,${rect.top + 1}px,0) scale(${(rect.width - 2) / record.designWidth})`;
    }
    this.layer.style.perspective = 'none';
    record.visible = true;
    record.surface.classList.add('is-visible');
    return record;
  }

  async expand() {
    this.showLayer(true);
    this.layer.style.clipPath = 'none';
    await this.animateTo(this.detailTransform(this.current), 640);
    this.fit();
  }

  async animateTo(target, duration) {
    const record = this.current;
    if (!record) return;
    this.transitioning = true;
    const start = getComputedStyle(record.surface).transform;
    record.surface.style.transform = target;
    const animation = record.surface.animate([{ transform: start }, { transform: target }], {
      duration: this.reduced.matches ? 0 : duration, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both'
    });
    record.animation = animation;
    try { await animation.finished; } catch (_) { /* A page exit may cancel it. */ }
    animation.cancel();
    record.animation = null;
    this.transitioning = false;
  }

  async switchDetail(index) {
    const old = this.current;
    if (old) {
      const fade = old.surface.animate([{ opacity: 1 }, { opacity: 0 }], { duration: this.reduced.matches ? 0 : 160, fill: 'both' });
      try { await fade.finished; } catch (_) {}
      fade.cancel();
    }
    this.removeFrame();
    this.detail.index = index;
    const record = this.createFrame(index, !this.enabled || this.reduced.matches);
    this.fit();
    this.reveal(record);
  }

  async collapse() {
    this.hallway.goTo(this.detail.index, false, true);
    this.layer.style.clipPath = 'none';
    const rect = this.hallway.cards[this.detail.index].card.querySelector('.artwork-frame').getBoundingClientRect();
    const target = `translate3d(${rect.left + 1}px,${rect.top + 1}px,0) scale(${(rect.width - 2) / this.current.designWidth})`;
    await this.animateTo(target, 560);
  }

  endDetail() {
    this.detail = null;
    this.fit();
    this.sync();
  }

  selectChapter(index) {
    const record = this.current;
    if (!record) return;
    if (record.guide) record.guide.seek(index);
    else { record.pendingChapter = index; this.loadDemo(record); }
  }
  restart() { this.selectChapter(0); }

  fail(record, frame) {
    if (record !== this.current || (frame && record.frame !== frame)) return;
    record.abort?.abort();
    clearTimeout(record.readyTimer);
    cancelAnimationFrame(record.raf);
    clearTimeout(record.timeout);
    record.guide?.destroy();
    record.frame?.remove();
    record.frame = null;
    record.surface.classList.remove('demo-ready');
    if (!this.detail) this.removeFrame();
    else this.onStep({ index: record.index, failed: true });
  }

  removeFrame() {
    const record = this.current;
    this.current = null;
    if (!record) return;
    clearTimeout(record.timeout);
    clearTimeout(record.readyTimer);
    cancelAnimationFrame(record.raf);
    record.guide?.destroy();
    record.abort?.abort();
    record.animation?.cancel();
    record.surface.remove();
    const caption = this.hallway.cards[record.index].card.querySelector('.artwork-demo-status');
    if (caption) caption.textContent = record.product.tagline;
  }

  stop() {
    ++this.generation;
    clearTimeout(this.startTimer);
    clearTimeout(this.fadeTimer);
    cancelAnimationFrame(this.followFrame);
    this.startTimer = this.fadeTimer = this.followFrame = 0;
    this.removeFrame();
  }
}
