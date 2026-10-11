<template>
  <el-dialog v-model="visible" :title="titles[mode]" width="600px" append-to-body destroy-on-close :close-on-click-modal="false" :before-close="close" @closed="formRef?.clearValidate()">
    <div v-loading="loading" :aria-busy="loading">
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="mb20" role="alert" />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" :disabled="loading || saving" @submit.prevent="submit">
        <!-- 新增与编辑共用基础字段，指派模式仅展示负责人。 -->
        <template v-if="mode !== 'assign'">
          <el-form-item label="任务标题" prop="title">
            <el-input v-model="form.title" placeholder="请输入任务标题" maxlength="200" show-word-limit />
          </el-form-item>
          <el-form-item label="任务描述" prop="description">
            <el-input v-model="form.description" type="textarea" :rows="5" placeholder="请输入任务描述" maxlength="5000" show-word-limit />
          </el-form-item>
          <el-form-item label="优先级" prop="priority">
            <el-select v-model="form.priority" placeholder="请选择优先级">
              <el-option v-for="(item, value) in priorities" :key="value" :label="item.label" :value="value" />
            </el-select>
          </el-form-item>
          <el-form-item label="截止时间" prop="dueDate">
            <el-date-picker v-model="form.dueDate" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="请选择截止时间" :disabled-date="disabledDate" :disabled-hours="disabledHours" :disabled-minutes="disabledMinutes" :disabled-seconds="disabledSeconds" clearable />
          </el-form-item>
        </template>
        <!-- 编辑接口不接受负责人，已有任务通过独立指派操作调整。 -->
        <el-form-item v-if="mode !== 'edit'" label="负责人" prop="assigneeId">
          <el-select v-model="form.assigneeId" placeholder="请选择负责人" filterable clearable :loading="loading">
            <el-option v-for="user in assignees" :key="user.userId" :label="assigneeLabel(user)" :value="user.userId" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button type="primary" :loading="saving" :disabled="loading || !!error" @click="submit">确 定</el-button>
      <el-button :disabled="saving" @click="close">取 消</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { assignTask, createTask, editTask, getTask, getTaskAssignees } from '@/api/task'
import type { TaskAssignee, TaskEdit } from '@/types/api/task'
import { assigneeLabel, priorities } from './options'

/** 三种模式分别对应创建、编辑基础信息和指派负责人接口。 */
type FormMode = 'create' | 'edit' | 'assign'
/** 负责人选择前可为空，校验通过后才组装创建或指派请求。 */
interface TaskFormData extends TaskEdit { assigneeId?: number }
const emit = defineEmits<{ success: [] }>()
const titles: Record<FormMode, string> = { create: '添加任务', edit: '编辑任务', assign: '指派负责人' }
const visible = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const mode = ref<FormMode>('create')
const taskId = ref<number>()
const formRef = ref<FormInstance>()
const assignees = ref<TaskAssignee[]>([])
const form = reactive<TaskFormData>({ title: '', description: '', priority: 'MEDIUM', dueDate: null })
// 编辑时允许原样保留历史截止时间，重新设置的时间必须通过当前时间校验。
let originalDueDate: string | null = null
const parseDate = (value: string): Date => new Date(value.replace(' ', 'T'))
const rangeBefore = (end: number): number[] => Array.from({ length: end }, (_, index) => index)

/** 按本地自然日禁用昨天及以前的日期，今天的时分秒另行限制。 */
function disabledDate(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() < today.getTime()
}

function isToday(): boolean {
  return !form.dueDate || parseDate(form.dueDate).toDateString() === new Date().toDateString()
}

/** 未来日期可选全天；今天逐级禁用当前时、分、秒以前的值。 */
function disabledHours(): number[] {
  return isToday() ? rangeBefore(new Date().getHours()) : []
}
function disabledMinutes(hour: number): number[] {
  const now = new Date()
  return isToday() && hour === now.getHours() ? rangeBefore(now.getMinutes()) : []
}
function disabledSeconds(hour: number, minute: number): number[] {
  const now = new Date()
  return isToday() && hour === now.getHours() && minute === now.getMinutes() ? rangeBefore(now.getSeconds()) : []
}
// 字符长度与后端 DTO 一致；仅当前模式渲染的表单项参与校验。
const rules: FormRules<TaskFormData> = {
  title: [{ required: true, whitespace: true, message: '任务标题不能为空', trigger: 'blur' }, { max: 200, message: '标题不能超过200字符', trigger: 'blur' }],
  description: [{ max: 5000, message: '描述不能超过5000字符', trigger: 'blur' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  assigneeId: [{ required: true, message: '请选择负责人', trigger: 'change' }],
  dueDate: [{
    validator: (_rule, value: string | null, callback) => {
      if (!value || (mode.value === 'edit' && value === originalDueDate)) return callback()
      const time = parseDate(value).getTime()
      // 接口精度为秒，当前秒允许选择；保存时重新读取时间，防止过期值提交。
      callback(Number.isFinite(time) && time >= Math.floor(Date.now() / 1000) * 1000 ? undefined : new Error('截止时间不能早于当前时间'))
    },
    trigger: ['blur', 'change']
  }]
}
// 关闭或重新打开表单时递增，使前一次异步加载结果失效。
let requestId = 0

/** 编辑前重新读取详情，避免使用列表中的旧数据；独立模式只显示可写字段。 */
async function open(nextMode: FormMode, id?: number): Promise<void> {
  const current = ++requestId
  mode.value = nextMode
  taskId.value = id
  originalDueDate = null
  error.value = ''
  Object.assign(form, { title: '', description: '', priority: 'MEDIUM', dueDate: null, assigneeId: undefined })
  assignees.value = []
  visible.value = true
  loading.value = true
  await nextTick()
  formRef.value?.clearValidate()
  try {
    // 新增无需详情，编辑无需负责人选项；其他所需数据并行加载。
    const [detail, users] = await Promise.all([
      id === undefined ? Promise.resolve(undefined) : getTask(id),
      nextMode === 'edit' ? Promise.resolve(undefined) : getTaskAssignees()
    ])
    if (current !== requestId) return
    if (id !== undefined && !detail?.data) throw new Error('任务详情为空')
    if (detail?.data) {
      const task = detail.data.task
      originalDueDate = task.dueDate
      Object.assign(form, { title: task.title, description: task.description, priority: task.priority, dueDate: task.dueDate, assigneeId: task.assigneeId })
    }
    assignees.value = users?.data || []
    // 已停用负责人不在候选列表中，必须重新选择有效用户。
    if (nextMode === 'assign' && !assignees.value.some(user => user.userId === form.assigneeId)) form.assigneeId = undefined
  } catch {
    if (current === requestId) error.value = '任务信息加载失败，请关闭后重试。'
  } finally {
    if (current === requestId) loading.value = false
  }
}

/** 保存期间禁止关闭，避免请求仍在进行时丢失表单上下文。 */
function close(): void {
  if (saving.value) return
  ++requestId
  visible.value = false
}

/** 显式组装白名单请求；null 表示清空描述或截止时间。 */
async function submit(): Promise<void> {
  if (loading.value || saving.value || error.value || !await formRef.value?.validate().catch(() => false)) return
  saving.value = true
  try {
    const payload: TaskEdit = { title: form.title.trim(), description: form.description || null, priority: form.priority, dueDate: form.dueDate || null }
    if (mode.value === 'create' && form.assigneeId !== undefined) await createTask({ ...payload, assigneeId: form.assigneeId })
    else if (mode.value === 'edit' && taskId.value !== undefined) await editTask(taskId.value, payload)
    else if (mode.value === 'assign' && taskId.value !== undefined && form.assigneeId !== undefined) await assignTask(taskId.value, form.assigneeId)
    else return
    ElMessage.success(mode.value === 'assign' ? '指派成功' : '保存成功')
    visible.value = false
    emit('success')
  } catch {
    // 具体错误由全局请求拦截器反馈，表单保持打开以便重试。
  } finally {
    saving.value = false
  }
}

// 父列表只需指定模式与任务编号，内部负责重置、回填和提交。
defineExpose({ open })
</script>
