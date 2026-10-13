import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { gsap } from 'gsap'
import { useDashboardMotion } from '@/views/dashboard/useDashboardMotion'
import type { TaskStats } from '@/types/api/task'

/** 验证展示过渡不污染接口数据，以及系统偏好变化后的最终状态。 */
function sample(total: number): TaskStats {
  return {
    scope: 'ALL', total,
    statusDistribution: [{ code: 'DONE', name: '已完成', count: total, percentage: 100 }],
    priorityDistribution: [], personalTotal: total, personalCompleted: total / 2, personalCompletionRate: 50
  }
}

function setup() {
  const events = new EventTarget()
  const media: MediaQueryList = {
    matches: false, media: '(prefers-reduced-motion: reduce)', onchange: null,
    addListener: jest.fn(), removeListener: jest.fn(),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events)
  }
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => media })
  const stats = ref<TaskStats>()
  const Component = defineComponent({
    setup() {
      const root = ref<HTMLDivElement>()
      const displayed = useDashboardMotion(root, stats)
      return () => h('div', { ref: root }, [
        h('div', { class: 'dashboard-filter' }),
        h('div', { class: 'dashboard-metrics' }, [h('article', String(displayed.value?.total ?? ''))])
      ])
    }
  })
  const visible = ref(true)
  const Host = defineComponent({ setup: () => () => h(KeepAlive, () => visible.value ? h(Component) : null) })
  const wrapper = mount(Host, { attachTo: document.body })
  const finish = async (): Promise<void> => {
    gsap.globalTimeline.getChildren().forEach(animation => animation.progress(1))
    await nextTick()
  }
  return { wrapper, stats, media, finish, visible }
}

describe('看板数值动效', () => {
  it.each([false, true])('缓存返回保持卡片可见且不重播，离场前动画完成：%s', async completed => {
    const { wrapper, stats, finish, visible } = setup()
    try {
      stats.value = sample(120)
      await nextTick()
      if (completed) await finish()
      visible.value = false
      await nextTick()
      visible.value = true
      await nextTick()
      expect(wrapper.text()).toBe('120')
      expect(wrapper.find('.dashboard-filter').isVisible()).toBe(true)
      expect(wrapper.find('article').isVisible()).toBe(true)
      expect(wrapper.find('article').attributes('style')).not.toContain('translate')
    } finally { wrapper.unmount() }
  })

  it('首次从零递增，后续从旧值过渡，并保持接口数据不变', async () => {
    const { wrapper, stats, finish } = setup()
    try {
      stats.value = sample(120)
      await nextTick()
      expect(wrapper.text()).toBe('0')
      expect(stats.value.total).toBe(120)
      await finish()
      expect(wrapper.text()).toBe('120')
      stats.value = sample(200)
      await nextTick()
      expect(wrapper.text()).toBe('120')
      await finish()
      expect(wrapper.text()).toBe('200')
    } finally { wrapper.unmount() }
  })

  it('运行期间切换减少动态效果，立即显示目标值，后续更新不播放动画', async () => {
    const { wrapper, stats, media } = setup()
    try {
      stats.value = sample(120)
      await nextTick()
      Object.defineProperty(media, 'matches', { value: true })
      media.dispatchEvent(new Event('change'))
      await nextTick()
      expect(wrapper.text()).toBe('120')
      stats.value = sample(200)
      await nextTick()
      expect(wrapper.text()).toBe('200')
    } finally { wrapper.unmount() }
  })
})
