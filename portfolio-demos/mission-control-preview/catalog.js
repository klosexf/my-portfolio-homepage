'use strict';

// Add a real product here: cards, counts, detail tabs and browse order follow it.
// featured marks a Dock shortcut; keep that shortlist to four readable entries.
const products = {
  repaste: {
    name: 'Repaste', tagline: '剪贴板，藏进刘海里', featured: true,
    category: 'macOS · 剪贴板管理', headline: '剪贴板，\n就在刘海里。',
    description: '鼠标滑到刘海，剪贴板历史就展开。把刚刚复制的内容，放回你正在做的事情里。',
    facts: ['文本、链接、图片，一处整理', '按来源 App 查找复制记录'],
    image: 'assets/repaste.jpg', imageAlt: 'Repaste 剪贴板面板的现有界面演示', imageWidth: 980, imageHeight: 640,
    icon: '../repaste-app-icon.svg', demo: '../embed-repaste.html',
    href: '../../landing-repaste.html', background: '#272536'
  },
  readless: {
    name: 'Readless', tagline: '把长文，读给你听', featured: true,
    category: 'macOS · 桌面听读助手', headline: '把长文，\n读给你听。',
    description: '选中文字，按下 ⌥R 开始朗读。让没读完的长文，陪你走过通勤和忙碌的间隙。',
    facts: ['清洗链接、脚注与硬断行', '切换 App，也能继续聆听'],
    image: 'assets/readless.jpg', imageAlt: 'Readless 文档朗读与播放条的现有界面演示', imageWidth: 1080, imageHeight: 524,
    icon: '../readless-app-icon.png', demo: '../embed-readless.html',
    href: '../../index-readless.html', background: '#273346'
  },
  mindmap: {
    name: 'MindMap AI', tagline: '让文档，长成一张图', featured: true,
    category: 'AI · 文档与思维导图', headline: '让一份文档，\n长成一张图。',
    description: '粘贴文字、上传 PDF 或放入链接，让内容的结构逐渐展开，再继续编辑和整理自己的思路。',
    facts: ['把长内容整理为思维导图', '生成后，继续编辑与重组'],
    image: 'assets/mindmap-poster.jpg', imageAlt: 'MindMap AI 已有产品视频中的思维导图界面', imageWidth: 1280, imageHeight: 640,
    icon: 'assets/mindmap-mark.svg', video: '../../mindmap-demo.mp4',
    href: '../../index%20mindmap.html', background: '#f8f1e5'
  },
  wtd: {
    name: 'WidgetToDo', tagline: '今日待办，留在眼前', featured: true,
    category: 'macOS · Notion 桌面小组件', headline: '让今日待办，\n留在眼前。',
    description: '把 Notion 待办与日记放在桌面。今天要做的事，和想记下的一句话，都有自己的位置。',
    facts: ['待办与日记，随时切换', '改动同步回 Notion'],
    image: 'assets/wtd.jpg', imageAlt: 'WidgetToDo 桌面待办的现有界面演示', imageWidth: 400, imageHeight: 530,
    icon: '../wtd-app-icon.png', demo: '../embed-wtd.html',
    href: '../../index-notion.html', background: '#efece5'
  }
};
const productOrder = Object.keys(products);

(() => {
  const overview = document.querySelector('.overview');
  const dock = document.querySelector('.dock');
  const tabs = document.querySelector('.detail-tabs');
  const layoutPreview = document.body.dataset.layoutPreview === 'true';
  const carouselPreview = document.body.dataset.carouselPreview === 'true';
  const fanPreview = document.body.dataset.fanPreview === 'true';
  const scenarios = [4, 6, 7, 8, 9];
  const requestedCount = Number(new URLSearchParams(location.search).get('count'));
  const count = layoutPreview
    ? Math.max(productOrder.length, scenarios.includes(requestedCount) ? requestedCount : fanPreview ? productOrder.length : 9)
    : productOrder.length;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function chrome(name, index, interactive) {
    const bar = element('span', 'window-chrome');
    bar.setAttribute('aria-hidden', 'true');
    const dots = element('span', 'window-dots');
    dots.append(element('i'), element('i'), element('i'));
    const action = element('span', 'window-action');
    action.append(element('span', 'window-index', String(index + 1).padStart(2, '0')));
    if (interactive) action.append(element('span', 'window-open', '打开 ↗'));
    bar.append(dots, element('span', 'window-title', name), action);
    return bar;
  }

  function card(id, index) {
    const product = products[id];
    const button = element('button', `project project-${id}`);
    button.type = 'button';
    button.dataset.open = id;
    button.setAttribute('aria-label', `打开 ${product.name} 预览`);
    button.style.setProperty('--project-bg', product.background);
    const image = element('img');
    image.src = product.image;
    image.alt = product.imageAlt;
    image.width = product.imageWidth;
    image.height = product.imageHeight;
    image.decoding = 'async';
    if (index > 5) image.loading = 'lazy';
    const visual = element('span', 'project-visual');
    visual.append(image);
    const frame = element('span', 'project-image');
    frame.append(chrome(product.name, index, true), visual);
    const title = element('span');
    title.append(element('strong', '', product.name), element('small', '', product.tagline));
    const arrow = element('span', 'open-arrow', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    const caption = element('span', 'project-caption');
    caption.append(title, arrow);
    button.append(frame, caption);
    return button;
  }

  function placeholder(index) {
    const number = String(index + 1).padStart(2, '0');
    const item = element(fanPreview ? 'button' : 'article', 'project project-placeholder');
    if (fanPreview) item.type = 'button';
    const frame = element('span', 'project-image');
    const visual = element('span', 'project-visual placeholder-visual');
    const serial = element('span', 'placeholder-number', number);
    serial.setAttribute('aria-hidden', 'true');
    visual.append(serial, element('span', 'placeholder-note', '未来作品的位置'));
    frame.append(chrome(`展示位置 ${number}`, index, false), visual);
    const title = element('span');
    title.append(element('strong', '', `新增作品 ${number}`), element('small', '', '排布占位'));
    const caption = element('span', 'project-caption');
    caption.append(title);
    item.append(frame, caption);
    return item;
  }

  overview.replaceChildren(...productOrder.map(card));
  for (let index = productOrder.length; index < count; index++) overview.append(placeholder(index));
  overview.dataset.layout = fanPreview ? 'fan' : carouselPreview ? 'carousel' : count > 4 ? 'collection' : 'scattered';
  overview.dataset.count = String(count);
  overview.dataset.tailThree = String(count % 3);
  overview.dataset.tailTwo = String(count % 2);
  overview.setAttribute('aria-label', layoutPreview ? `${count}个作品展示位置` : `${count}款作品的窗口总览`);
  document.querySelector('.explore-hint').textContent = layoutPreview ? `${count}个展示位置` : `${count}款作品`;

  const overviewButton = element('button', 'dock-overview', '总览');
  overviewButton.type = 'button';
  overviewButton.dataset.overview = '';
  overviewButton.setAttribute('aria-label', '回到全部作品');
  const divider = element('span', 'dock-divider');
  divider.setAttribute('aria-hidden', 'true');
  const featured = productOrder.filter(id => products[id].featured).slice(0, 4);
  dock.replaceChildren(overviewButton);
  if (featured.length) dock.append(divider);
  featured.forEach(id => {
    const product = products[id];
    const button = element('button', 'dock-item');
    button.type = 'button';
    button.dataset.open = id;
    button.dataset.tip = product.tagline;
    button.setAttribute('aria-label', `从 Dock 打开 ${product.name}`);
    const icon = element('img');
    icon.src = product.icon;
    icon.alt = '';
    icon.width = icon.height = 42;
    if (id === 'mindmap') {
      const badge = element('span', 'mindmap-icon');
      badge.append(icon);
      button.append(badge);
    } else button.append(icon);
    button.append(element('span', '', product.name));
    dock.append(button);
  });

  tabs.replaceChildren(...productOrder.map(id => {
    const button = element('button', '', products[id].name);
    button.type = 'button';
    button.dataset.open = id;
    button.setAttribute('aria-pressed', 'false');
    return button;
  }));
  tabs.dataset.extended = String(productOrder.length > 4);

  if (layoutPreview) {
    document.querySelectorAll('[data-count-choice]').forEach(link => {
      if (Number(link.dataset.countChoice) === count) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
})();
