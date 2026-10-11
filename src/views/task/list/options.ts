import type { TaskAssignee, TaskPriority, TaskStatus } from '@/types/api/task'

/** 列表、筛选、表单和详情共享枚举文案。 */
export const statuses: Record<TaskStatus, { label: string; type: 'info' | 'primary' | 'success' }> = {
  TODO: { label: '待办', type: 'info' },
  IN_PROGRESS: { label: '进行中', type: 'primary' },
  DONE: { label: '已完成', type: 'success' }
}
/** 优先级编码用于请求，标签类型仅控制界面展示。 */
export const priorities: Record<TaskPriority, { label: string; type: 'info' | 'warning' | 'danger' }> = {
  LOW: { label: '低', type: 'info' },
  MEDIUM: { label: '中', type: 'warning' },
  HIGH: { label: '高', type: 'danger' }
}
/** 后端操作日志编码映射；详情对未知编码保留原值，避免显示为空。 */
export const actions: Record<string, string> = {
  CREATE: '创建任务', UPDATE: '编辑任务', ASSIGN: '指派负责人', STATUS: '变更状态', DELETE: '删除任务'
}
/** 同时展示昵称和账号，便于区分同名用户；昵称为空时仅显示账号。 */
export function assigneeLabel(user: TaskAssignee): string {
  return user.nickName ? `${user.nickName}（${user.userName}）` : user.userName
}
