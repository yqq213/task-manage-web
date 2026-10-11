<template>
  <div class="app-container">
    <!-- 组合筛选：点击搜索统一查询，筛选条件不直接触发请求。 -->
    <el-form v-show="showSearch" :model="query" inline label-width="68px" @submit.prevent="search">
      <el-form-item label="关键词">
        <el-input v-model="query.keyword" placeholder="搜索标题或描述" maxlength="200" clearable @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部状态" clearable>
          <el-option v-for="(item, value) in statuses" :key="value" :label="item.label" :value="value" />
        </el-select>
      </el-form-item>
      <el-form-item label="优先级">
        <el-select v-model="query.priority" placeholder="全部优先级" clearable>
          <el-option v-for="(item, value) in priorities" :key="value" :label="item.label" :value="value" />
        </el-select>
      </el-form-item>
      <el-form-item label="负责人">
        <el-select v-model="query.assigneeId" placeholder="全部负责人" filterable clearable :loading="assigneesLoading" @visible-change="retryAssignees">
          <el-option v-for="user in assignees" :key="user.userId" :label="assigneeLabel(user)" :value="user.userId" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="assigneesError" title="负责人选项加载失败，可重新展开下拉框重试。" type="warning" :closable="false" show-icon class="mb8" role="alert" />
    <!-- 工具栏复用列显隐与刷新能力，列显示偏好按页面独立保存。 -->
    <el-row class="mb8">
      <el-col :span="12"><el-button type="primary" plain icon="Plus" @click="taskForm?.open('create')">新增</el-button></el-col>
      <el-col :span="12" style="display: flex; justify-content: flex-end;"><right-toolbar v-model:showSearch="showSearch" :columns="columns" storage-key="task-list-columns" @query-table="getList" /></el-col>
    </el-row>
    <el-alert v-if="listError" :title="listError" type="error" :closable="false" show-icon class="mb8" role="alert" />
    <el-table ref="tableRef" v-loading="loading" :aria-busy="loading" :data="tasks" :default-sort="{ prop: 'createTime', order: 'descending' }" :empty-text="listError ? '任务加载失败，请点击刷新重试' : '暂无任务'" @sort-change="sortChanged">
      <!-- custom 排序由后端执行，避免仅对当前页数据排序。 -->
      <el-table-column v-if="columns.title.visible" label="任务标题" prop="title" min-width="200" sortable="custom" show-overflow-tooltip>
        <template #default="{ row }"><el-button link type="primary" @click="taskDetail?.open(row.id)">{{ row.title }}</el-button></template>
      </el-table-column>
      <el-table-column v-if="columns.status.visible" label="状态" prop="status" width="110" align="center" sortable="custom">
        <template #default="{ row }"><el-tag :type="statuses[row.status as TaskStatus].type">{{ statuses[row.status as TaskStatus].label }}</el-tag></template>
      </el-table-column>
      <el-table-column v-if="columns.priority.visible" label="优先级" prop="priority" width="110" align="center" sortable="custom">
        <template #default="{ row }"><el-tag :type="priorities[row.priority as TaskPriority].type">{{ priorities[row.priority as TaskPriority].label }}</el-tag></template>
      </el-table-column>
      <el-table-column v-if="columns.assigneeName.visible" label="负责人" prop="assigneeName" min-width="110" align="center" show-overflow-tooltip />
      <el-table-column v-if="columns.creatorName.visible" label="创建人" prop="creatorName" min-width="110" align="center" show-overflow-tooltip />
      <el-table-column v-if="columns.dueDate.visible" label="截止时间" prop="dueDate" min-width="170" align="center" sortable="custom">
        <template #default="{ row }">{{ row.dueDate || '未设置' }}</template>
      </el-table-column>
      <el-table-column v-if="columns.createTime.visible" label="创建时间" prop="createTime" min-width="170" align="center" sortable="custom" />
      <el-table-column v-if="columns.updateTime.visible" label="更新时间" prop="updateTime" min-width="170" align="center" sortable="custom" />
      <el-table-column label="操作" fixed="right" width="310" align="center" class-name="small-padding fixed-width">
        <template #default="{ row }">
          <el-button link type="primary" @click="taskDetail?.open(row.id)">详情</el-button>
          <el-button v-if="canEdit(row)" link type="primary" :disabled="operating" @click="taskForm?.open('edit', row.id)">编辑</el-button>
          <el-button v-if="canEdit(row)" link type="primary" :disabled="operating" @click="taskForm?.open('assign', row.id)">指派</el-button>
          <el-button v-if="canAdvance(row)" link type="primary" :disabled="operating" @click="advance(row)">{{ row.status === 'TODO' ? '开始处理' : '完成任务' }}</el-button>
          <el-button v-if="canManage(row)" link type="danger" :disabled="operating" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="getList" />
    <!-- 子组件负责表单与详情，写入成功后由列表统一刷新数据。 -->
    <task-form ref="taskForm" @success="getList" />
    <task-detail ref="taskDetail" />
  </div>
</template>

<script setup lang="ts" name="TaskList">
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TableInstance } from 'element-plus'
import useUserStore from '@/store/modules/user'
import { changeTaskStatus, deleteTask, getTaskAssignees, listTasks } from '@/api/task'
import type { Task, TaskAssignee, TaskPriority, TaskQuery, TaskSortField, TaskStatus } from '@/types/api/task'
import type { TableShowColumns } from '@/types/api/common'
import Pagination from '@/components/Pagination/index.vue'
import RightToolbar from '@/components/RightToolbar/index.vue'
import TaskForm from './TaskForm.vue'
import TaskDetail from './TaskDetail.vue'
import { assigneeLabel, priorities, statuses } from './options'

const userStore = useUserStore()
// 与后端一致：用户编号 1 为超级管理员，admin 角色也具备全部任务管理权限。
const isAdmin = computed(() => Number(userStore.id) === 1 || userStore.roles.includes('admin'))
const tasks = ref<Task[]>([])
const total = ref(0)
const loading = ref(false)
const operating = ref(false)
const showSearch = ref(true)
const listError = ref('')
const assignees = ref<TaskAssignee[]>([])
const assigneesLoading = ref(false)
const assigneesError = ref(false)
const tableRef = ref<TableInstance>()
// 通过子组件公开的 open 方法打开指定任务，不在列表维护弹窗内部状态。
const taskForm = ref<InstanceType<typeof TaskForm>>()
const taskDetail = ref<InstanceType<typeof TaskDetail>>()
const query = reactive<TaskQuery>({ pageNum: 1, pageSize: 10, orderByColumn: 'createTime', isAsc: 'desc' })
// 默认列展示与用户管理一致，更新时间可通过工具栏按需开启。
const columns = ref<Record<string, TableShowColumns>>({
  title: { label: '任务标题', visible: true },
  status: { label: '状态', visible: true }, priority: { label: '优先级', visible: true },
  assigneeName: { label: '负责人', visible: true }, creatorName: { label: '创建人', visible: true },
  dueDate: { label: '截止时间', visible: true }, createTime: { label: '创建时间', visible: true },
  updateTime: { label: '更新时间', visible: false }
})
// 每次查询递增序号，只允许最新请求更新列表及加载状态。
let requestId = 0

/** 管理员或创建人可编辑、指派和删除；后端仍负责最终权限校验。 */
function canManage(task: Task): boolean { return isAdmin.value || Number(userStore.id) === task.creatorId }
/** 已完成任务不再提供编辑和指派入口，管理员也遵循此限制。 */
function canEdit(task: Task): boolean { return task.status !== 'DONE' && canManage(task) }
/** 仅管理员或负责人可推进状态；创建人身份本身不授予此权限。 */
function canAdvance(task: Task): boolean {
  return task.status !== 'DONE' && (isAdmin.value || Number(userStore.id) === task.assigneeId)
}

/** 只接收最后一次查询结果；删除末页最后一条后回到有效页。 */
async function getList(): Promise<void> {
  const current = ++requestId
  loading.value = true
  listError.value = ''
  try {
    const response = await listTasks({ ...query, keyword: query.keyword?.trim() || undefined })
    if (current !== requestId) return
    total.value = response.total
    const lastPage = Math.max(1, Math.ceil(response.total / query.pageSize))
    if (query.pageNum > lastPage) {
      query.pageNum = lastPage
      await getList()
      return
    }
    tasks.value = response.rows
  } catch {
    if (current === requestId) {
      tasks.value = []
      total.value = 0
      listError.value = '任务列表加载失败，请点击工具栏刷新重试。'
    }
  } finally {
    if (current === requestId) loading.value = false
  }
}

/** 加载负责人筛选选项，加载期间复用当前请求，失败后允许重新展开重试。 */
async function loadAssignees(): Promise<void> {
  if (assigneesLoading.value) return
  assigneesLoading.value = true
  try {
    assignees.value = (await getTaskAssignees()).data || []
    assigneesError.value = false
  } catch {
    assigneesError.value = true
  } finally {
    assigneesLoading.value = false
  }
}

/** 仅在展开下拉框且上次加载失败时重试，避免每次展开都请求。 */
function retryAssignees(open: boolean): void { if (open && assigneesError.value) void loadAssignees() }
/** 新条件查询从第一页开始，保留当前每页条数与排序。 */
function search(): void { query.pageNum = 1; void getList() }
/** 清空筛选并同步表头排序标记，恢复默认创建时间倒序。 */
function reset(): void {
  Object.assign(query, { keyword: undefined, status: undefined, priority: undefined, assigneeId: undefined, pageNum: 1, orderByColumn: 'createTime', isAsc: 'desc' })
  tableRef.value?.sort('createTime', 'descending')
  void getList()
}

/** 将表格排序方向转换为接口编码；取消排序时恢复默认顺序。 */
function sortChanged(sort: { prop: TaskSortField; order: 'ascending' | 'descending' | null }): void {
  query.orderByColumn = sort.order ? sort.prop : 'createTime'
  query.isAsc = sort.order === 'ascending' ? 'asc' : 'desc'
  search()
}

/** 确认框期间也锁定操作，避免重复确认或重复写入。 */
async function mutate(message: string, success: string, action: () => Promise<unknown>): Promise<void> {
  if (operating.value) return
  operating.value = true
  try {
    await ElMessageBox.confirm(message, '系统提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await action()
    ElMessage.success(success)
    await getList()
  } catch {
    // 用户取消无须反馈，接口失败由全局拦截器提示。
  } finally {
    operating.value = false
  }
}

/** 单向推进：待办→进行中→已完成，不提供跳级或退回操作。 */
function advance(task: Task): void {
  if (!canAdvance(task)) return
  const target: TaskStatus = task.status === 'TODO' ? 'IN_PROGRESS' : 'DONE'
  void mutate(`确认将任务“${task.title}”变更为${statuses[target].label}？${target === 'DONE' ? '完成后不能退回。' : ''}`, '状态更新成功', () => changeTaskStatus(task.id, target))
}

/** 单条删除复用确认与刷新流程，接口保留任务历史记录。 */
function remove(task: Task): void {
  if (canManage(task)) void mutate(`确认删除任务“${task.title}”？`, '删除成功', () => deleteTask(task.id))
}

// 首次进入并行加载列表和负责人选项；卸载后使尚未返回的列表请求失效。
onMounted(() => { void getList(); void loadAssignees() })
onBeforeUnmount(() => { ++requestId })
</script>
