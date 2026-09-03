import { motion } from 'framer-motion'
import { usePhaseLoop } from './usePhaseLoop'

/*
 * WidgetToDo 核心演示（提炼自 index-notion.html）：
 * 桌面小组件（Notion 浅色风）→ 光标点击勾选待办（勾选描边动画）→
 * 完成项 FLIP 平滑沉底（删除线 + 置灰）→ 同步飞点划向 Notion 徽章
 * （徽章脉冲）→ 切换日记 tab 打字 → 循环
 */

interface Todo {
  id: number
  text: string
  tag?: string
  tagColor?: string
}

const TODOS: Todo[] = [
  { id: 1, text: '发布 Repaste v1.2', tag: '紧急', tagColor: '#C2571B' },
  { id: 2, text: '回复用户邮件', tag: '工作', tagColor: '#2E6FD8' },
  { id: 3, text: '写 Readless 更新日志' },
  { id: 4, text: '买猫粮', tag: '生活', tagColor: '#C13D86' },
]

const PHASES = [1300, 800, 700, 900, 700, 600, 1800, 1400]
//            0待机  1勾选  2沉底  3飞点  4脉冲  5切日记  6打字  7停顿

export default function WtdDemo() {
  const p = usePhaseLoop(PHASES)

  const done = p >= 1 // 第 1 项被勾选
  const reordered = p >= 2 // FLIP 沉底
  const flying = p === 3
  const journal = p >= 5
  const typed = journal ? (p === 6 ? '今天把待办钉在桌面上之后，' : '今天把待办钉在桌面上之后，专注力回来了。') : ''

  const list = reordered ? [TODOS[1], TODOS[2], TODOS[3], TODOS[0]] : TODOS

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl" style={{ background: 'linear-gradient(135deg,#EAEAE8 0%, #F1F0EE 50%, #E4E4E0 100%)' }}>
      {/* 桌面壁纸感的光斑 */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, #d8c9b8 0%, transparent 70%)' }} />

      {/* Notion 徽章（右上角） */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
        <motion.div
          className="w-6 h-6 rounded-md bg-[#26241f] text-[#FAFAFA] flex items-center justify-center text-[11px] font-bold"
          animate={p === 4 ? { scale: [1, 1.3, 1], boxShadow: ['0 0 0 0 rgba(156,115,80,0)', '0 0 0 8px rgba(156,115,80,0.25)', '0 0 0 0 rgba(156,115,80,0)'] } : { scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          N
        </motion.div>
      </div>

      {/* 同步飞点 */}
      <motion.div
        className="absolute z-20 w-2 h-2 rounded-full bg-[#9C7350]"
        initial={false}
        animate={
          flying
            ? { left: ['38%', '88%'], top: ['46%', '9%'], opacity: [0, 1, 1, 0], scale: [0.6, 1.2, 0.6], transition: { duration: 0.85, ease: [0.3, 0, 0.4, 1] } }
            : { opacity: 0, left: '38%', top: '46%' }
        }
      />

      {/* 小组件卡片 */}
      <div className="absolute left-4 right-4 top-9 bottom-4 rounded-2xl bg-[#F6F5F2] shadow-[0_16px_40px_-12px_rgba(38,36,31,0.35)] border border-[#e3e1dc] overflow-hidden flex flex-col">
        {/* tabs */}
        <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b border-[#e8e6e1]">
          {[
            { label: '待办', active: !journal },
            { label: '日记', active: journal },
          ].map((t) => (
            <span
              key={t.label}
              className="text-[10px] px-2.5 py-1 rounded-md font-medium transition-all duration-300"
              style={{ background: t.active ? '#26241f' : 'transparent', color: t.active ? '#F6F5F2' : '#8F8B82' }}
            >
              {t.label}
            </span>
          ))}
          <span className="ml-auto text-[8px] text-[#B5B1A8]">实时同步</span>
        </div>

        {/* 待办视图 */}
        <div className="flex-1 px-3 py-2 relative">
          <motion.div animate={{ opacity: journal ? 0 : 1 }} transition={{ duration: 0.3 }} className="h-full">
            {list.map((t) => {
              const isDoneItem = t.id === 1 && done
              return (
                <motion.div
                  key={t.id}
                  layout
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  className="flex items-center gap-2 py-[7px] border-b border-[#efece7] last:border-0"
                  style={{ opacity: isDoneItem ? 0.45 : 1 }}
                >
                  {/* 复选框 */}
                  <div
                    className="w-[14px] h-[14px] rounded-[4px] shrink-0 flex items-center justify-center transition-colors duration-300"
                    style={{
                      border: isDoneItem ? 'none' : '1.5px solid #B5B1A8',
                      background: isDoneItem ? '#3FAE52' : 'transparent',
                    }}
                  >
                    {t.id === 1 && (
                      <motion.svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round">
                        <motion.path
                          d="M4 12l5 5L20 6"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: p >= 1 ? 1 : 0 }}
                          transition={{ duration: 0.35, delay: 0.1 }}
                        />
                      </motion.svg>
                    )}
                  </div>
                  <span className="text-[11px] text-[#26241f] flex-1 truncate relative">
                    {t.text}
                    {isDoneItem && (
                      <motion.span
                        className="absolute left-0 top-1/2 h-px bg-[#8F8B82]"
                        initial={{ width: 0 }}
                        animate={{ width: p >= 1 ? '100%' : 0 }}
                        transition={{ duration: 0.4 }}
                      />
                    )}
                  </span>
                  {t.tag && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded shrink-0" style={{ color: t.tagColor, background: `${t.tagColor}18` }}>
                      {t.tag}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </motion.div>

          {/* 日记视图 */}
          <motion.div animate={{ opacity: journal ? 1 : 0, y: journal ? 0 : 10 }} transition={{ duration: 0.35 }} className={`absolute inset-3 ${journal ? '' : 'pointer-events-none'}`}>
            <div className="text-[9px] text-[#B5B1A8] mb-1.5">9 月 2 日 · 星期二</div>
            <p className="text-[11px] leading-relaxed text-[#26241f]">
              {typed}
              {journal && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                  className="inline-block w-px h-3 bg-[#9C7350] align-middle ml-px"
                />
              )}
            </p>
          </motion.div>
        </div>
      </div>

      {/* 光标 */}
      <motion.div
        className="absolute z-40"
        initial={false}
        animate={{
          left: p === 0 ? '70%' : p <= 2 ? '12%' : journal ? '55%' : '70%',
          top: p === 0 ? '70%' : p <= 2 ? '24%' : journal ? '52%' : '70%',
        }}
        transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#26241f" stroke="#FAFAFA" strokeWidth="1">
          <path d="M5 3l14 8-6 1.5L10 19z" />
        </svg>
      </motion.div>
    </div>
  )
}
