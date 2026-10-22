'use strict';

// Preview-only adapters. Shared demo files remain unchanged, and chapter changes
// update the existing iframe document rather than navigating or replacing it.
(() => {
  const chapters = {
    repaste: [
      { label: '复制入库', caption: '复制过的内容，自动收进刘海里的剪贴板。' },
      { label: '搜索历史', caption: '输入关键词，找到之前复制过的链接和文字。' },
      { label: '粘贴继续', caption: '选中一条记录，回到正在写的内容里继续。' }
    ],
    readless: [
      { label: '选中与清洗', caption: '选中文字，用快捷键开始；链接和脚注会被跳过。' },
      { label: '连续聆听', caption: '文字逐句高亮，长内容可以接着听。' },
      { label: '暂停与继续', caption: '随时暂停，再从刚才的位置继续朗读。' }
    ],
    mindmap: [
      { label: '输入内容', caption: '把一段长内容放进来，作为整理的起点。', time: 0 },
      { label: '生成与编辑', caption: '内容长成导图，生成后还可以修改节点。', time: 7.5 },
      { label: '整理与导出', caption: '拖动节点整理思路，再保存和导出。', time: 26.5 }
    ],
    uipicks: [
      { label: '发现资源', caption: '从网站、组件和动效中，找到设计的参考来源。' },
      { label: '按需筛选', caption: '选择布局和风格，逐步缩小参考范围。' },
      { label: '预览与收藏', caption: '打开具体案例，把中意的参考收进收藏。' }
    ],
    wtd: [
      { label: '完成待办', caption: '在桌面勾选待办，完成状态同步回 Notion。' },
      { label: '记录与新建', caption: '切到日记记录想法，再把下一件事写进待办。' },
      { label: '专注与同步', caption: '给当前任务留一段专注时间，完成后同步记录。' }
    ]
  };

  // These lexical wrappers capture only the original demo IIFE's work. They
  // neither patch the parent page nor enumerate unrelated browser timer IDs.
  const scheduler = `
  const portfolioTimeouts = new Set(), portfolioIntervals = new Set(), portfolioFrames = new Set();
  let portfolioTakenOver = false;
  function setTimeout(callback, delay, ...args) {
    const id = window.setTimeout(() => { portfolioTimeouts.delete(id); callback(...args); }, delay);
    portfolioTimeouts.add(id); return id;
  }
  function clearTimeout(id) { portfolioTimeouts.delete(id); window.clearTimeout(id); }
  function setInterval(callback, delay, ...args) {
    const id = window.setInterval(callback, delay, ...args); portfolioIntervals.add(id); return id;
  }
  function clearInterval(id) { portfolioIntervals.delete(id); window.clearInterval(id); }
  function requestAnimationFrame(callback) {
    const id = window.requestAnimationFrame(time => { portfolioFrames.delete(id); callback(time); });
    portfolioFrames.add(id); return id;
  }
  function portfolioClearScheduled() {
    portfolioTimeouts.forEach(id => window.clearTimeout(id)); portfolioTimeouts.clear();
    portfolioIntervals.forEach(id => window.clearInterval(id)); portfolioIntervals.clear();
    portfolioFrames.forEach(id => window.cancelAnimationFrame(id)); portfolioFrames.clear();
    document.getAnimations().forEach(animation => animation.cancel());
  }
  function portfolioStep(index) { document.body.dataset.portfolioStep = String(index); }
`;

  const adapters = {
    repaste: `
  window.portfolioDemo = {
    seek(index) {
      index = Math.max(0, Math.min(2, Number(index) || 0));
      portfolioTakenOver = true; ++gen; myGen = gen; manual = true;
      flushTimers(); portfolioClearScheduled(); resetDemo(); portfolioStep(index);
      screenEl.classList.remove('manual');
      openPanel(); panel.classList.add('instant');
      cards.forEach(card => { card.classList.add('in'); card.classList.remove('off'); });
      cursorFade();
      if (index === 0) {
        bubble.classList.add('flash'); cards[0].classList.add('fresh');
        showKey('⌘ C', 848, 288, 780, gen);
        setTimeout(() => bubble.classList.remove('flash'), 900);
        setTimeout(() => selectCard(cards[0]), 1400);
      } else if (index === 1) {
        bubble.classList.remove('flash');
        typeSearch('github', gen);
        setTimeout(() => selectCard(visibleCards()[0]), 1600);
      } else {
        bubble.classList.remove('flash'); selectCard(cards[0]); useCard(cards[0]);
        setTimeout(() => { hideToast(); closePanel(); }, 1100);
        setTimeout(() => { showKey('⌘ V', 116, 316, 780, gen); pasteEditor(cards[0].dataset.paste); }, 1500);
      }
      setTimeout(() => window.portfolioDemo.seek((index + 1) % 3), index === 2 ? 5200 : 4400);
    },
    restart() { this.seek(0); }
  };


`,
    readless: `
  window.portfolioDemo = {
    seek(index) {
      index = Math.max(0, Math.min(2, Number(index) || 0));
      portfolioTakenOver = true; portfolioClearScheduled(); resetScene(); portfolioStep(index);
      if (kbd) kbd.classList.remove('show');
      lines.forEach(line => line.classList.add('on'));
      if (index === 0) {
        pressKeys('朗读');
        setTimeout(() => { hideKbd(); player.classList.add('show'); }, 800);
        setTimeout(() => { doc.classList.add('cleaned'); badge?.classList.add('show'); }, 1400);
        setTimeout(() => badge?.classList.remove('show'), 3000);
      } else {
        doc.classList.add('cleaned'); player.classList.add('show', 'is-playing'); scene.classList.add('is-live');
        if (index === 1) {
          player.classList.add('playing'); playTo(59, 5.4);
        } else {
          setProgress(59); updateSentences(); scene.classList.add('is-paused');
          if (pState) pState.textContent = '已暂停';
          setTimeout(() => {
            scene.classList.remove('is-paused'); player.classList.add('playing');
            if (pState) pState.textContent = '正在朗读'; playTo(88, 2.7);
          }, 1250);
        }
      }
      setTimeout(() => window.portfolioDemo.seek((index + 1) % 3), index === 0 ? 4300 : 6500);
    },
    restart() { this.seek(0); }
  };
`,
    wtd: `
  window.portfolioDemo = {
    seek(index) {
      index = Math.max(0, Math.min(2, Number(index) || 0));
      portfolioTakenOver = true; portfolioClearScheduled(); hardReset(); portfolioStep(index);
      stage.classList.add('in'); tickDate(); chip.classList.remove('pulse');
      Array.from(rows.children).forEach(row => { row.style.transform = ''; row.style.transition = ''; });
      if (index === 0) {
        setTimeout(() => { cursorOn(true); moveTo(cb1); }, 200);
        setTimeout(click, 700);
        setTimeout(() => { flipMove(() => row1.classList.add('done')); setSyncing(true); flyToNotion(); }, 850);
        setTimeout(() => { setSyncing(false); showToast(true); }, 1900);
      } else if (index === 1) {
        row1.classList.add('done'); switchTab('journal');
        setTimeout(() => typeInto(jtext, J_TEXT, 55), 300);
        setTimeout(() => autosave.classList.add('show'), 2100);
        setTimeout(() => { autosave.classList.remove('show'); switchTab('todo'); }, 3300);
        setTimeout(() => { ntf.classList.add('show'); rows.classList.add('dimmed'); }, 3900);
        setTimeout(() => { ntfHint.style.display = 'none'; typeInto(ntfTitle, N_TEXT, 75); }, 4300);
        setTimeout(() => {
          ntf.classList.remove('show'); rows.classList.remove('dimmed'); prow.style.display = 'flex';
          setSyncing(true); flyToNotion();
        }, 5500);
        setTimeout(() => { prow.classList.remove('pending'); setSyncing(false); showToast(true); }, 6500);
      } else {
        row1.classList.add('done'); prow.style.display = 'flex'; prow.classList.remove('pending');
        pomoNtf.classList.add('show'); rows.classList.add('dimmed');
        setTimeout(() => { cursorOn(true); moveTo(pomoStart); }, 500);
        setTimeout(click, 900);
        setTimeout(() => {
          pomoNtf.classList.remove('show'); rows.classList.remove('dimmed'); timerBtn2.classList.add('dimmed');
          pomo.classList.add('show'); widget.classList.add('pomo-on'); pomoCountdownStart();
        }, 1100);
        setTimeout(() => moveTo(pomoDone), 4000);
        setTimeout(click, 4600);
        setTimeout(() => { pomoReset(); setSyncing(true); flyToNotion(); }, 4800);
        setTimeout(() => { setSyncing(false); showToast(true); }, 6000);
      }
      setTimeout(() => window.portfolioDemo.seek((index + 1) % 3), index === 0 ? 4500 : index === 1 ? 8000 : 7500);
    },
    restart() { this.seek(0); }
  };
`
  };

  // Mark the real autoplay boundaries as well as selected chapters. Transient
  // UI states (a closed clipboard or completed timer) must not rewind captions.
  const nativeSteps = {
    repaste: [
      ['async function scene(){', 'async function scene(){\n    portfolioStep(0);'],
      ["await typeSearch('github', g);", "portfolioStep(1);\n    await typeSearch('github', g);"],
      ['useCard(cards[0]);\n    await sleep(1600);', 'portfolioStep(2);\n    useCard(cards[0]);\n    await sleep(1600);']
    ],
    readless: [
      ['async function cycle(){', 'async function cycle(){\n    portfolioStep(0);'],
      ["player.classList.add('is-playing','playing');", "portfolioStep(1);\n    player.classList.add('is-playing','playing');"],
      ["await pressKeys('暂停 / 继续');", "portfolioStep(2);\n    await pressKeys('暂停 / 继续');"]
    ],
    wtd: [
      ['function play(){', 'function play(){\n    portfolioStep(0);'],
      ['at(5750, function(){ switchTab("journal"); });', 'at(5750, function(){ portfolioStep(1); switchTab("journal"); });'],
      ['at(16400, function(){', 'at(16400, function(){\n      portfolioStep(2);']
    ]
  };

  function escapeAttribute(value) { return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function prepareSource(id, html, sourceURL) {
    if (!chapters[id]) throw new Error(`Unknown demo: ${id}`);
    // A srcdoc document has no query string. Preserve the original embed's
    // portfolio layout explicitly instead of consulting about:srcdoc.
    let result = html.replace(/<html\b([^>]*)>/i, (_tag, attributes) =>
      `<html${attributes.replace(/\sdata-presentation\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')} data-presentation="portfolio">`);
    if (adapters[id]) {
      const start = '(function(){';
      const end = /\}\)\(\);\s*<\/script>/;
      if (!result.includes(start) || !end.test(result)) throw new Error(`Demo adapter markers changed: ${id}`);
      nativeSteps[id].forEach(([marker, replacement]) => {
        if (!result.includes(marker)) throw new Error(`Demo chapter marker changed: ${id}`);
        result = result.replace(marker, replacement);
      });
      result = result.replace(/new URLSearchParams\(location\.search\)\.get\('presentation'\) === 'portfolio'/g, 'true');
      result = result.replace(start, start + '\n\'use strict\';\n' + scheduler);
      result = result.replace(end, adapters[id] + '\n})();\n</script>');
      if (id === 'readless') result = result.replace('function start(){', 'function start(){\n    if (portfolioTakenOver) return;');
    }
    const provenance = sourceURL ? `<base href="${escapeAttribute(new URL(sourceURL, document.baseURI).href)}"><meta name="portfolio-demo-source" content="${escapeAttribute(sourceURL)}">` : '';
    return result.replace('<head>', `<head>\n${provenance}<meta name="portfolio-demo-adapter" content="${id}">`);
  }

  function attach(frame, id, { onStep = () => {} } = {}) {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    const list = chapters[id];
    if (!doc || !win || !list) throw new Error(`Demo not ready: ${id}`);
    let previous = -1;
    let destroyed = false;
    const has = (selector, className) => !!doc.querySelector(selector)?.classList.contains(className);
    function activeStep() {
      const explicit = doc.body.dataset.portfolioStep;
      if (explicit !== undefined) return Math.max(0, Math.min(2, Number(explicit) || 0));
      if (id === 'mindmap') { const time = Number(doc.body.dataset.time) || 0; return time < 7.5 ? 0 : time < 26.5 ? 1 : 2; }
      if (id === 'uipicks') return Number(doc.querySelector('[data-chapter][aria-pressed="true"]')?.dataset.chapter) || 0;
      if (id === 'repaste') return has('#edLine', 'on') || has('#toast', 'show') ? 2 : has('#panel', 'open') ? 1 : 0;
      if (id === 'readless') return has('#scene', 'is-paused') || parseFloat(doc.querySelector('#barFill')?.style.width) >= 59 / 192 * 100 - .01 ? 2 : has('#player', 'is-playing') ? 1 : 0;
      return has('#pomo', 'show') || has('#pomoNtf', 'show') || has('#widget', 'pomo-on') ? 2 : has('#widget', 'is-journal') || has('#ntf', 'show') ? 1 : 0;
    }
    function report() {
      if (destroyed) return;
      const index = activeStep();
      if (index !== previous) { previous = index; onStep({ index, chapter: list[index], chapters: list }); }
    }
    const observer = new MutationObserver(report);
    observer.observe(doc.body, { attributes: true, attributeFilter: ['data-portfolio-step', 'data-time'] });
    const selectors = {
      repaste: '#panel,#edLine,#toast', readless: '#scene,#player',
      mindmap: '', uipicks: '[data-chapter]', wtd: '#widget,#ntf,#pomo,#pomoNtf'
    };
    if (selectors[id]) doc.querySelectorAll(selectors[id]).forEach(node => observer.observe(node, { attributes: true, attributeFilter: ['class', 'aria-pressed'] }));
    function play() {
      if (id === 'mindmap') {
        const toggle = doc.querySelector('#toggle-play');
        if (toggle?.getAttribute('aria-label') === '播放演示') toggle.click();
        win.postMessage({ type: 'mindmap-demo', action: 'play' }, location.origin);
      } else if (id === 'uipicks' && doc.querySelector('#play')?.getAttribute('aria-pressed') !== 'true') doc.querySelector('#play').click();
    }
    function seek(index) {
      if (destroyed) return false;
      index = Math.max(0, Math.min(2, Number(index) || 0));
      if (win.portfolioDemo?.seek) win.portfolioDemo.seek(index);
      else if (id === 'mindmap') { doc.querySelector(`[data-time="${list[index].time}"]`)?.click(); play(); }
      else if (id === 'uipicks') { doc.querySelector(`[data-chapter="${index}"]`)?.click(); play(); }
      else return false;
      report();
      return true;
    }
    const controller = { chapters: list, seek, restart: () => seek(0), destroy() { destroyed = true; observer.disconnect(); } };
    if (id === 'mindmap' || id === 'uipicks') {
      controller.play = play;
      controller.pause = () => {
        if (id === 'mindmap') win.postMessage({ type: 'mindmap-demo', action: 'pause' }, location.origin);
        else if (doc.querySelector('#play')?.getAttribute('aria-pressed') === 'true') doc.querySelector('#play').click();
      };
    }
    report();
    return controller;
  }

  window.PortfolioDemoGuide = { chapters, prepareSource, attach };
})();
