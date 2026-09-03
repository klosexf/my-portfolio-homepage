import { motion } from 'framer-motion'
import { usePhaseLoop } from './usePhaseLoop'

/*
 * Repaste 核心演示（提炼自 landing-repaste.html）：
 * 光标滑到刘海停留 → 面板以弹簧曲线落下（translateY -103% → 0, 0.55s）
 * → 列表卡片 48ms stagger 入场 → 搜索输入 + 关键词高亮 →
 * 点击卡片（紫色脉冲）→ 面板收起 → 编辑器粘贴文本 → 循环
 */

const SPRING = { type: 'spring', stiffness: 260, damping: 28 } as const

const ITEMS = [
  { color: '#8B6BFF', tag: '文本', label: 'macOS 26 发布清单', match: true },
  { color: '#4FD47F', tag: '链接', label: 'https://developer.apple.com', match: false },
  { color: '#FFA856', tag: '文本', label: '邮件签名 · Xiaofeng', match: false },
]

const PHASES = [1400, 500, 650, 900, 900, 1300, 600, 600, 1200, 1600]
//            0待机  1悬停  2落下  3stagger 4搜索  5高亮  6选中  7收起  8粘贴  9停顿

export default function RepasteDemo() {
  const p = usePhaseLoop(PHASES)

  const panelOpen = p >= 2 && p <= 6
  const searching = p >= 4
  const highlighted = p >= 5

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl" style={{ background: 'linear-gradient(180deg,#111118 0%, #0b0b11 45%, #08080d 100%)' }}>
      {/* 桌面顶部菜单栏 */}
      <div className="absolute top-0 left-0 right-0 h-6 flex items-center justify-between px-3 text-[9px] text-[#9AA3B8]/70">
        <span className="tracking-wider">REPASTE</span>
        <span>09:41</span>
      </div>

      {/* 刘海热区 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2">
        <div
          className="w-24 h-4 rounded-b-2xl bg-black relative z-20"
          style={{
            boxShadow: p === 1 || panelOpen ? '0 0 24px 4px rgba(139,107,255,0.45)' : 'none',
            transition: 'box-shadow 0.4s ease',
          }}
        />
        {/* 悬停涟漪 */}
        <motion.div
          className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full z-10"
          style={{ background: 'radial-gradient(circle, rgba(139,107,255,0.35) 0%, transparent 70%)' }}
          animate={{ opacity: p === 1 ? 1 : 0, scale: p === 1 ? 1 : 0.4 }}
          transition={{ duration: 0.35 }}
        />
      </div>

      {/* 剪贴板面板：从刘海落下 */}
      <motion.div
        className="absolute top-0 left-1/2 z-20 w-[76%] max-w-[340px] origin-top"
        initial={false}
        animate={{ y: panelOpen ? '0%' : '-103%', opacity: panelOpen ? 1 : 0 }}
        transition={SPRING}
      >
        <div
          className="mt-3 rounded-2xl border bg-[#0A0A0A]/95 backdrop-blur p-2.5"
          style={{ borderColor: 'rgba(139,107,255,0.5)', boxShadow: '0 18px 50px -12px rgba(139,107,255,0.35)' }}
        >
          {/* 搜索框 */}
          <div className="flex items-center gap-1.5 rounded-lg bg-[#16161c] px-2.5 py-1.5 mb-2">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#66667a" strokeWidth="2.5">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4-4" />
            </svg>
            <span className="text-[10px] text-[#D6E4FB] min-h-[13px]">
              {searching ? '发布' : ''}
              {searching && p < 6 && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                  className="inline-block w-px h-3 bg-[#8B6BFF] align-middle ml-px"
                />
              )}
            </span>
            {!searching && <span className="text-[10px] text-[#66667a]">搜索…</span>}
          </div>
          {/* 列表卡片 stagger 入场 */}
          {ITEMS.map((it, i) => {
            const dim = searching && !it.match
            const fresh = searching && it.match && p >= 5
            return (
              <motion.div
                key={it.label}
                initial={false}
                animate={{
                  opacity: 1,
                  y: panelOpen ? 0 : -8,
                  height: dim && p >= 5 ? 0 : 'auto',
                  marginBottom: dim && p >= 5 ? 0 : 6,
                  scale: p === 6 && it.match ? 0.97 : 1,
                }}
                transition={{ delay: panelOpen ? i * 0.048 : 0, duration: 0.3 }}
                className="overflow-hidden rounded-lg px-2 py-1.5 flex items-center gap-2"
                style={{
                  background: fresh ? '#2b2340' : '#141419',
                  boxShadow: fresh ? '0 0 0 1px rgba(139,107,255,0.6), 0 0 18px rgba(139,107,255,0.25)' : 'none',
                  transition: 'background 0.3s, box-shadow 0.3s',
                }}
              >
                <span className="w-3.5 h-3.5 rounded-md shrink-0" style={{ background: it.color }} />
                <span className="text-[10px] text-[#D6E4FB] truncate flex-1">
                  {it.match && highlighted ? (
                    <>
                      macOS 26 <mark className="bg-[#8B6BFF]/40 text-[#EEF3FF] rounded px-0.5">发布清单</mark>
                    </>
                  ) : (
                    it.label
                  )}
                </span>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${it.color}22`, color: it.color }}>
                  {it.tag}
                </span>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* 背景编辑器窗口 */}
      <div className="absolute inset-x-4 bottom-3 top-12 rounded-xl border border-[#1f1f28] bg-[#0d0d13] p-3">
        <div className="flex gap-1.5 mb-3">
          <i className="w-2 h-2 rounded-full bg-[#FF5F57]" />
          <i className="w-2 h-2 rounded-full bg-[#FEBC2E]" />
          <i className="w-2 h-2 rounded-full bg-[#28C840]" />
        </div>
        {[70, 90, 55, 80, 40].map((w, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <span className="w-3 text-right text-[8px] text-[#4c5470]">{i + 12}</span>
            <span className="h-1.5 rounded-full bg-[#1c1c26]" style={{ width: `${w}%` }} />
          </div>
        ))}
        {/* 粘贴结果 */}
        <motion.div
          initial={false}
          animate={{ opacity: p >= 8 ? 1 : 0, y: p >= 8 ? 0 : 6 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <span className="w-3 text-right text-[8px] text-[#4c5470]">17</span>
          <span className="text-[10px] text-[#8FD0F4]">
            macOS 26 发布清单
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
              className="inline-block w-px h-3 bg-[#D6E4FB] align-middle"
            />
          </span>
        </motion.div>
      </div>

      {/* 光标 */}
      <motion.div
        className="absolute z-30"
        initial={false}
        animate={{
          left: p <= 1 ? '78%' : p <= 6 ? '50%' : p >= 8 ? '30%' : '78%',
          top: p <= 1 ? '72%' : p <= 6 ? '9%' : p >= 8 ? '64%' : '72%',
        }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#D6E4FB" stroke="#050508" strokeWidth="1">
          <path d="M5 3l14 8-6 1.5L10 19z" />
        </svg>
      </motion.div>
    </div>
  )
}
