<template>
  <el-drawer v-model="visible" class="task-detail-drawer" title="任务详情" size="68%" append-to-body @closed="invalidate">
    <div v-loading="loading" :aria-busy="loading">
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon role="alert" />
      <template v-if="detail">
        <!-- 基础字段来自详情接口；姓名缺失时保留编号，日期为空时显示占位文案。 -->
        <el-descriptions title="基本信息" :column="2" border>
          <el-descriptions-item label="任务编号">{{ detail.task.id }}</el-descriptions-item>
          <el-descriptions-item label="任务标题">{{ detail.task.title }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag :type="statuses[detail.task.status].type">{{ statuses[detail.task.status].label }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="优先级"><el-tag :type="priorities[detail.task.priority].type">{{ priorities[detail.task.priority].label }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="负责人">{{ detail.task.assigneeName || detail.task.assigneeId }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ detail.task.creatorName || detail.task.creatorId }}</el-descriptions-item>
          <el-descriptions-item label="截止时间">{{ detail.task.dueDate || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ detail.task.completedTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detail.task.createTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ detail.task.updateTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="任务描述" :span="2"><el-input :model-value="detail.task.description || '无描述'" type="textarea" :autosize="{ minRows: 2 }" readonly aria-label="任务描述" /></el-descriptions-item>
        </el-descriptions>
        <!-- 操作记录与任务由同一个详情接口返回，按接口顺序展示。 -->
        <h3>操作记录</h3>
        <el-table :data="detail.logs" empty-text="暂无操作记录">
          <el-table-column label="操作时间" prop="createTime" min-width="170" />
          <el-table-column label="操作人" prop="operatorName" min-width="100" show-overflow-tooltip />
          <el-table-column label="操作" min-width="110"><template #default="{ row }">{{ actions[row.action] || row.action }}</template></el-table-column>
          <el-table-column label="说明" prop="remark" min-width="200" show-overflow-tooltip />
        </el-table>
      </template>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { getTask } from '@/api/task'
import type { TaskDetail } from '@/types/api/task'
import { actions, priorities, statuses } from './options'

const visible = ref(false)
const loading = ref(false)
const error = ref('')
const detail = ref<TaskDetail>()
// 独立于列表请求的序号，防止抽屉快速切换任务时发生数据串联。
let requestId = 0

/** 请求序号防止快速切换任务时旧响应覆盖新详情。 */
async function open(id: number): Promise<void> {
  const current = ++requestId
  detail.value = undefined
  error.value = ''
  visible.value = true
  loading.value = true
  try {
    const response = await getTask(id)
    if (current !== requestId) return
    if (!response.data) throw new Error('任务详情为空')
    detail.value = response.data
  } catch {
    if (current === requestId) error.value = '任务详情加载失败，请关闭后重试。'
  } finally {
    if (current === requestId) loading.value = false
  }
}

/** 抽屉关闭后忽略尚未返回的请求，避免旧数据写入已关闭的详情。 */
function invalidate(): void { ++requestId }
// 列表仅通过任务编号打开详情，抽屉自行管理请求与展示状态。
defineExpose({ open })
</script>
