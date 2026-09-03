import { motion } from 'framer-motion'
import { usePhaseLoop } from './usePhaseLoop'

/*
 * Readless 核心演示（提炼自 index-readless.html）：
 * 文档中逐行选中文字（background-size 过渡）→ 弹出 ⌥R 键帽 →
 * 底部播放条滑入 → 朗读进度推进 + 当前句高亮 + 菜单栏波形跳动 →
 * 暂停 → 停止收起播放条 → 循环
 */

const SENTENCES = [
  { text: '长文不必读完，', part: 0 },
  { text: '选中即朗读，', part: 1 },
  { text: '把碎片时间变成一座移动图书馆。', part: 2 },
]

const PHASES = [1300, 900, 700, 700, 1200, 1200, 1400, 900, 700, 1500]
//            0待机  1选中  2键帽  3播放条入  4朗读1  5朗读2  6朗读3  7暂停  8停止  9停顿

export default function ReadlessDemo() {
  const p = usePhaseLoop(PHASES)

  const selected = p >= 1
  const playerIn = p >= 3 && p <= 7
  const speaking = p >= 4 && p <= 6
  const current = p >= 4 && p <= 6 ? p - 4 : p >= 7 ? 3 : -1
  const progress = p <= 3 ? 0 : p >= 8 ? 100 : ((p - 3) / 5) * 100

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl" style={{ background: 'linear-gradient(180deg,#12141c 0%, #0c0e14 100%)' }}>
      {/* 菜单栏 + 波形 */}
      <div className="absolute top-0 inset-x-0 h-6 flex items-center justify-end gap-1.5 px-3">
        <motion.div className="flex items-end gap-[2px] h-3" initial={false} animate={{ opacity: speaking ? 1 : 0.25 }}>
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="w-[2px] rounded-full bg-[#4f8cff]"
              animate={speaking ? { height: ['4px', '13px', '4px'], transition: { duration: 0.7, repeat: Infinity, delay: i * 0.12 } } : { height: '4px' }}
            />
          ))}
        </motion.div>
        <span className="text-[9px] text-[#edf1f8]/60 tracking-wider">READLESS</span>
      </div>

      {/* 文档 */}
      <div className="absolute inset-x-5 top-8">
        <div className="text-[10px] text-[#edf1f8]/40 mb-2 tracking-wider">Safari 阅读视图 · 深度长文</div>
        <div className="rounded-xl bg-[#f5f2ec] p-4 shadow-2xl">
          <div className="h-2 w-2/3 rounded bg-[#26241f]/80 mb-3" />
          <div className="space-y-1.5 leading-relaxed">
            <p className="text-[10px] text-[#6F6B60]">每天通勤的你，收藏了三十篇没读完的长文……</p>
            {SENTENCES.map((s, i) => {
              const isCur = current === i
              const isDone = current > i && i >= 0
              return (
                <span
                  key={s.text}
                  className="inline text-[11px] px-0.5 rounded transition-all duration-500"
                  style={{
                    color: isCur ? '#1d3a6e' : '#26241f',
                    background: selected ? (isCur ? '#4f8cff55' : isDone ? '#4f8cff22' : '#4f8cff33') : 'transparent',
                    boxShadow: isCur ? '0 0 0 1px #4f8cff' : 'none',
                  }}
                >
                  {s.text}
                </span>
              )
            })}
            <p className="text-[10px] text-[#6F6B60] block">剩下的段落会安静地等在你回来的时候。</p>
          </div>
        </div>
      </div>

      {/* ⌥R 键帽 */}
      <motion.div
        className="absolute top-1/3 right-6 z-20"
        initial={false}
        animate={{ opacity: p === 2 || p === 3 ? 1 : 0, y: p === 2 || p === 3 ? 0 : 10, scale: p === 2 || p === 3 ? 1 : 0.8 }}
        transition={{ duration: 0.35, type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="rounded-lg border-b-4 px-3 py-1.5 text-sm font-semibold text-[#edf1f8]" style={{ background: '#232733', borderColor: '#4f8cff' }}>
          ⌥R
        </div>
      </motion.div>

      {/* 底部播放条 */}
      <motion.div
        className="absolute bottom-3 inset-x-4 z-20"
        initial={false}
        animate={{ y: playerIn ? 0 : 90, opacity: playerIn ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div className="rounded-2xl border border-[#2a2f3d] bg-[#161a24]/95 backdrop-blur px-3 py-2.5 shadow-2xl">
          <div className="flex items-center gap-2.5">
            {/* 播放/暂停按钮 */}
            <div className="w-7 h-7 rounded-full bg-[#4f8cff] flex items-center justify-center shrink-0">
              {p === 7 ? (
                <svg width="9" height="10" viewBox="0 0 12 14" fill="#fff"><path d="M1 1h3.5v12H1zM7.5 1H11v12H7.5z" /></svg>
              ) : (
                <svg width="9" height="10" viewBox="0 0 12 14" fill="#fff"><path d="M1 1l11 6-11 6z" /></svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-[#edf1f8]/80 truncate mb-1">正在朗读 · 深度长文</div>
              {/* 进度条 */}
              <div className="h-1 rounded-full bg-[#2a2f3d] relative">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-[#4f8cff]"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#ffb45e]"
                  animate={{ left: `calc(${progress}% - 4px)` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </div>
            </div>
            <span className="text-[8px] text-[#edf1f8]/40 shrink-0">{Math.round(progress)}%</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
