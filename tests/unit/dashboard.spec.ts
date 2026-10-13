import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import Index from '@/views/index.vue'
import { getTaskStats } from '@/api/task'
import type { TaskStats } from '@/types/api/task'

jest.mock('@/api/task', () => ({ getTaskStats: jest.fn() }))
jest.mock('@/views/dashboard/DistributionChart.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'DistributionChart',
    props: { kind: String, items: { type: Array, default: () => [] }, description: String },
    setup: props => () => h('div', { 'data-chart': props.kind, 'data-colors': (props.items as { color: string }[]).map(item => item.color).join(',') })
  })
}))

const Container = defineComponent({ setup: (_, { slots }) => () => h('div', [slots.header?.(), slots.default?.()]) })
const Text = defineComponent({ setup: (_, { slots }) => () => h('span', slots.default?.()) })
const Button = defineComponent({
  setup: (_, { slots }) => () => h('button', { type: 'button' }, slots.default?.())
})
const stubs: Record<string, Component> = {
  ElCard: Container, ElRow: Container, ElCol: Container, ElForm: Container, ElFormItem: Container,
  ElDatePicker: Container, ElButton: Button, ElSpace: Container, ElText: Text, ElAlert: Container,
  ElSkeleton: Container, ElTag: Container, ElEmpty: Container
}
const statsMock = jest.mocked(getTaskStats)

// jsdom 不提供 matchMedia；默认使用减少动态效果，验证最终业务内容。
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: jest.fn(() => ({
    matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn()
  })) })
})

function sample(): TaskStats {
  return {
    scope: 'ALL',
    total: 10,
    statusDistribution: [
      { code: 'TODO', name: '待办', count: 4, percentage: 40 },
      { code: 'IN_PROGRESS', name: '进行中', count: 3, percentage: 30 },
      { code: 'DONE', name: '已完成', count: 3, percentage: 30 }
    ],
    priorityDistribution: [
      { code: 'HIGH', name: '高', count: 2, percentage: 20 },
      { code: 'MEDIUM', name: '中', count: 5, percentage: 50 },
      { code: 'LOW', name: '低', count: 3, percentage: 30 }
    ],
    personalTotal: 6,
    personalCompleted: 2,
    personalCompletionRate: 33
  }
}

async function render(data: TaskStats = sample()) {
  statsMock.mockResolvedValue({ code: 200, msg: '成功', data })
  const wrapper = mount(Index, { global: { stubs, directives: { loading: () => {} } } })
  await flushPromises()
  return wrapper
}

describe('数据看板', () => {
  it('将总量与三个状态拆成独立指标卡，并去掉堆叠进度带', async () => {
    const wrapper = await render()
    const labels = wrapper.findAll('.dashboard-metrics .dashboard-metric__label').map(item => item.text())
    expect(labels).toEqual(['任务总数', '待办', '进行中', '已完成'])
    expect(wrapper.find('.dashboard-metrics .is-todo .dashboard-metric__value').text()).toBe('4')
    expect(wrapper.find('.dashboard-metrics .is-todo .dashboard-metric__share').text()).toBe('占比 40%')
    expect(wrapper.findAll('.dashboard-metrics .dashboard-metric__bar')).toHaveLength(3)
    expect(wrapper.findAll('[style*="flex"]').length).toBe(0)
  })

  it('完成情况使用 1+3 布局，说明文字弱化，环心展示完成率', async () => {
    const wrapper = await render()
    expect(wrapper.find('.dashboard-ring__caption strong').text()).toBe('33%')
    expect(wrapper.find('.dashboard-ring__caption span').text()).toBe('完成率')
    const personal = wrapper.findAll('.dashboard-personal__stats .dashboard-metric__label').map(item => item.text())
    expect(personal).toEqual(['负责总数', '已完成', '未完成'])
    expect(wrapper.find('.dashboard-personal__stats .is-done .dashboard-metric__value').text()).toBe('2')
    expect(wrapper.find('.dashboard-personal__stats .is-total:last-child .dashboard-metric__value').text()).toBe('4')
    expect(wrapper.find('.dashboard-personal__note').text()).toContain('已完成 2 / 6 项负责的任务')
  })

  it('图表使用看板业务色，并在优先级图下展示分类介绍', async () => {
    const wrapper = await render()
    expect(wrapper.find('[data-chart="bar"]').attributes('data-colors')).toBe('--dashboard-todo,--dashboard-progress,--dashboard-done')
    expect(wrapper.find('[data-chart="pie"]').attributes('data-colors')).toBe('--dashboard-priority-high,--dashboard-priority-medium,--dashboard-priority-low')
    const legend = wrapper.findAll('.dashboard-priority-legend__item').map(item => item.text())
    expect(legend).toEqual(['高优先级2 项 · 20%', '中优先级5 项 · 50%', '低优先级3 项 · 30%'])
  })

  it('点击快捷范围立即查询，不必再点查询', async () => {
    const wrapper = await render()
    statsMock.mockClear()
    const all = wrapper.findAll('button').find(item => item.text() === '全部')
    if (!all) throw new Error('未找到全部按钮')
    await all.trigger('click')
    await flushPromises()
    expect(statsMock).toHaveBeenCalledTimes(1)
    expect(statsMock).toHaveBeenCalledWith({})
  })
})
