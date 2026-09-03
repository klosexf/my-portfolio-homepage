import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import RepasteDemo from '../components/project-demos/RepasteDemo'
import ReadlessDemo from '../components/project-demos/ReadlessDemo'
import WtdDemo from '../components/project-demos/WtdDemo'

interface Project {
  number: string
  category: string
  name: string
  tagline: string
  link: string
  accent: string
  demo: ReactNode
}

const PROJECTS: Project[] = [
  {
    number: '01',
    category: 'macOS 应用',
    name: 'Repaste',
    tagline: '把剪贴板藏进刘海 · 0.1 秒呼出的原生剪贴板管理器',
    link: 'https://github.com/klosexf/Repaste',
    accent: '#8B6BFF',
    demo: <RepasteDemo />,
  },
  {
    number: '02',
    category: 'macOS App · 开源',
    name: 'Readless',
    tagline: '选中即朗读的菜单栏听读助手 · 把长文当播客听完',
    link: 'https://github.com/klosexf/readless',
    accent: '#4f8cff',
    demo: <ReadlessDemo />,
  },
  {
    number: '03',
    category: 'macOS App',
    name: 'WidgetToDo',
    tagline: '把 Notion 待办与日记钉在桌面上 · 改动实时同步',
    link: 'https://github.com/klosexf/WidgetToDo',
    accent: '#9C7350',
    demo: <WtdDemo />,
  },
]

export default function ProjectsSection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)

  const onScroll = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const children = Array.from(el.children) as HTMLElement[]
    const center = el.scrollLeft + el.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    children.forEach((c, i) => {
      const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    setCurrent(best)
  }, [])

  const goTo = (i: number) => {
    const el = trackRef.current
    if (!el) return
    const child = el.children[i] as HTMLElement | undefined
    if (!child) return
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: 'smooth' })
  }

  // 桌面端滚轮横向浏览
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <section id="projects" className="relative z-10 bg-[#0C0C0C] pt-8 sm:pt-10 pb-10 overflow-hidden">
      {/* 横向轮播轨道 */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar flex gap-5 sm:gap-8 overflow-x-auto scroll-smooth snap-x snap-mandatory px-6 md:px-10 pb-2"
        style={{ scrollPaddingLeft: '2.5rem' }}
      >
        {PROJECTS.map((project, i) => (
          <a
            key={project.number}
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="snap-center shrink-0 w-[86vw] max-w-[860px] group"
            aria-label={`${project.name} 产品页面`}
          >
            <div
              className="rounded-[28px] sm:rounded-[40px] border-2 p-4 sm:p-6 md:p-7 transition-all duration-300"
              style={{
                borderColor: current === i ? project.accent : '#D7E2EA22',
                background: '#101014',
                boxShadow: current === i ? `0 24px 80px -30px ${project.accent}66` : 'none',
              }}
            >
              {/* 顶部信息行 */}
              <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-5 mb-4 sm:mb-6">
                <div className="flex items-end gap-3 sm:gap-6">
                  <span
                    className="font-black leading-none"
                    style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: project.accent }}
                  >
                    {project.number}
                  </span>
                  <div className="flex flex-col gap-0.5 pb-1.5">
                    <span className="text-[#D7E2EA]/50 tracking-widest text-[10px] sm:text-xs font-medium">
                      {project.category}
                    </span>
                    <h3 className="text-[#D7E2EA] font-semibold leading-none" style={{ fontSize: 'clamp(1.2rem, 2.6vw, 2.2rem)' }}>
                      {project.name}
                    </h3>
                  </div>
                </div>
                <span
                  className="rounded-full border-2 px-5 py-2 sm:px-7 sm:py-2.5 text-xs sm:text-sm font-medium tracking-widest transition-colors group-hover:bg-white/5"
                  style={{ borderColor: project.accent, color: project.accent }}
                >
                  访问产品 ↗
                </span>
              </div>

              <p className="text-[#D7E2EA]/70 text-xs sm:text-base mb-4 sm:mb-5">{project.tagline}</p>

              {/* 交互动画演示 */}
              <div className="h-[240px] sm:h-[300px] md:h-[360px] pointer-events-none select-none">
                {project.demo}
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* 控制区：圆点 + 箭头 */}
      <div className="flex items-center justify-center gap-6 mt-6 sm:mt-8 px-6 md:px-10">
        <button
          onClick={() => goTo(Math.max(0, current - 1))}
          disabled={current === 0}
          aria-label="上一个项目"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#D7E2EA] text-[#D7E2EA] flex items-center justify-center hover:bg-[#D7E2EA]/10 disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          {PROJECTS.map((pr, i) => (
            <button
              key={pr.number}
              onClick={() => goTo(i)}
              aria-label={`跳到 ${pr.name}`}
              className="h-2.5 rounded-full transition-all duration-300"
              style={{
                width: current === i ? 32 : 10,
                background: current === i ? pr.accent : '#D7E2EA33',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => goTo(Math.min(PROJECTS.length - 1, current + 1))}
          disabled={current === PROJECTS.length - 1}
          aria-label="下一个项目"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#D7E2EA] text-[#D7E2EA] flex items-center justify-center hover:bg-[#D7E2EA]/10 disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 页脚 */}
      <footer id="contact" className="max-w-6xl mx-auto flex flex-col items-center gap-6 pt-20 pb-10">
        <p className="text-[#D7E2EA]/60 text-sm tracking-widest">© 2026 Xiaofeng · 独立开发者</p>
      </footer>
    </section>
  )
}
