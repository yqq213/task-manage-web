import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { gsap } from 'gsap'
import type { TaskStats } from '@/types/api/task'

/** 动画只改变展示数值，接口结果和图表数据始终保留真实值。 */
export function useDashboardMotion(root: Ref<HTMLDivElement | undefined>, stats: Ref<TaskStats | undefined>): ComputedRef<TaskStats | undefined> {
  const values = ref<Record<string, number>>({})
  const contexts: gsap.Context[] = []
  let tween: gsap.core.Tween | undefined
  let active = true
  let entered = false
  let motion: MediaQueryList | undefined
  const displayed = computed<TaskStats | undefined>(() => {
    const data = stats.value
    if (!data) return undefined
    const value = (key: string, fallback: number): number => values.value[key] ?? fallback
    return {
      ...data,
      total: Math.round(value('total', data.total)),
      personalTotal: Math.round(value('personalTotal', data.personalTotal)),
      personalCompleted: Math.round(value('personalCompleted', data.personalCompleted)),
      personalCompletionRate: Math.round(value('personalCompletionRate', data.personalCompletionRate)),
      statusDistribution: data.statusDistribution.map(item => ({
        ...item, count: Math.round(value(item.code, item.count)),
        percentage: Number(value(`${item.code}Share`, item.percentage).toFixed(1))
      }))
    }
  })

  /** 缓存离场或减少动态效果时立即落到最终状态，避免恢复后重播。 */
  function finish(): void {
    tween?.progress(1).kill()
    // from() 会创建内部起始 tween，逐个 progress 会重新隐藏元素；统一 revert 恢复原样式。
    contexts.forEach(context => context.revert())
    contexts.length = 0
  }
  function syncMotion(): void { if (motion?.matches) finish() }
  function enter(selector: string): void {
    if (!active || motion?.matches || !root.value?.isConnected) return
    contexts.push(gsap.context(() => {
      gsap.timeline({ defaults: { duration: 0.45, ease: 'power2.out' } })
        .from(selector, { autoAlpha: 0, y: 16, stagger: 0.07, clearProps: 'opacity,visibility,transform' })
    }, root.value))
  }

  watch(stats, data => {
    if (!data) return
    tween?.kill()
    const target: Record<string, number> = {
      total: data.total, personalTotal: data.personalTotal, personalCompleted: data.personalCompleted,
      personalCompletionRate: data.personalCompletionRate
    }
    data.statusDistribution.forEach(item => {
      target[item.code] = item.count
      target[`${item.code}Share`] = item.percentage
    })
    const first = !entered
    entered = true
    if (!active || motion?.matches || !root.value?.isConnected) {
      values.value = target
      return
    }
    if (first) enter('.dashboard-metrics > article, .dashboard-distributions .el-card, .dashboard-personal-card')
    const source = Object.fromEntries(Object.keys(target).map(key => [key, values.value[key] ?? 0]))
    values.value = { ...source }
    tween = gsap.to(source, {
      ...target, duration: 0.8, ease: 'power2.out',
      // 仅复制业务字段，避免将 GSAP 内部缓存写入 Vue 状态。
      onUpdate: () => { values.value = Object.fromEntries(Object.keys(target).map(key => [key, source[key]])) },
      onComplete: () => { values.value = target }
    })
  }, { flush: 'post' })

  onMounted(() => {
    motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    motion.addEventListener('change', syncMotion)
    enter('.dashboard-filter')
  })
  onActivated(() => { active = true })
  onDeactivated(() => { active = false; finish() })
  onBeforeUnmount(() => {
    tween?.kill()
    contexts.forEach(context => context.revert())
    motion?.removeEventListener('change', syncMotion)
  })
  return displayed
}
