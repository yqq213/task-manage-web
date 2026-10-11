import { defineComponent, h, inject, provide } from 'vue'
import type { Component, PropType } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import TaskList from '@/views/task/list/index.vue'
import { changeTaskStatus, deleteTask, getTaskAssignees, listTasks } from '@/api/task'
import type { Task, TaskQuery } from '@/types/api/task'
import type { TableDataInfo } from '@/types/api/common'

// 隔离网络、登录初始化与弹窗，保留任务列表自身的渲染和事件处理。
jest.mock('@/api/task', () => ({
  listTasks: jest.fn(), getTaskAssignees: jest.fn(),
  changeTaskStatus: jest.fn(), deleteTask: jest.fn()
}))
const mockUser: { id: number; roles: string[] } = { id: 2, roles: [] }
jest.mock('@/store/modules/user', () => ({ __esModule: true, default: () => mockUser }))
jest.mock('element-plus', () => ({
  ElMessage: { success: jest.fn() }, ElMessageBox: { confirm: jest.fn() }
}))
const mockFormOpen = jest.fn()
const mockDetailOpen = jest.fn()
jest.mock('@/views/task/list/TaskForm.vue', () => ({
  __esModule: true,
  default: { name: 'TaskForm', template: '<div />', methods: { open: (...args: unknown[]) => mockFormOpen(...args) } }
}))
jest.mock('@/views/task/list/TaskDetail.vue', () => ({
  __esModule: true,
  default: { name: 'TaskDetail', template: '<div />', methods: { open: (...args: unknown[]) => mockDetailOpen(...args) } }
}))
jest.mock('@/components/Pagination/index.vue', () => ({ __esModule: true, default: { name: 'Pagination' } }))
jest.mock('@/components/RightToolbar/index.vue', () => ({ __esModule: true, default: { name: 'RightToolbar' } }))

// 轻量组件替身只传递插槽、v-model 和事件，不依赖 Element Plus 内部 DOM。
const Container = defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) })
const Button = defineComponent({
  inheritAttrs: false,
  props: { disabled: Boolean },
  setup: (props, { attrs, slots }) => () => h('button', { ...attrs, disabled: props.disabled }, slots.default?.())
})
const Input = defineComponent({
  props: { modelValue: String }, emits: ['update:modelValue'],
  setup: (props, { emit }) => () => h('input', {
    value: props.modelValue,
    onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value)
  })
})
const Select = defineComponent({
  props: { modelValue: [String, Number] }, emits: ['update:modelValue', 'visible-change'],
  setup: (_, { slots }) => () => h('div', slots.default?.())
})
const Alert = defineComponent({ props: { title: String }, setup: props => () => h('div', { role: 'alert' }, props.title) })
const mockSort = jest.fn()
const Table = defineComponent({
  props: { data: { type: Array as PropType<Task[]>, default: () => [] } },
  emits: ['sort-change'],
  setup(props, { slots, expose }) {
    provide('test-task-rows', () => props.data)
    expose({ sort: mockSort })
    return () => h('div', slots.default?.())
  }
})
const Column = defineComponent({
  props: { label: String, prop: String },
  setup(props, { slots }) {
    const rows = inject<() => Task[]>('test-task-rows', () => [])
    return () => h('div', { 'data-column': props.label }, rows().map(row => h('div', { 'data-task-id': row.id },
      slots.default ? slots.default({ row }) : String(row[props.prop as keyof Task] ?? '')
    )))
  }
})
const Pagination = defineComponent({
  props: { page: Number, limit: Number, total: Number },
  emits: ['update:page', 'update:limit', 'pagination'],
  setup: () => () => h('div')
})
const Toolbar = defineComponent({ emits: ['query-table'], setup: () => () => h('div') })
const stubs: Record<string, Component> = {
  ElForm: Container, ElFormItem: Container, ElRow: Container, ElCol: Container,
  ElButton: Button, ElInput: Input, ElSelect: Select, ElOption: Container,
  ElAlert: Alert, ElTag: Container, ElTable: Table, ElTableColumn: Column,
  Pagination, RightToolbar: Toolbar
}
const listMock = jest.mocked(listTasks)
const assigneesMock = jest.mocked(getTaskAssignees)
const confirmMock = jest.mocked(ElMessageBox.confirm)
// Element Plus 声明使用交叉类型，confirm 实际成功时返回操作字符串。
const confirmed = 'confirm' as Awaited<ReturnType<typeof ElMessageBox.confirm>>
let wrapper: VueWrapper

/** 完整任务样本，单个用例只覆盖与该业务场景有关的字段。 */
function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 10, title: '测试任务', description: null, priority: 'MEDIUM', status: 'TODO',
    assigneeId: 3, assigneeName: '负责人', creatorId: 2, creatorName: '创建人',
    dueDate: null, completedTime: null, ...overrides
  }
}
function response(rows: Task[], total = rows.length): TableDataInfo<Task> {
  return { code: 200, msg: '成功', rows, total }
}
async function render(rows: Task[] = [task()]): Promise<void> {
  listMock.mockResolvedValue(response(rows))
  wrapper = mount(TaskList, { global: { stubs, directives: { loading: () => {} } } })
  await flushPromises()
}
function button(text: string, scope: VueWrapper = wrapper) {
  const found = scope.findAll('button').find(item => item.text() === text)
  if (!found) throw new Error(`未找到按钮：${text}`)
  return found
}
function actions(id = 10): string[] {
  return wrapper.find(`[data-column="操作"] [data-task-id="${id}"]`).findAll('button').map(item => item.text())
}
function latestQuery(): TaskQuery {
  return listMock.mock.calls[listMock.mock.calls.length - 1][0]
}

beforeEach(() => {
  jest.resetAllMocks()
  mockUser.id = 2
  mockUser.roles = []
  assigneesMock.mockResolvedValue({ code: 200, msg: '成功', data: [{ userId: 3, userName: 'user3', nickName: '负责人' }] })
  confirmMock.mockResolvedValue(confirmed)
  jest.mocked(changeTaskStatus).mockResolvedValue({ code: 200, msg: '成功' })
  jest.mocked(deleteTask).mockResolvedValue({ code: 200, msg: '成功' })
})
afterEach(() => wrapper?.unmount())

describe('任务列表初始化与查询', () => {
  it('首次加载默认分页和创建时间倒序，同时加载负责人', async () => {
    await render()
    expect(listMock).toHaveBeenCalledTimes(1)
    expect(latestQuery()).toEqual({ pageNum: 1, pageSize: 10, orderByColumn: 'createTime', isAsc: 'desc', keyword: undefined })
    expect(assigneesMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('测试任务')
    expect(wrapper.findComponent(Pagination).props('total')).toBe(1)
    expect(wrapper.find('[data-column="任务编号"]').exists()).toBe(false)
  })

  it('修改筛选条件不自动请求，搜索时去掉关键词首尾空白并回到第一页', async () => {
    await render()
    const pager = wrapper.findComponent(Pagination)
    pager.vm.$emit('update:page', 3)
    await wrapper.find('input').setValue('  报告  ')
    const selects = wrapper.findAllComponents(Select)
    selects[0].vm.$emit('update:modelValue', 'IN_PROGRESS')
    selects[1].vm.$emit('update:modelValue', 'HIGH')
    selects[2].vm.$emit('update:modelValue', 3)
    expect(listMock).toHaveBeenCalledTimes(1)
    await button('搜索').trigger('click')
    await flushPromises()
    expect(latestQuery()).toEqual(expect.objectContaining({ pageNum: 1, keyword: '报告', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: 3 }))
  })

  it('分页保留每页条数，排序映射后端字段，取消排序恢复默认顺序', async () => {
    await render()
    listMock.mockResolvedValue(response([task()], 50))
    const pager = wrapper.findComponent(Pagination)
    pager.vm.$emit('update:page', 2)
    pager.vm.$emit('update:limit', 20)
    pager.vm.$emit('pagination')
    await flushPromises()
    expect(latestQuery()).toEqual(expect.objectContaining({ pageNum: 2, pageSize: 20 }))
    wrapper.findComponent(Table).vm.$emit('sort-change', { prop: 'priority', order: 'ascending' })
    await flushPromises()
    expect(latestQuery()).toEqual(expect.objectContaining({ pageNum: 1, pageSize: 20, orderByColumn: 'priority', isAsc: 'asc' }))
    wrapper.findComponent(Table).vm.$emit('sort-change', { prop: 'priority', order: null })
    await flushPromises()
    expect(latestQuery()).toEqual(expect.objectContaining({ orderByColumn: 'createTime', isAsc: 'desc' }))
  })

  it('重置清空筛选与表头排序，保留每页条数', async () => {
    await render()
    await wrapper.find('input').setValue('报告')
    wrapper.findAllComponents(Select)[0].vm.$emit('update:modelValue', 'DONE')
    wrapper.findComponent(Pagination).vm.$emit('update:limit', 20)
    wrapper.findComponent(Table).vm.$emit('sort-change', { prop: 'title', order: 'ascending' })
    await flushPromises()
    await button('重置').trigger('click')
    await flushPromises()
    expect(latestQuery()).toEqual({ pageNum: 1, pageSize: 20, orderByColumn: 'createTime', isAsc: 'desc', keyword: undefined, status: undefined, priority: undefined, assigneeId: undefined })
    expect(mockSort).toHaveBeenCalledWith('createTime', 'descending')
    expect(wrapper.find('input').element.value).toBe('')
  })

  it('列表加载失败显示提示并清空旧数据，刷新后恢复', async () => {
    await render()
    listMock.mockRejectedValueOnce(new Error('网络异常'))
    wrapper.findComponent(Toolbar).vm.$emit('query-table')
    await flushPromises()
    expect(wrapper.text()).toContain('任务列表加载失败')
    expect(wrapper.findComponent(Table).props('data')).toEqual([])
    expect(wrapper.findComponent(Pagination).props('total')).toBe(0)
    wrapper.findComponent(Toolbar).vm.$emit('query-table')
    await flushPromises()
    expect(wrapper.text()).not.toContain('任务列表加载失败')
    expect(wrapper.text()).toContain('测试任务')
  })

  it('负责人加载失败后，仅重新展开下拉框时重试', async () => {
    assigneesMock.mockRejectedValueOnce(new Error('网络异常'))
    await render()
    expect(wrapper.text()).toContain('负责人选项加载失败')
    const select = wrapper.findAllComponents(Select)[2]
    select.vm.$emit('visible-change', false)
    expect(assigneesMock).toHaveBeenCalledTimes(1)
    select.vm.$emit('visible-change', true)
    await flushPromises()
    expect(assigneesMock).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).not.toContain('负责人选项加载失败')
  })

  it('并发查询乱序返回时，旧响应不能覆盖新结果', async () => {
    await render()
    let resolveOld!: (value: TableDataInfo<Task>) => void
    listMock.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    wrapper.findComponent(Toolbar).vm.$emit('query-table')
    listMock.mockResolvedValueOnce(response([task({ title: '最新任务' })]))
    wrapper.findComponent(Toolbar).vm.$emit('query-table')
    await flushPromises()
    resolveOld(response([task({ title: '旧任务' })]))
    await flushPromises()
    expect(wrapper.text()).toContain('最新任务')
    expect(wrapper.text()).not.toContain('旧任务')
  })
})

describe('任务权限与表单入口', () => {
  it.each([
    ['超级管理员', 1, [], ['详情', '编辑', '指派', '开始处理', '删除']],
    ['admin 角色', 9, ['admin'], ['详情', '编辑', '指派', '开始处理', '删除']],
    ['创建人', 2, [], ['详情', '编辑', '指派', '删除']],
    ['负责人', 3, [], ['详情', '开始处理']],
    ['无关用户', 4, [], ['详情']]
  ])('%s 只显示其允许的操作', async (_, id, roles, expected) => {
    mockUser.id = id as number
    mockUser.roles = roles as string[]
    await render()
    expect(actions()).toEqual(expected)
  })

  it.each([['管理员', 1], ['创建人', 2]])('已完成任务对%s隐藏编辑、指派与状态推进', async (_, id) => {
    mockUser.id = id
    await render([task({ status: 'DONE' })])
    expect(actions()).toEqual(['详情', '删除'])
  })

  it('新增、编辑、指派及详情调用对应子组件入口', async () => {
    await render()
    await button('新增').trigger('click')
    expect(mockFormOpen).toHaveBeenLastCalledWith('create')
    await button('编辑').trigger('click')
    expect(mockFormOpen).toHaveBeenLastCalledWith('edit', 10)
    await button('指派').trigger('click')
    expect(mockFormOpen).toHaveBeenLastCalledWith('assign', 10)
    await button('详情').trigger('click')
    expect(mockDetailOpen).toHaveBeenLastCalledWith(10)
    await button('测试任务').trigger('click')
    expect(mockDetailOpen).toHaveBeenLastCalledWith(10)
    wrapper.findComponent({ name: 'TaskForm' }).vm.$emit('success')
    await flushPromises()
    expect(listMock).toHaveBeenCalledTimes(2)
  })
})

describe('任务状态变更与删除', () => {
  it.each([
    ['TODO', '开始处理', 'IN_PROGRESS'],
    ['IN_PROGRESS', '完成任务', 'DONE']
  ] as const)('%s 确认后只推进到 %s 对应的下一状态', async (status, label, target) => {
    mockUser.id = 3
    await render([task({ status })])
    await button(label).trigger('click')
    await flushPromises()
    expect(confirmMock).toHaveBeenCalledTimes(1)
    expect(changeTaskStatus).toHaveBeenCalledWith(10, target)
    expect(ElMessage.success).toHaveBeenCalledWith('状态更新成功')
    expect(listMock).toHaveBeenCalledTimes(2)
  })

  it('取消确认不会提交或刷新', async () => {
    await render()
    confirmMock.mockRejectedValueOnce('cancel')
    await button('删除').trigger('click')
    await flushPromises()
    expect(deleteTask).not.toHaveBeenCalled()
    expect(listMock).toHaveBeenCalledTimes(1)
    expect(ElMessage.success).not.toHaveBeenCalled()
  })

  it('删除末页最后一项后，重新查询最后一个有效页', async () => {
    await render()
    listMock.mockResolvedValueOnce(response([task()], 11))
    const pager = wrapper.findComponent(Pagination)
    pager.vm.$emit('update:page', 2)
    pager.vm.$emit('pagination')
    await flushPromises()
    listMock.mockResolvedValueOnce(response([], 10)).mockResolvedValueOnce(response([task({ id: 11 })], 10))
    await button('删除').trigger('click')
    await flushPromises()
    expect(deleteTask).toHaveBeenCalledWith(10)
    expect(ElMessage.success).toHaveBeenCalledWith('删除成功')
    expect(latestQuery().pageNum).toBe(1)
    expect(wrapper.findComponent(Pagination).props('page')).toBe(1)
    expect(wrapper.findComponent(Table).props('data')).toEqual([task({ id: 11 })])
  })

  it('确认期间锁定操作，避免重复提交', async () => {
    await render()
    let resolveConfirm!: (value: Awaited<ReturnType<typeof ElMessageBox.confirm>>) => void
    confirmMock.mockImplementationOnce(() => new Promise(resolve => { resolveConfirm = resolve }))
    await button('删除').trigger('click')
    expect(button('删除').attributes('disabled')).toBeDefined()
    await button('删除').trigger('click')
    expect(confirmMock).toHaveBeenCalledTimes(1)
    resolveConfirm(confirmed)
    await flushPromises()
    expect(deleteTask).toHaveBeenCalledTimes(1)
    expect(button('删除').attributes('disabled')).toBeUndefined()
  })

  it('写入失败不提示成功、不刷新，并恢复操作按钮', async () => {
    await render()
    jest.mocked(deleteTask).mockRejectedValueOnce(new Error('删除失败'))
    await button('删除').trigger('click')
    await flushPromises()
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(listMock).toHaveBeenCalledTimes(1)
    expect(button('删除').attributes('disabled')).toBeUndefined()
  })
})
