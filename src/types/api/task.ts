import type { BaseEntity, PageDomain } from './common'

/** 与后端枚举保持一致，界面文案不参与请求。 */
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
/** 低、中、高优先级的接口编码。 */
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
/** 后端查询允许的排序字段白名单。 */
export type TaskSortField = 'createTime' | 'updateTime' | 'dueDate' | 'priority' | 'status' | 'title'

/** 列表与详情共用的任务实体，审计字段继承自 BaseEntity。 */
export interface Task extends BaseEntity {
  id: number
  title: string
  /** 未填写描述时可为 null。 */
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  /** 负责人负责推进状态，创建人负责编辑、指派和删除。 */
  assigneeId: number
  assigneeName: string
  creatorId: number
  creatorName: string
  /** 日期格式为 yyyy-MM-dd HH:mm:ss，未设置截止时间时为 null。 */
  dueDate: string | null
  /** 后端在任务进入已完成状态时记录，未完成时为 null。 */
  completedTime: string | null
}

/** 可选筛选项未传时不限制该条件；可见任务范围不能由客户端指定。 */
export interface TaskQuery extends PageDomain {
  pageNum: number
  pageSize: number
  /** 同时搜索标题和描述。 */
  keyword?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: number
  /** 默认按 createTime 降序，排序由后端对完整结果集执行。 */
  orderByColumn: TaskSortField
  isAsc: 'asc' | 'desc'
}

/** 编辑只能覆盖这四个字段，负责人通过独立接口调整。 */
export interface TaskEdit {
  title: string
  /** 提交 null 清空已有描述，而非保留原值。 */
  description: string | null
  priority: TaskPriority
  /** 提交 null 清空截止时间，非空值使用 yyyy-MM-dd HH:mm:ss。 */
  dueDate: string | null
}

/** 创建必须指定负责人；状态、创建人及审计字段由后端生成。 */
export interface TaskCreate extends TaskEdit {
  assigneeId: number
}

/** 下拉选项使用的最小用户信息，不依赖用户管理完整实体。 */
export interface TaskAssignee {
  userId: number
  userName: string
  nickName: string
}

/** 详情接口返回的操作历史，字段快照保留后端原始 JSON 字符串。 */
export interface TaskLog {
  id: number
  taskId: number
  operatorId: number
  operatorName: string
  action: string
  /** 创建记录没有变更前快照，可为 null。 */
  beforeData: string | null
  afterData: string | null
  remark: string
  createTime: string
}

/** 单次详情读取同时返回任务与对应操作记录。 */
export interface TaskDetail {
  task: Task
  logs: TaskLog[]
}

/** 统计按北京时间的任务创建日期筛选，日期边界包含当天。 */
export interface TaskStatsQuery {
  startDate?: string
  endDate?: string
}

export interface TaskDistribution<Code extends string> {
  code: Code
  name: string
  count: number
  /** 后端计算的百分比，范围 0～100。 */
  percentage: number
}

export interface TaskStats {
  /** ALL 为管理员全局范围，VISIBLE 为普通用户创建或负责的任务。 */
  scope: 'ALL' | 'VISIBLE'
  total: number
  statusDistribution: TaskDistribution<TaskStatus>[]
  priorityDistribution: TaskDistribution<TaskPriority>[]
  /** 个人指标始终只计算当前用户负责的任务，包括管理员。 */
  personalTotal: number
  personalCompleted: number
  personalCompletionRate: number
}
