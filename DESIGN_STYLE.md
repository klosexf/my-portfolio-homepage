# UI 设计风格体系 · Xiaofeng 作品集

> 定位：**近黑画廊 + 超大展示字 + 冷调渐变 + 产品色点亮**
> 画廊黑底之上，Kanit 超粗展示字做视觉主角，界面元素退为细雾白描边，
> 每个产品用自己的品牌色作为局部点亮——页面本质是"产品动画的展柜"。
>
> 配套代码：[`src/theme.ts`](./src/theme.ts)（本文档所有数值均已 token 化，可直接 import）

---

## 0. 六条核心法则（先记规则，再看数值）

1. **禁纯白** —— 文字与描边永远用雾白 `#D7E2EA`，靠透明度分层，不靠新色板
2. **一色到底** —— 产品色 = 边框 / 编号 / 圆点 / 光晕四件套，颜色即品牌导航
3. **紧的大字，松的小字** —— 展示字 `tracking-tight` + vw 流体；注脚 `tracking-widest` + clamp
4. **默认零阴影** —— 形体靠 2px 描边定义，只有"激活态"才发光
5. **统一动效性格** —— 入场 `[0.25,0.1,0.25,1]`，弹入 `spring 260/28`，全站不另起曲线
6. **渐变只给转化点** —— 全站唯一彩色渐变留给「联系我」按钮

---

## 1. 色彩

### 1.1 基础层（灰阶）

| 角色 | Token | 值 | 用法 |
|---|---|---|---|
| 画布底色 | `colors.canvas` | `#0C0C0C` | body / main / section 统一 |
| 卡片底 | `colors.surface` | `#101014` | 轮播卡，比画布提亮一档 |
| 主文字/描边 | `colors.ink` | `#D7E2EA` | 冷调雾白 |
| 弱化文字 | `colors.inkMuted` | `ink / 60%` | 标语、说明 |
| 极弱文字 | `colors.inkFaint` | `ink / 50%` | 类别小标、页脚 |
| 非激活描边 | `colors.line` | `ink / 13%` | 卡片默认边框 |

### 1.2 渐变（仅两处）

| 用途 | 值 |
|---|---|
| 展示字 `.hero-heading` | `linear-gradient(180deg, #646973 0%, #bbccd7 100%)` 背景裁切 |
| 转化按钮「联系我」 | `linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)` + 白色内描边 |

### 1.3 产品主题色（点亮层）

| 产品 | accent | 衍生规则 |
|---|---|---|
| Repaste | `#8B6BFF` 紫 | 光晕 `accent+66`、浅底 `accent+22` |
| Readless | `#4F8CFF` 蓝 | 同上 |
| WidgetToDo | `#9C7350` 棕 | 同上 |

规则：产品色只出现在**该产品的卡片边框（激活态）、编号、Visit 按钮描边、圆点导航、光晕**五处；演示屏内部 UI 可用同色系深/浅变体（见 `productThemes[].ui`）。

### 1.4 演示屏专用（macOS 语境）

红绿灯三色 `#FF5F57 / #FEBC2E / #28C840` 仅用于模拟窗口标题栏；
WidgetToDo 演示屏例外使用浅色纸面底（还原产品真实气质）。

---

## 2. 字体

- **全站唯一字体 Kanit**（Google Fonts，300–900 全字重），中文走系统回退混排
- 双极字重：**900** 给 Hero 标题与项目编号；**300–600** 给一切正文；不用 800

| 字阶 | Token | 尺寸 | 字重 | 字距 |
|---|---|---|---|---|
| Hero 大标题 | `typography.hero` | `13vw → lg:16vw` | 900 | tight |
| 项目编号 | `typography.number` | `clamp(2.5rem, 6vw, 5rem)` | 900 | tight |
| 产品/区块标题 | `typography.title` | `clamp(1.2rem, 2.6vw, 2.2rem)` | 600 | normal |
| 注脚/按钮/徽章 | `typography.caption` | `clamp(0.8rem, 1.4vw, 1.4rem)` | 300–500 | widest |
| 导航链接 | `typography.nav` | `text-sm → md:text-lg` | 500 | wider |

---

## 3. 形状与描边

| 元素 | 规格 |
|---|---|
| 轮播卡片 | `rounded-[28px] → sm:rounded-[40px]` + `border-2` |
| 演示屏 | `rounded-3xl` |
| 按钮 / 圆点 / 徽章 | 全胶囊 `rounded-full` |
| 描边 | 统一 2px；默认态 `ink/13%`，激活态产品色 |
| 阴影 | 默认无；激活卡片 `0 24px 80px -30px accent66`（`glow()`） |

同心圆角逻辑：外层大圆角（40px）→ 内层小圆角（屏 24px、控件 8–12px）。

---

## 4. 空间与版式

| 规则 | 值 |
|---|---|
| 全站水平边距 | `px-6 md:px-10` |
| 内容容器 | `max-w-6xl mx-auto` |
| Hero 高度 | `46vh`（min 340px）——**刻意让首屏露出第一张轮播卡** |
| 轮播卡宽 | `86vw / max 860px`，`snap-center` 居中吸附，两侧露边形成画廊纵深 |
| 演示屏高度 | `240 / 300 / 360px` 三档响应 |
| 层级表达 | 靠留白 + 描边，不靠色块分区 |

---

## 5. 动效

### 5.1 两种入场 + 一条时间线

- **页面元素**：统一 `FadeIn` 组件 —— `opacity 0→1 + y 30→0`，0.7s，`[0.25,0.1,0.25,1]`，`whileInView once`
- **delay 阶梯**：导航 0s → 标题 0.15s → 文案 0.35s → 按钮 0.5s（`motion.fadeInStagger`）
- **产品演示**：`usePhaseLoop(phases)` 相位时间线，毫秒数组驱动无限循环

### 5.2 曲线性格（只有三种）

| 场景 | 参数 |
|---|---|
| 面板落下 / 播放条滑入 | `spring { stiffness 260, damping 28 }` |
| 键帽等轻弹元素 | `spring { stiffness 300, damping 20 }` |
| FLIP 列表重排 | `spring { stiffness 350, damping 30 }` |
| 光标巡游 | `cubic-bezier [0.4, 0, 0.2, 1]`，0.6–0.7s |

### 5.3 签名微动画

- 光标巡游 + 点击 `scale(.8)` 按压反馈
- `stroke-dashoffset` 描边画勾
- 输入光标 `opacity [1,0] reverse` 0.5s 闪烁
- 列表 48ms stagger 入场
- 轮播：原生 `scroll-snap` + `scrollTo smooth`，桌面滚轮转横滑

---

## 6. 组件配方（`recipes`）

| 组件 | 规格 |
|---|---|
| 轮播卡片 | 编号（产品色 900 字）+ 类别（ink/50 widest）+ 产品名 + 「访问产品 ↗」+ 标语 + 演示屏；整卡 `<a>` 新窗口跳转 |
| 幽灵胶囊按钮 | `border-2` 产品色描边 + 产品色文字 + `hover:bg-white/5` |
| 圆点导航 | 当前项拉宽 32px 染产品色；其余 10px `ink/33%` |
| 箭头按钮 | 48px 圆形 `border-2 ink`，禁用态 `opacity-25` |
| 联系按钮 | 全站唯一渐变（见 1.2） |

---

## 7. 禁忌清单（Don't）

- ❌ 纯白 `#FFF` 文字、纯灰 `#808080` 分层
- ❌ 产品色用在非该产品元素上
- ❌ 默认态加阴影 / 光晕
- ❌ 新起缓动曲线、新加字体
- ❌ 第二个彩色渐变
- ❌ 小字用 tight 或大字用 widest（字距与字号必须反向）

---

## 8. 快速上手

```tsx
import { colors, productThemes, recipes, spring, motion, typography, spacing } from './theme'

// 卡片
const { className, style } = recipes.card(isActive, productThemes.repaste.accent)

// 入场动画统一参数
<motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
  transition={{ duration: motion.fadeInDuration, ease: [0.25, 0.1, 0.25, 1] }} />
```

> 新增产品时：在 `productThemes` 加一条（accent + ui 色板），
> 卡片、圆点、光晕、按钮描边会自动获得该产品的完整色彩身份。
