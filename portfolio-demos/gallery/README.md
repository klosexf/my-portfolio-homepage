# Xiaofeng 作品展厅

正式入口为仓库根目录的 `index.html`；本目录保存它使用的展厅样式、交互、产品目录和音乐。`portfolio-demos/demo-a-macos-desktop.html` 是同步保留的旧入口。

访客点击进入后经过走廊过渡，横向浏览五款产品。当前作品自动演示，展开和返回共用同一个播放层。展签仅展示产品名称与类别；右上只保留音乐开关，地面及背景律动随音乐开启，并遵循系统减少动态效果设置。

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
