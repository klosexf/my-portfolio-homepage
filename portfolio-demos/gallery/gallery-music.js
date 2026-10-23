'use strict';

// Live audio energy, independent of the exhibition camera and artwork layers.
class GalleryMusic {
  constructor({ hallway, audio, panel, toggle, detailToggle, reactiveToggle, floor, rail, environment, wallMask, backdrop }) {
    Object.assign(this, { hallway, audio, panel, toggle, detailToggle, reactiveToggle, floor, rail, environment, wallMask, backdrop });
    this.enabled = this.readPreference('minimaze-music', true);
    // A room with only a music switch always enables its accompanying light.
    this.reactive = reactiveToggle ? this.readPreference('minimaze-reactive', true) : true;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.present = false;
    this.ready = false;
    this.motion = { phase: hallway.phase, mode: hallway.mode, settled: false };
    this.status = 'off';
    this.context = this.source = this.gain = this.analyser = null;
    this.version = 0;
    this.frame = this.pauseTimer = 0;
    this.lastSample = this.lastAudit = 0;
    this.lastBeat = -Infinity;
    this.bassFloor = .15;
    this.lastBass = this.envelope = this.pulse = 0;
    this.lightPulse = 0;
    this.drift = 0;
    this.cutoutsDirty = true;
    this.beats = 0;
    this.bars = [...panel.querySelectorAll('.music-meter i')];
    this.audit = new URLSearchParams(location.search).has('audit');
    this.audio.loop = true;
    this.audio.preload = 'metadata';
    this.audio.volume = .26;
    this.audio.addEventListener('playing', () => {
      if (!this.wanted()) { this.audio.pause(); return; }
      if (this.context && this.context.state !== 'running') return;
      if (!this.ready) return;
      this.status = 'on';
      this.update();
      this.applyVolume();
      this.startMeter();
    });
    this.audio.addEventListener('pause', () => {
      if (this.wanted() && this.status === 'on') {
        this.status = 'paused'; this.stopMeter(); this.resetVisuals(); this.update();
      }
    });
    this.audio.addEventListener('waiting', () => {
      if (!this.wanted()) return;
      this.status = 'loading'; this.update(); this.resetVisuals();
    });
    this.audio.addEventListener('error', () => {
      ++this.version;
      this.status = 'error'; this.stopMeter(); this.resetVisuals(); this.update();
    });
    toggle.addEventListener('click', () => this.toggleMusic());
    detailToggle.addEventListener('click', () => this.toggleMusic());
    reactiveToggle?.addEventListener('click', () => {
      this.reactive = !this.reactive;
      this.savePreference('minimaze-reactive', this.reactive);
      this.update();
      this.stopMeter();
      this.resetVisuals();
      if (!this.audio.paused) this.startMeter();
    });
    hallway.gallery.addEventListener('hallway-motion', event => {
      this.motion = { ...event.detail };
      this.cutoutsDirty = true;
      // enter() has a brief idle phase; only the app's explicit leave stops audio.
      if (this.present && this.motion.phase === 'ready' && !this.ready) {
        this.ready = true;
        this.auditEvent('entry-ready', { position: this.audio.currentTime });
        if (this.wanted()) this.playFromGesture();
      }
      if (!this.visualsAllowed()) this.resetVisuals();
    });
    hallway.gallery.addEventListener('hallway-layout', () => { this.cutoutsDirty = true; });
    this.layout = new MutationObserver(() => {
      this.cutoutsDirty = true;
      if (!this.visualsAllowed()) this.resetVisuals();
    });
    this.layout.observe(hallway.gallery, { attributes: true, attributeFilter: ['data-layout-moving'] });
    this.dialogs = new MutationObserver(() => {
      if (!this.visualsAllowed()) this.resetVisuals();
    });
    document.querySelectorAll('dialog').forEach(dialog => this.dialogs.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
    this.reduced.addEventListener('change', () => {
      this.stopMeter(); this.resetVisuals(); this.update();
      if (!this.audio.paused) this.startMeter();
    });
    document.addEventListener('visibilitychange', () => this.visibility());
    window.addEventListener('pagehide', () => this.suspend());
    window.addEventListener('resize', () => { this.cutoutsDirty = true; });
    window.addEventListener('pageshow', () => {
      this.present = document.body.dataset.scene === 'gallery';
      this.ready = this.present && this.motion.phase === 'ready';
      this.visibility();
    });
    this.update();
  }

  readPreference(key, fallback) { try { const saved = localStorage.getItem(key); return saved === null ? fallback : saved === 'on'; } catch (_) { return fallback; } }
  savePreference(key, value) { try { localStorage.setItem(key, value ? 'on' : 'off'); } catch (_) {} }
  wanted() { return this.present && this.enabled && !document.hidden; }

  initAudio() {
    if (this.context || this.noAnalyser) return;
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) { this.noAnalyser = true; this.update(); return; }
    this.context = new AudioEngine();
    this.source = this.context.createMediaElementSource(this.audio);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = .18;
    this.analyser.minDecibels = -85;
    this.analyser.maxDecibels = -18;
    this.gain = this.context.createGain();
    this.gain.gain.value = 0;
    this.source.connect(this.analyser);
    this.analyser.connect(this.gain);
    this.gain.connect(this.context.destination);
    this.audio.volume = 1;
    this.spectrum = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveform = new Uint8Array(this.analyser.fftSize);
    this.bands = new Float32Array(4);
    this.ranges = [[45, 130], [130, 350], [350, 1000], [1000, 4000]].map(([lo, hi]) => [
      Math.max(1, Math.floor(lo * this.analyser.fftSize / this.context.sampleRate)),
      Math.min(this.spectrum.length - 1, Math.ceil(hi * this.analyser.fftSize / this.context.sampleRate))
    ]);
  }

  // Called synchronously from the original entry click, before image decoding.
  beginEntry() {
    this.present = true;
    this.ready = false;
    this.auditEvent('begin-entry', { position: this.audio.currentTime });
    if (this.enabled) this.playFromGesture();
    else this.update();
  }

  commitEntry() { this.present = true; }

  playFromGesture() {
    if (!this.wanted()) return;
    const version = ++this.version;
    clearTimeout(this.pauseTimer);
    this.pauseTimer = 0;
    try {
      this.initAudio();
      const resume = this.context?.resume();
      this.applyVolume();
      if (this.audio.error) this.audio.load();
      // Both calls are issued in the click's synchronous user-activation chain.
      const play = this.audio.play();
      this.status = 'loading'; this.update();
      Promise.all([resume, play]).then(() => {
        if (version !== this.version || !this.wanted()) return;
        if (this.context && this.context.state !== 'running') throw new DOMException('Audio engine suspended', 'NotAllowedError');
        if (!this.ready) {
          // Keep the user-activated element primed, without advancing through
          // the song during the camera journey. No HTTP byte-range seeking.
          this.audio.pause(); this.stopMeter();
          this.auditEvent('entry-primed', { position: this.audio.currentTime });
          return;
        }
        this.status = 'on'; this.update(); this.applyVolume(); this.startMeter();
      }).catch(error => {
        if (version !== this.version || !this.wanted()) return;
        this.audio.pause();
        this.status = error.name === 'NotAllowedError' ? 'blocked' : 'error';
        this.stopMeter(); this.resetVisuals(); this.update();
      });
    } catch (_) {
      this.status = 'error'; this.stopMeter(); this.resetVisuals(); this.update();
    }
  }

  applyVolume() {
    const volume = this.wanted() && this.ready ? .26 : 0;
    if (this.gain && this.context) {
      const now = this.context.currentTime;
      this.gain.gain.cancelScheduledValues(now);
      this.gain.gain.setValueAtTime(this.gain.gain.value, now);
      this.gain.gain.linearRampToValueAtTime(volume, now + (volume ? .9 : .16));
    } else this.audio.volume = volume;
  }

  toggleMusic() {
    if (this.enabled && ['blocked', 'error', 'paused'].includes(this.status)) {
      this.playFromGesture(); return;
    }
    this.enabled = !this.enabled;
    this.savePreference('minimaze-music', this.enabled);
    if (this.enabled) this.playFromGesture();
    else {
      ++this.version;
      this.status = 'off';
      this.applyVolume(); this.stopMeter(); this.resetVisuals(); this.update();
      clearTimeout(this.pauseTimer);
      this.pauseTimer = setTimeout(() => {
        if (this.enabled && this.present) return;
        this.audio.pause(); this.context?.suspend().catch(() => {});
      }, 180);
    }
  }

  leave() {
    this.auditEvent('leave', { position: this.audio.currentTime });
    this.present = this.ready = false;
    this.suspend();
    this.status = 'off'; this.update();
  }

  suspend() {
    ++this.version;
    clearTimeout(this.pauseTimer);
    this.pauseTimer = 0;
    this.audio.pause();
    if (this.gain) this.gain.gain.value = 0;
    this.context?.suspend().catch(() => {});
    this.stopMeter(); this.resetVisuals();
  }

  visibility() {
    if (document.hidden) {
      this.suspend();
      if (this.present && this.enabled) { this.status = 'paused'; this.update(); }
    } else if (this.wanted()) this.playFromGesture();
  }

  update() {
    const playing = this.enabled && this.status === 'on';
    this.panel.dataset.state = this.status;
    document.body.dataset.music = this.status;
    const label = this.status === 'blocked' ? '开启音乐' : this.status === 'paused' ? '继续音乐' : this.status === 'error' ? '重试音乐' : this.status === 'loading' ? '载入中' : playing ? '音乐 开' : '音乐 关';
    for (const button of [this.toggle, this.detailToggle]) {
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', playing ? '关闭背景音乐' : this.status === 'error' ? '重新载入背景音乐' : '开启背景音乐');
      button.querySelector('.music-button-label').textContent = label;
    }
    const reduced = this.reduced.matches;
    this.panel.dataset.reactive = String(this.reactive && !reduced && !this.noAnalyser);
    if (!this.reactiveToggle) return;
    this.reactiveToggle.disabled = reduced || !!this.noAnalyser;
    this.reactiveToggle.setAttribute('aria-pressed', String(this.reactive && !reduced && !this.noAnalyser));
    this.reactiveToggle.textContent = reduced ? '静态光' : '律动';
    this.reactiveToggle.title = reduced ? '已遵循系统减少动态效果设置' : this.noAnalyser ? '当前浏览器仅播放音乐' : this.reactive ? '关闭音乐律动' : '开启音乐律动';
  }

  visualsAllowed() {
    return this.wanted() && this.status === 'on' && this.reactive && !this.reduced.matches && !this.noAnalyser &&
      this.hallway.gallery.dataset.layoutMoving !== 'true' &&
      this.motion.phase === 'ready' && this.motion.mode === 'wall' && this.motion.settled && !document.querySelector('dialog[open]');
  }

  startMeter() {
    if (this.frame || !this.analyser || !this.wanted() || !this.reactive || this.reduced.matches) return;
    this.lastSample = 0;
    this.frame = requestAnimationFrame(time => this.tick(time));
  }

  protectArtwork() {
    if (!this.environment) return;
    // Read rectangles once after the camera settles, never in the moving loop.
    // Wall holes stop at the frames; the floor starts below all visible labels.
    const bounds = this.environment.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const point = (x, y) => `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    const origin = point(0, 0);
    const path = [origin, point(bounds.width, 0), point(bounds.width, bounds.height), point(0, bounds.height), origin];
    let clearance = 0;
    for (const { card } of this.hallway.cards) {
      const cardRect = card.getBoundingClientRect();
      if (cardRect.right < bounds.left || cardRect.left > bounds.left + bounds.width) continue;
      clearance = Math.max(clearance, cardRect.bottom - bounds.top + 14);
      const rect = card.querySelector('.artwork-frame').getBoundingClientRect();
      const left = Math.max(0, rect.left - bounds.left - 12);
      const right = Math.min(bounds.width, rect.right - bounds.left + 12);
      const top = Math.max(0, rect.top - bounds.top - 12);
      const bottom = Math.min(bounds.height, rect.bottom - bounds.top + 12);
      if (right <= left || bottom <= top) continue;
      path.push(point(left, top), point(right, top), point(right, bottom), point(left, bottom), point(left, top), origin);
    }
    this.wallMask.style.clipPath = `polygon(evenodd,${path.join(',')})`;
    this.floor.style.setProperty('--music-floor-clearance', `${clearance.toFixed(1)}px`);
    this.rail.style.setProperty('--music-floor-clearance', `${clearance.toFixed(1)}px`);
    this.cutoutsDirty = false;
  }

  tick(time) {
    this.frame = 0;
    if (!this.wanted() || this.audio.paused || !this.analyser || !this.reactive || this.reduced.matches) return;
    this.frame = requestAnimationFrame(next => this.tick(next));
    if (this.lastSample && time - this.lastSample < 15) return;
    const dt = this.lastSample ? Math.min(.15, (time - this.lastSample) / 1000) : 1 / 60;
    this.lastSample = time;
    this.analyser.getByteFrequencyData(this.spectrum);
    this.analyser.getByteTimeDomainData(this.waveform);
    const bands = this.bands;
    this.ranges.forEach(([lo, hi], bandIndex) => {
      let sum = 0;
      for (let i = lo; i <= hi; i++) sum += this.spectrum[i];
      bands[bandIndex] = sum / (hi - lo + 1) / 255;
    });
    let power = 0;
    for (const sample of this.waveform) power += ((sample - 128) / 128) ** 2;
    const rms = Math.sqrt(power / this.waveform.length);
    const bass = bands[0];
    const low = bass * .78 + bands[1] * .22;
    // Detect a rising low-frequency transient, not a loud sustained note.
    // Normalize the rise to 30 Hz so display refresh rate does not change sensitivity.
    const flux = Math.max(0, low - this.lastBass) / (dt * 30);
    this.bassFloor += (low - this.bassFloor) * (1 - Math.exp(-dt / 1.8));
    const active = this.visualsAllowed();
    const beat = active && rms > .012 && low > Math.max(.1, this.bassFloor * 1.02) && flux > .055 && time - this.lastBeat > 420;
    if (beat) { this.pulse = 1; this.lastBeat = time; this.beats++; }
    else this.pulse *= Math.exp(-dt / .45);
    // Keep the detected onset, but soften its visible attack and release.
    this.lightPulse += (this.pulse - this.lightPulse) * (1 - Math.exp(-dt / (this.pulse > this.lightPulse ? .12 : .25)));
    if (!active) this.pulse = this.lightPulse = 0;
    this.lastBass = low;
    // Continuous energy and softened beats stay within a restrained light range.
    const target = Math.min(1, rms * 1.65 + bass * .1);
    this.envelope += (target - this.envelope) * (1 - Math.exp(-dt / (target > this.envelope ? .025 : .18)));
    this.drift += (bands[2] - bass - this.drift) * (1 - Math.exp(-dt / 2.4));
    // Fixed gradients are rasterized once; only their opacity/transform changes.
    if (active) {
      if (this.cutoutsDirty) this.protectArtwork();
      const energy = this.envelope * .12 + this.lightPulse * .11;
      this.hallway.gallery.style.setProperty('--music-drive', energy.toFixed(3));
      this.hallway.gallery.style.setProperty('--music-beat', this.lightPulse.toFixed(3));
      this.floor.style.opacity = (.02 + energy * .83).toFixed(3);
      this.floor.style.transform = `scale3d(${(.88 + energy * .32).toFixed(3)},${(.94 + energy * .2).toFixed(3)},1)`;
      this.rail.style.opacity = (.04 + energy * .9).toFixed(3);
      this.rail.style.transform = `scaleX(${(.72 + energy * .4).toFixed(3)})`;
      if (this.backdrop) {
        this.backdrop.style.opacity = (.02 + energy * .7).toFixed(3);
        this.backdrop.style.transform = `translate3d(${(this.drift * 24).toFixed(2)}px,0,0) scale(${(1.02 + this.lightPulse * .025).toFixed(3)})`;
      }
    }
    if (this.audit) {
      // Opt-in diagnostics for the gallery; no audio samples are stored.
      this.panel.dataset.beats = String(this.beats);
      this.panel.dataset.pulse = this.pulse.toFixed(3);
      this.panel.dataset.rms = rms.toFixed(3);
      this.panel.dataset.position = this.audio.currentTime.toFixed(3);
      const window = this.auditWindow ||= { from: this.audio.currentTime, min: 1, max: 0, beats: [] };
      if (active) {
        const drive = this.envelope * .12 + this.lightPulse * .11;
        window.min = Math.min(window.min, drive);
        window.max = Math.max(window.max, drive);
        if (beat) window.beats.push(Number(this.audio.currentTime.toFixed(3)));
      }
      if (this.audio.currentTime - window.from >= 2) {
        this.panel.dataset.lightWindow = JSON.stringify({ ...window, to: this.audio.currentTime });
        this.auditWindow = null;
      }
    }
    const meterAllowed = this.reactive && !this.reduced.matches && this.status === 'on';
    this.bars.forEach((bar, i) => { bar.style.transform = `scaleY(${meterAllowed ? (.18 + bands[i] * .82).toFixed(3) : '.2'})`; });
    if (this.audit && time - this.lastAudit > 250) {
      this.lastAudit = time;
      this.panel.dispatchEvent(new CustomEvent('gallery-audio-level', { bubbles: true, detail: {
        at: Math.round(time), position: this.audio.currentTime, rms, bass, bands: Array.from(bands), beats: this.beats,
        active, state: this.status, context: this.context?.state,
        floorOpacity: Number(this.floor.style.opacity || 0), railOpacity: Number(this.rail.style.opacity || 0),
        backdropOpacity: Number(this.backdrop?.style.opacity || 0), pulse: this.pulse, gain: this.gain?.gain.value
      } }));
    }
  }

  resetVisuals() {
    this.pulse = this.lightPulse = 0;
    this.hallway.gallery.style.setProperty('--music-drive', '0');
    this.hallway.gallery.style.setProperty('--music-beat', '0');
    this.floor.style.opacity = '0'; this.floor.style.transform = 'scale3d(.88,.94,1)';
    this.rail.style.opacity = '0'; this.rail.style.transform = 'scaleX(.76)';
    if (this.backdrop) { this.backdrop.style.opacity = '0'; this.backdrop.style.transform = 'translate3d(0,0,0) scale(1.02)'; }
    if (!this.reactive || this.reduced.matches || this.status !== 'on') this.bars.forEach(bar => { bar.style.transform = 'scaleY(.2)'; });
  }

  stopMeter() { cancelAnimationFrame(this.frame); this.frame = 0; this.lastSample = 0; }

  auditEvent(stage, detail) {
    if (this.audit) this.panel.dispatchEvent(new CustomEvent('gallery-audio-state', { bubbles: true, detail: { stage, at: performance.now(), ...detail } }));
  }
}
