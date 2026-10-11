<template>
  <div class="app-container" :aria-busy="loading">
    <!-- 日期选择与已查询范围独立保存，避免旧图表被误认为新范围的数据。 -->
    <el-card shadow="always" class="mb20">
      <el-row :gutter="20" align="middle">
        <el-col :xs="24" :md="9">
          <h2 class="mt5 mb10">数据看板</h2>
          <el-text type="info">看清任务分布，跟进我的完成情况</el-text>
        </el-col>
        <el-col :xs="24" :md="15">
          <el-form inline class="mt10" @submit.prevent="queryStats">
            <el-form-item label="创建日期" :style="{ maxWidth: '100%' }">
              <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" aria-label="任务创建日期范围" :style="{ width: '100%' }" :disabled="loading" clearable />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="Search" :loading="loading" @click="queryStats">查询</el-button>
              <el-button :disabled="loading" @click="reset">重置</el-button>
            </el-form-item>
          </el-form>
          <el-space wrap>
            <el-button v-for="item in presets" :key="item.key" size="small" :type="selectedPreset === item.key ? 'primary' : 'default'" :plain="selectedPreset === item.key" :disabled="loading" :aria-pressed="selectedPreset === item.key" @click="selectPreset(item.key)">{{ item.label }}</el-button>
            <el-text size="small" type="info">按北京时间的创建日期统计，包含起止日期</el-text>
          </el-space>
        </el-col>
      </el-row>
    </el-card>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon role="alert" class="mb20">
      <el-button link type="primary" :loading="loading" @click="queryStats">重新查询</el-button>
    </el-alert>
    <el-skeleton v-if="loading && !stats" :rows="8" animated />
    <template v-if="stats">
      <el-space wrap class="mb20">
        <el-tag effect="plain">{{ stats.scope === 'ALL' ? '全局任务' : '我创建或负责的任务' }}</el-tag>
        <el-text type="info">{{ appliedRange }}</el-text>
        <el-tag v-if="pending" type="warning" effect="plain">日期已调整，点击查询更新</el-tag>
      </el-space>

      <!-- 总量和三个状态组成连续进度带，状态顺序与业务流转一致。 -->
      <el-card shadow="always" class="mb20" v-loading="loading">
        <el-row :gutter="20">
          <el-col :xs="12" :sm="6"><el-statistic title="任务总数" :value="stats.total" :value-style="{ fontWeight: 'bold' }" /></el-col>
          <el-col v-for="item in stats.statusDistribution" :key="item.code" :xs="12" :sm="6">
            <el-statistic :title="item.name" :value="item.count" :value-style="{ color: `var(${statusColors[item.code]})`, fontWeight: 'bold' }" />
            <el-text size="small" type="info">占比 {{ item.percentage }}%</el-text>
          </el-col>
        </el-row>
        <div v-if="stats.total" class="mt20" aria-hidden="true" :style="{ display: 'flex', height: 'var(--el-font-size-extra-small)', borderRadius: 'var(--el-border-radius-base)', overflow: 'hidden' }">
          <div v-for="item in stats.statusDistribution" :key="item.code" :style="{ flex: item.count, backgroundColor: `var(${statusColors[item.code]})` }" />
        </div>
      </el-card>

      <el-row :gutter="20">
        <el-col :xs="24" :lg="14" class="mb20">
          <el-card shadow="always" v-loading="loading">
            <template #header><el-space direction="vertical" alignment="start"><strong>任务状态分布</strong><el-text size="small" type="info">从待办到完成，查看任务当前进度</el-text></el-space></template>
            <distribution-chart v-if="stats.total" kind="bar" :items="statusItems" :description="chartDescription(statusItems)" />
            <el-empty v-else description="当前日期范围内暂无任务，可扩大范围后查询" />
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="10" class="mb20">
          <el-card shadow="always" v-loading="loading">
            <template #header><el-space direction="vertical" alignment="start"><strong>优先级分布</strong><el-text size="small" type="info">查看任务轻重缓急与数量占比</el-text></el-space></template>
            <distribution-chart v-if="stats.total" kind="pie" :items="priorityItems" :description="chartDescription(priorityItems)" />
            <el-empty v-else description="当前日期范围内暂无任务，可扩大范围后查询" />
            <el-row v-if="stats.total" :gutter="10">
              <el-col v-for="item in stats.priorityDistribution" :key="item.code" :span="8">
                <el-tag :type="priorityTags[item.code]" effect="plain">{{ item.name }}优先级</el-tag>
                <p class="mb5">{{ item.count }} 项 · {{ item.percentage }}%</p>
              </el-col>
            </el-row>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="always" v-loading="loading">
        <template #header><el-space wrap><strong>我的任务完成情况</strong><el-tag type="info" effect="plain">我负责的任务</el-tag></el-space></template>
        <el-row :gutter="20" align="middle">
          <el-col :xs="24" :sm="6">
            <el-progress type="dashboard" :percentage="stats.personalCompletionRate" :color="'var(--el-color-success)'">
              <el-statistic title="个人完成率" :value="stats.personalCompletionRate" suffix="%" />
            </el-progress>
          </el-col>
          <el-col :xs="24" :sm="18">
            <el-row :gutter="20">
              <el-col :span="8"><el-statistic title="负责总数" :value="stats.personalTotal" /></el-col>
              <el-col :span="8"><el-statistic title="已完成" :value="stats.personalCompleted" /></el-col>
              <el-col :span="8"><el-statistic title="未完成" :value="stats.personalTotal - stats.personalCompleted" /></el-col>
            </el-row>
            <p><el-text type="info">{{ stats.personalTotal ? `已完成 ${stats.personalCompleted} / ${stats.personalTotal} 项负责的任务` : '当前日期范围内没有我负责的任务' }}。个人完成率按已完成数 ÷ 负责总数计算。</el-text></p>
          </el-col>
        </el-row>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts" name="Index">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getTaskStats } from '@/api/task'
import type { TaskStats, TaskStatus, TaskPriority } from '@/types/api/task'
import DistributionChart from './dashboard/DistributionChart.vue'

type Preset = 'week' | 'month' | 'currentMonth' | 'all'
const presets: { key: Preset; label: string }[] = [
  { key: 'week', label: '近 7 天' }, { key: 'month', label: '近 30 天' },
  { key: 'currentMonth', label: '本月' }, { key: 'all', label: '全部' }
]
const statusColors: Record<TaskStatus, string> = { TODO: '--el-color-warning', IN_PROGRESS: '--el-color-primary', DONE: '--el-color-success' }
const priorityColors: Record<TaskPriority, string> = { HIGH: '--el-color-danger', MEDIUM: '--el-color-warning', LOW: '--el-color-info' }
const priorityTags: Record<TaskPriority, 'danger' | 'warning' | 'info'> = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'info' }
const dateRange = ref<[string, string] | null>(null)
const applied = ref<[string, string] | null>(null)
const stats = ref<TaskStats>()
const loading = ref(false)
const error = ref('')
let requestId = 0

/** 在北京时间计算自然日，避免浏览器时区不同造成快捷范围偏移。 */
function presetRange(key: Preset): [string, string] | null {
  if (key === 'all') return null
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (type: string): string => parts.find(item => item.type === type)!.value
  const end = `${part('year')}-${part('month')}-${part('day')}`
  const start = new Date(`${end}T00:00:00Z`)
  if (key === 'currentMonth') start.setUTCDate(1)
  else start.setUTCDate(start.getUTCDate() - (key === 'week' ? 6 : 29))
  return [start.toISOString().slice(0, 10), end]
}
const selectedPreset = computed(() => presets.find(item => JSON.stringify(presetRange(item.key)) === JSON.stringify(dateRange.value))?.key)
const pending = computed(() => JSON.stringify(dateRange.value) !== JSON.stringify(applied.value))
const appliedRange = computed(() => applied.value ? `${applied.value[0]} 至 ${applied.value[1]}` : '全部时间')
const statusItems = computed(() => stats.value?.statusDistribution.map(item => ({ ...item, color: statusColors[item.code] })) || [])
const priorityItems = computed(() => stats.value?.priorityDistribution.map(item => ({ ...item, color: priorityColors[item.code] })) || [])
function chartDescription(items: { name: string; count: number; percentage: number }[]): string {
  return items.map(item => `${item.name} ${item.count} 项，占比 ${item.percentage}%`).join('；')
}
function selectPreset(key: Preset): void { dateRange.value = presetRange(key) }
function reset(): void { selectPreset('month'); void queryStats() }

/** 成功后才更新范围标签；失败保留原图表，并明确提示查询失败。 */
async function queryStats(): Promise<void> {
  const current = ++requestId
  const range = dateRange.value ? [...dateRange.value] as [string, string] : null
  loading.value = true
  error.value = ''
  try {
    const response = await getTaskStats(range ? { startDate: range[0], endDate: range[1] } : {})
    if (current !== requestId) return
    if (!response.data) throw new Error('统计数据为空')
    stats.value = response.data
    applied.value = range
  } catch {
    if (current === requestId) error.value = '统计查询失败，请重新查询。下方如有图表，仍为上次成功查询的数据。'
  } finally {
    if (current === requestId) loading.value = false
  }
}
selectPreset('month')
onMounted(() => { void queryStats() })
onBeforeUnmount(() => { ++requestId })
</script>
