# UIpicks · 作品集交互演示

产品：[UIpicks](https://www.uipicks.top/)；源码：[klosexf/design-website](https://github.com/klosexf/design-website)。

## 前端提取结论

UIpicks 是原生 HTML / CSS / JavaScript 网站。仓库根目录的 `index.html` 是本地快捷跳转；`vercel.json` 的正式发布目录为 `outputs/ui-reference-prototype/`。

| 原项目文件 | 职责 | 本次提取与适配 |
| --- | --- | --- |
| `index.html` | 侧栏、搜索、资源列表、需求筛选及预览弹窗的页面骨架 | 提炼为 `../embed-uipicks.html`，保留原有界面信息关系 |
| `styles.css`、`shelf-ui.css` | 白色界面、中性配色、品牌、侧栏与资源卡片 | 提取设计规则，适配为 `demo.css`，为作品集内嵌窗口补充响应式布局 |
| `reference-finder.css`、`reference-finder.js` | 按产品官网、布局和风格找具体参考 | 保留“同时满足所选条件”的过滤逻辑与布局、风格选项 |
| `app.js` | 资源分类、搜索、预览与收藏交互 | 在 `demo.js` 中实现对应的小范围可操作演示 |
| `catalog.js` | 已收录资源的名称、分类、用途、代码能力、图片及原站地址 | 精选六个网站，保存到 `data.js` |
| `homepage-choice-data.js` | 页面布局、风格及图片证据 | 精选四个已标注的真实官网案例，保留 ID、来源地址、标签和日期 |
| `assets/uipicks-mark.svg` | UIpicks 原始品牌标识 | 原样复制至 `../homepage/assets/uipicks-mark.svg` |

分析与提取使用本机对应仓库的当前文件快照。本地 HEAD 为 `78ac9eae88b2e328322c3d9044fe0710f5e2ede4`，这不是远端最新版本核验。每份原输入及原样复制图片的 SHA-256 记录在 `source-manifest.json`，用于确定实际提取内容。

## 演示文件

- `../embed-uipicks.html`：可独立打开的演示入口，同时作为首页产品详情的 iframe。
- `demo.css`：产品界面样式和桌面 / 窄屏适配。
- `demo.js`：真实可操作的分类、搜索、代码能力筛选、布局 / 风格组合、预览、收藏与自动播放。
- `data.js`：从原目录提取的六个网站和四个具体案例。
- `assets/`：原项目已经保存的十张参考图片，未引入新的外部图片请求。
- `../homepage/assets/uipicks-poster.svg`：使用相同原图与界面信息绘制的卡片封面；它是演示封面，不是线上截图。

在首页目录运行本地静态预览服务后，打开 `/index.html#uipicks` 或 `/portfolio-demos/embed-uipicks.html`。所有路径也兼容 GitHub Pages 的仓库子路径；旧首页入口由 `scripts/sync-homepage.py` 同步。

## 交互与动画

32.5 秒循环：浏览资源 → UI 组件库 → 可提供代码 → 产品官网 → 居中布局与深色 → LookAway 预览 → 收藏 → 我的收藏。原站截图和具体案例均保留出处；点击“查看原始参考”或产品介绍的“访问产品页”可进入对应网站。

直接点击、输入或使用键盘会接管并暂停自动演示。底部支持暂停 / 继续、重播和章节跳转；浏览器标签隐藏时暂停计时。系统偏好减少动效时，初始为手动模式，可主动播放。

收藏仅存在于当前演示的内存，重播会清空演示收藏。它不连接正式站点的收藏存储。案例是已收录画面的快照；参考资源的实际内容、权限和获取条件以原站为准。这里重点展示资源聚合与查找流程，AI 使用指南仍位于完整产品内。

## 首页接入

`../homepage/catalog.js` 增加 `uipicks`，位于 MindMap AI 与 WidgetToDo 之间。首页共五张卡片；Dock 沿用原有四个精选快捷入口。卡片序号、键盘浏览、详情标签和原有转场使用既有逻辑。首页介绍和元信息已补充 UIpicks。

内嵌预览先处理自己的 Escape，首页仅在 Escape 未被处理时返回作品总览。关闭产品会销毁 iframe，从而释放动画与演示收藏。
