# MindMap AI 代码演示

入口：`../embed-mindmap.html`。约 43.6 秒循环（1.1 倍速），由本地 HTML、CSS、SVG 与 JavaScript 绘制，无构建步骤和运行时外部依赖。

## 真实代码来源

已只读检查本机 `/Users/chenxiaofeng/Documents/Tare code file/MindMap/mindmap-mvp` 的实际应用，未改动产品仓库。

| 产品源码 | 本演示采用的内容 |
| --- | --- |
| `app/page.tsx` | 真实首页的品牌、标题、输入区域结构 |
| `app/globals.css` | 原始界面样式，完整保存在 `product.css`；仅增加来源说明 |
| `components/generate-form.tsx` | 文本、URL、PDF 标签与“开始生成”操作 |
| `components/editor-page.tsx` | 生成 → 编辑 → 保存 → 导出的工作流程 |
| `components/editor-toolbar.tsx` | 保存状态、编辑工具、Markdown / PNG 导出菜单 |
| `components/mindmap-editor.tsx` | 节点层级、选中态、行内编辑与拖动归类反馈 |
| `lib/utils/g6.ts` | 根节点、一级/二级节点的尺寸层级、暖色配色与圆角 |

`source-manifest.json` 记录读取日期和以上源文件的 SHA-256。演示中的 DOM 是对真实 React 组件的静态适配，图形是依照真实 G6 样式绘制的 SVG。它不是直接运行 Next.js/G6 应用。

## 操作顺序

| 时间 | 用户操作与可见反馈 |
| --- | --- |
| 0–6.5s | 进入文本模式，粘贴示例文章，点击“开始生成” |
| 6.5–13.6s | 进入编辑器，根节点、三个分支与细节逐步出现，摘要展开 |
| 13.6–19.1s | 双击“异步沟通”，输入“用短视频替代会议”，确认修改 |
| 19.1–24.1s | 选中“长期积累”，按 Tab，新增“每周复盘一次” |
| 24.1–30.9s | 按住“保护专注时间”，拖到“工作方法”；显示落点并改变连线归属 |
| 30.9–39.5s | 点击保存，未保存状态复原；打开导出菜单并选择 Markdown，显示示例导出结果 |
| 39.5–43.6s | 展示整理后的完整导图，然后重置并循环 |

内容来自产品仓库现有“产品经理是不公平的岗位”材料的演示性概括，画面持续标注“操作演示 · 示例内容”。输入、AI 生成、保存与导出均为确定性模拟；不会调用付费接口、修改用户文件、下载文件或写入产品服务。PNG 是真实产品导出菜单中的选项，本段自动流程选择 Markdown。

节奏微调：整体比初版快 10%，保留各步骤的相对停留时间；内部仍使用 48 秒编排时轴，进度条和无障碍时间显示使用实际播放秒数。

## 文件与接入

- `product.css`：真实产品样式快照。
- `demo.css`：内嵌舞台、窄屏适配和播放控制。
- `demo.js`：单一时间轴；向前、向后拖动均重建对应画面状态。
- `source-manifest.json`：来源与校验值。
- 首页 `catalog.js` 的 MindMap 使用 `demo`，不再使用 `video`。
- `index mindmap.html`、`index-mindmap.html` 的原视频元素替换为同一个演示 iframe。
- `portfolio-demos/demo-a-macos-desktop.html` 由首页同步脚本更新。

暂停、继续、重播、六个章节入口和进度条均可操作。首次打开自动播放，系统要求减少动态效果时默认停在整理完成的导图，用户可以主动播放。切换/关闭首页详情会移除 iframe；标签页隐藏与产品页离开演示区域时暂停。父页面可以通过同源 `postMessage` 发送 `{type:'mindmap-demo',action:'play'|'pause'|'restart'}`。

原 `mindmap-demo.mp4` 留作存档，正式首页和两个 MindMap 产品页已无播放引用。历史设计预览不属于本次修改范围。

## 验证记录

本地验收及已知边界见 `verification.md`。交付状态以 Git 提交与 GitHub Pages 流水线为准。
