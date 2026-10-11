import request from '@/utils/request'
import type { AjaxResult, TableDataInfo } from '@/types/api/common'
import type { Task, TaskAssignee, TaskCreate, TaskDetail, TaskEdit, TaskQuery, TaskStatus } from '@/types/api/task'
import type { TaskStats, TaskStatsQuery } from '@/types/api/task'

// 对齐 TaskController 路由，鉴权、失败提示和重复提交检查由全局请求封装处理。
const url = '/task/tasks'

/** 日期省略时统计全部时间；统计范围和个人完成率由后端统一计算。 */
export function getTaskStats(params: TaskStatsQuery): Promise<AjaxResult<TaskStats>> {
  return request({ url: `${url}/stats`, method: 'get', params })
}

/** 分页与组合筛选，响应直接返回 rows 和 total，用户可见范围由后端限定。 */
export function listTasks(params: TaskQuery): Promise<TableDataInfo<Task>> {
  return request({ url: `${url}/list`, method: 'get', params })
}

/** 读取任务基础信息与操作历史，业务数据位于响应 data 中。 */
export function getTask(id: number): Promise<AjaxResult<TaskDetail>> {
  return request({ url: `${url}/${id}`, method: 'get' })
}

/** 获取可选负责人，仅包含有效用户的编号、账号与昵称。 */
export function getTaskAssignees(): Promise<AjaxResult<TaskAssignee[]>> {
  return request({ url: `${url}/assignees`, method: 'get' })
}

/** 创建成功返回任务编号；创建人和初始待办状态由后端设置。 */
export function createTask(data: TaskCreate): Promise<AjaxResult<number>> {
  return request({ url, method: 'post', data })
}

/** 仅更新基础信息，负责人和状态分别使用独立接口。 */
export function editTask(id: number, data: TaskEdit): Promise<AjaxResult> {
  return request({ url: `${url}/${id}`, method: 'put', data })
}

/** 指派单个负责人，后端校验操作权限和负责人是否有效。 */
export function assignTask(id: number, assigneeId: number): Promise<AjaxResult> {
  return request({ url: `${url}/${id}/assignee`, method: 'put', data: { assigneeId } })
}

/** 提交目标状态，后端只允许待办→进行中→已完成的单向流转。 */
export function changeTaskStatus(id: number, status: TaskStatus): Promise<AjaxResult> {
  return request({ url: `${url}/${id}/status`, method: 'put', data: { status } })
}

/** 单条逻辑删除，后端保留操作历史并校验记录级管理权限。 */
export function deleteTask(id: number): Promise<AjaxResult> {
  return request({ url: `${url}/${id}`, method: 'delete' })
}
