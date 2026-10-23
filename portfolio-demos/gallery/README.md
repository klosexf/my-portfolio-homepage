# Xiaofeng 作品展厅

正式入口为仓库根目录的 `index.html`；本目录保存它使用的展厅样式、交互、产品目录和音乐。`portfolio-demos/demo-a-macos-desktop.html` 是同步保留的旧入口。

访客点击进入后经过走廊过渡，横向浏览五款产品。当前作品自动演示，展开和返回共用同一个播放层。展签展示产品名称、类别和一句话简介。底部导航整合箭头、产品切换、位置与全部作品入口，总览采用响应式网格并保留当前作品位置。

墙面、地面及画框使用当前产品的品牌色。音乐开启后带动轻微呼吸光效，连续能量权重0.12、柔和重拍权重0.11，强度上限0.23；起亮120ms、回落250ms，重拍间隔至少420ms。关闭音乐、打开详情、进入总览、布局过渡或减少动态效果时停止律动。保留原有音乐偏好。

资源从脚本自身地址计算站点根目录，兼容 GitHub Pages 项目路径。用户提供的音乐保存在 `assets/amnesia.mp3`，页面进入前不播放，离开展厅暂停，再进入继续。

修改首页或运行文件后，在仓库根目录执行：

```sh
python3 scripts/sync-homepage.py
python3 scripts/sync-homepage.py --check
python3 scripts/check-gallery-assets.py
node tests/gallery/check-motion.cjs
node tests/gallery/check-upgrade-lifecycle.cjs
node tests/gallery/check-music-lifecycle.cjs
```

GitHub Pages 的现有工作流检查入口同步、资源完整性和交互回归，再发布 `main`。设计探索、临时截图与性能采样保留在本地，不属于发布文件。
