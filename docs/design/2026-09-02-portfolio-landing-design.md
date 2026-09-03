# Xiaofeng 作品集落地页 · 设计文档

> 状态：已确认（2026-09-02）
> 交付物：`portfolio.html`（单文件，零构建、零 npm 依赖，双击即开）
> 风格依据：[`DESIGN_STYLE.md`](../../DESIGN_STYLE.md) · token 参照 [`jack-3d-portfolio/src/theme.ts`](../../jack-3d-portfolio/src/theme.ts)

---

## 0. 决策记录

| 决策点 | 结论 |
|---|---|
| 起点形态 | 全新单文件 HTML（不升级现有 React 工程） |
| 页面结构 | 精简三段式：Hero → 作品画廊 → 联系 |
| 产品嵌套 | 内嵌纯 CSS/JS 重写的循环动画演示，点击卡片新窗口跳 GitHub |
| 设计方向 | 方案 A（画廊轮播）为主干 + 方案 B 元素（演示屏 macOS 红绿灯标题栏） |
| 外部依赖 | 仅 Google Fonts CDN（Kanit 300–900）；不引 Framer Motion / GSAP |

## 1. 技术架构

单文件三段结构：

1. `<style>`：CSS 变量落地全部设计 token（色彩/字阶/圆角/间距/曲线），组件样式按"配方"组织
2. `<body>`：语义化区块 `<nav> / <section id="projects"> / <footer id="contact">`
3. `<script>`：约 150 行原生 JS —— 相位循环引擎 + 轮播控制 + 入场观察器

### 1.1 相位循环引擎（复刻 usePhaseLoop）

```js
function phaseLoop(el, phases) { /* rAF 驱动，按毫秒数组无限循环，
  每帧计算当前相位 p 写入 el.dataset.phase，CSS 属性选择器驱动视觉 */ }
```

演示内部所有状态（面板开合、高亮、进度）用 `[data-phase="…"]` / `[data-phase-min="…"]` CSS 选择器表达，JS 不直接操作样式。

### 1.2 入场动画（复刻 FadeIn）

IntersectionObserver 一次性触发：`opacity 0→1 + translateY 30→0`，0.7s，`cubic-bezier(0.25,0.1,0.25,1)`；delay 阶梯 0 / 0.15 / 0.35 / 0.5s。

### 1.3 轮播

原生 `scroll-snap`（x / mandatory / center）+ 桌面端 wheel 转横滑 + `scrollTo({behavior:'smooth'})`；滚动反算当前索引，同步圆点与箭头禁用态；非激活卡 `opacity` 压暗。

## 2. 设计 token（CSS 变量）

- `--canvas:#0C0C0C` `--surface:#101014` `--ink:#D7E2EA`（+60%/50%/13% 派生）
- 产品色：Repaste `#8B6BFF`、Readless `#4F8CFF`、WidgetToDo `#9C7350`（边框/编号/圆点/光晕四件套）
- 渐变仅两处：hero 文字 `180deg #646973→#bbccd7`（背景裁切）、联系按钮 `123deg #18011F→#B600A8→#7621B0→#BE4C00` + 白色内描边
- 字阶：hero `13→16vw/900/tight`；编号 `clamp(2.5rem,6vw,5rem)/900`；标题 `clamp(1.2rem,2.6vw,2.2rem)/600`；注脚 `clamp(0.8rem,1.4vw,1.4rem)/300–500/widest`
- 形状：卡 `28→40px` 圆角 + 2px 描边；屏 `24px`；控件全胶囊；默认零阴影，激活 `0 24px 80px -30px accent66`
- 空间：水平 `24→40px`；容器 `max-width:1152px`；Hero `46vh/min 340px`；卡宽 `86vw/max 860px`；演示屏高 `240/300/360px`

## 3. 区块规格

### 3.1 Hero
- 顶部导航「作品 / 联系」（雾白 500 字重 wider）
- 超大展示字「你好，我是 xiaofeng」，`overflow:hidden` 遮罩上滑入场
- 左下：「独立开发者 · 打造人们喜爱的原生 macOS 应用」
- 右下：渐变「联系我」胶囊（hover `scale 1.05`）
- 46vh 高度刻意露出第一张轮播卡边缘

### 3.2 作品画廊（3 卡）
卡内布局（与 React 版一致）：编号（产品色 900）+ 类别（ink/50 widest）+ 产品名 + 「访问产品 ↗」幽灵胶囊 + 标语 + 演示屏。整卡 `<a target="_blank">`：
- 01 Repaste · `https://github.com/klosexf/Repaste`
- 02 Readless · `https://github.com/klosexf/readless`
- 03 WidgetToDo · `https://github.com/klosexf/WidgetToDo`

**红绿灯元素**：每个演示屏顶部加 macOS 窗口标题栏（`#FF5F57/#FEBC2E/#28C840` + 产品名），WidgetToDo 浅色纸面屏同样适用。

**演示编舞**（提炼自三个产品落地页）：
- Repaste 10 相 `[1400,500,650,900,900,1300,600,600,1200,1600]`：光标→刘海涟漪→面板 spring(260/28) 落下→3 项 stagger 48ms→搜索「发布」+光标闪烁→关键词高亮/非匹配项收起→点击选中(scale .97)→面板收起→编辑器粘贴
- Readless 10 相 `[1300,900,700,700,1200,1200,1400,900,700,1500]`：三句逐句选中→⌥R 键帽 spring(300/20) 弹入→播放条 spring 滑入→进度推进+当前句高亮+菜单栏波形→暂停→停止收起
- WidgetToDo 8 相 `[1300,800,700,900,700,600,1800,1400]`：勾选描边画勾(stroke-dashoffset)→FLIP 沉底(删除线+置灰)→飞点划向 Notion 徽章→徽章脉冲→切日记 tab→打字+光标闪烁

### 3.3 联系/页脚
- 居中「联系我」大按钮（`mailto:694755267@qq.com`）+ GitHub 入口（`https://github.com/klosexf`）
- 版权行「© 2026 Xiaofeng · 独立开发者」（ink/50 widest）

## 4. 响应式与无障碍

- 断点 640 / 768 / 1024px；移动端轮播保留横滑，演示屏 240px
- `prefers-reduced-motion: reduce` → 停循环、入场直接可见、smooth 转 auto
- 语义标签、`aria-label`、圆点/箭头键盘可达、`focus-visible` 描边

## 5. 验收清单

- [ ] 双击打开无任何控制台错误
- [ ] 六条核心法则逐条满足（禁纯白/一色到底/字距反向/零阴影/统一曲线/唯一渐变）
- [ ] 3 个演示无限循环流畅，切卡后动画仍同步
- [ ] 轮播：拖拽、滚轮横滑、圆点、箭头、键盘全部可用
- [ ] 卡片点击新窗口打开对应 GitHub
- [ ] 移动端（375px）与桌面（1440px）布局正确
- [ ] 减弱动效模式下静态可读
