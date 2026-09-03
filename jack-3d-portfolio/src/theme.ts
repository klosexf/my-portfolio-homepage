/* ============================================================
 * Xiaofeng 作品集 · 设计主题文件（Design Tokens）
 * 风格定位：近黑画廊 + 超大展示字 + 冷调渐变 + 产品色点亮
 *
 * 核心规则：
 * 1. 文字永远用雾白 #D7E2EA + 透明度分层，禁用纯白
 * 2. 产品色 = 边框 / 编号 / 圆点 / 光晕四件套，一色到底
 * 3. 大字 tracking-tight 用 vw，小字 tracking-widest 用 clamp
 * 4. 默认零阴影，只有"激活态"才发光
 * 5. 入场统一 EASE.standard，弹入统一 SPRING.panel
 * 6. 全站唯一渐变给转化按钮（CONTACT_GRADIENT）
 * ============================================================ */

/* ---------- 色彩 ---------- */
export const colors = {
  /** 画布底色（body / main / section 统一） */
  canvas: '#0C0C0C',
  /** 卡片底：比画布提亮一档 */
  surface: '#101014',
  /** 主文字 / 描边：冷调雾白，永不用纯白 */
  ink: '#D7E2EA',
  /** 弱化文字透明度分层（ink 的派生，不另设色板） */
  inkMuted: 'rgba(215,226,234,0.6)',
  inkFaint: 'rgba(215,226,234,0.5)',
  /** 非激活描边 */
  line: 'rgba(215,226,234,0.13)',
  /** 演示屏内的 macOS 红绿灯 */
  trafficRed: '#FF5F57',
  trafficYellow: '#FEBC2E',
  trafficGreen: '#28C840',
} as const

/** 展示字渐变（.hero-heading：背景裁切文字） */
export const headingGradient = 'linear-gradient(180deg, #646973 0%, #bbccd7 100%)'

/** 转化按钮专用渐变（全站唯一渐变） */
export const contactGradient =
  'linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)'

/* ---------- 产品主题色（颜色即品牌导航） ---------- */
export interface ProductTheme {
  /** 品牌色：边框高亮 / 编号 / 圆点 / 光晕 */
  accent: string
  /** 演示屏内的界面色板 */
  ui: {
    /** 面板主色（选中态、强调条） */
    primary: string
    /** 次级元素色 */
    secondary: string
    /** 演示屏背景 */
    screenBg: string
  }
}

export const productThemes: Record<'repaste' | 'readless' | 'widgettodo', ProductTheme> = {
  repaste: {
    accent: '#8B6BFF',
    ui: { primary: '#8B6BFF', secondary: '#4FD47F', screenBg: 'linear-gradient(180deg,#111118 0%, #0b0b11 45%, #08080d 100%)' },
  },
  readless: {
    accent: '#4F8CFF',
    ui: { primary: '#4F8CFF', secondary: '#FFB45E', screenBg: 'linear-gradient(180deg,#12141c 0%, #0c0e14 100%)' },
  },
  widgettodo: {
    accent: '#9C7350',
    ui: { primary: '#9C7350', secondary: '#3FAE52', screenBg: 'linear-gradient(135deg,#EAEAE8 0%, #F1F0EE 50%, #E4E4E0 100%)' },
  },
}

/** 产品色衍生：hex + 透明度后缀（如 accentWith('#8B6BFF', '66')） */
export const accentWith = (accent: string, alpha: string) => `${accent}${alpha}`

/* ---------- 字体 ---------- */
export const fonts = {
  /** 全站唯一字体（Kanit 300-900，中文走系统回退） */
  display: 'Kanit, sans-serif',
  weights: { light: 300, regular: 400, medium: 500, semibold: 600, bold: 700, black: 900 },
} as const

/** 字阶：大字用 vw 流体，小字用 clamp —— "紧的大字，松的小字" */
export const typography = {
  /** Hero 超大标题 */
  hero: { size: 'text-[13vw] sm:text-[14vw] md:text-[15vw] lg:text-[16vw]', weight: fonts.weights.black, tracking: 'tracking-tight' },
  /** 项目编号 01/02/03 */
  number: { fontSize: 'clamp(2.5rem, 6vw, 5rem)', weight: fonts.weights.black },
  /** 区块 / 产品标题 */
  title: { fontSize: 'clamp(1.2rem, 2.6vw, 2.2rem)', weight: fonts.weights.semibold, tracking: 'tracking-normal' },
  /** 注脚 / 按钮 / 徽章（配 tracking-widest） */
  caption: { fontSize: 'clamp(0.8rem, 1.4vw, 1.4rem)', weight: fonts.weights.light },
  /** 导航链接 */
  nav: { size: 'text-sm md:text-lg', weight: fonts.weights.medium, tracking: 'tracking-wider' },
} as const

/* ---------- 形状 ---------- */
export const radii = {
  /** 轮播卡片 */
  card: 'rounded-[28px] sm:rounded-[40px]',
  /** 演示屏 */
  screen: 'rounded-3xl',
  /** 按钮 / 圆点 / 徽章 */
  pill: 'rounded-full',
  /** 描边宽度：2px 描边定义形体，默认零阴影 */
  border: 'border-2',
} as const

/** 激活态光晕（默认无阴影，激活才发光） */
export const glow = (accent: string) => `0 24px 80px -30px ${accentWith(accent, '66')}`

/* ---------- 空间 ---------- */
export const spacing = {
  /** 全站水平边距 */
  gutter: 'px-6 md:px-10',
  /** 内容容器 */
  container: 'max-w-6xl mx-auto',
  /** Hero 高度：刻意露出首屏轮播 */
  heroHeight: 'h-[46vh] min-h-[340px]',
  /** 轮播卡：86vw 居中吸附，两侧露边形成画廊纵深 */
  carouselCard: 'w-[86vw] max-w-[860px] snap-center shrink-0',
  /** 演示屏高度三档 */
  demoHeight: 'h-[240px] sm:h-[300px] md:h-[360px]',
} as const

/* ---------- 动效 ---------- */
export const ease = {
  /** 页面入场统一曲线 */
  standard: [0.25, 0.1, 0.25, 1] as const,
  /** 光标巡游等位移动画 */
  glide: [0.4, 0, 0.2, 1] as const,
} as const

export const spring = {
  /** 面板落下 / 播放条滑入 */
  panel: { type: 'spring', stiffness: 260, damping: 28 } as const,
  /** 键帽等轻弹元素 */
  pop: { type: 'spring', stiffness: 300, damping: 20 } as const,
  /** FLIP 列表重排 */
  layout: { type: 'spring', stiffness: 350, damping: 30 } as const,
} as const

export const motion = {
  /** FadeIn 统一时长（s） */
  fadeInDuration: 0.7,
  /** 入场 delay 阶梯（s）：导航 → 标题 → 文案 → 按钮 */
  fadeInStagger: [0, 0.15, 0.35, 0.5] as const,
  /** 列表错峰（s） */
  listStagger: 0.048,
  /** 光标闪烁 */
  caretBlink: { duration: 0.5, repeat: Infinity, repeatType: 'reverse' } as const,
} as const

/* ---------- 组件配方（className 速查） ---------- */
export const recipes = {
  /** 幽灵胶囊按钮：描边取产品色，hover 提亮 */
  ghostPill: (accent: string) => ({
    className: `${radii.pill} ${radii.border} px-5 py-2 sm:px-7 sm:py-2.5 text-xs sm:text-sm font-medium tracking-widest transition-colors group-hover:bg-white/5`,
    style: { borderColor: accent, color: accent },
  }),
  /** 轮播卡片容器 */
  card: (isActive: boolean, accent: string) => ({
    className: `${radii.card} ${radii.border} p-4 sm:p-6 md:p-7 transition-all duration-300`,
    style: {
      borderColor: isActive ? accent : colors.line,
      background: colors.surface,
      boxShadow: isActive ? glow(accent) : 'none',
    },
  }),
  /** 轮播圆点：当前项拉宽成胶囊并染产品色 */
  dot: (isActive: boolean, accent: string) => ({
    className: 'h-2.5 rounded-full transition-all duration-300',
    style: { width: isActive ? 32 : 10, background: isActive ? accent : accentWith(colors.ink, '33') },
  }),
} as const
