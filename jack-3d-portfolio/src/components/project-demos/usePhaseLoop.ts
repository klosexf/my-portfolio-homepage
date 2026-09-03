import { useEffect, useState } from 'react'

/**
 * 驱动一个循环时间线：phases 为每个阶段的时长（ms），
 * 返回当前阶段索引，走完一轮后自动从头循环。
 */
export function usePhaseLoop(phases: number[], active = true): number {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let timer = 0
    let i = 0
    const tick = () => {
      if (cancelled) return
      setPhase(i)
      timer = window.setTimeout(() => {
        i = (i + 1) % phases.length
        tick()
      }, phases[i])
    }
    tick()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [active, phases])

  return phase
}
