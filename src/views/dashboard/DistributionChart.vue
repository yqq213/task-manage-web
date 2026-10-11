<template>
  <div ref="container" role="img" :aria-label="description" :style="{ width: '100%', aspectRatio: '2 / 1', minHeight: '240px' }" />
</template>

<script setup lang="ts">
import { init } from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import { GraphicComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { use } from 'echarts/core'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
import { nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'

use([BarChart, PieChart, GraphicComponent, GridComponent, TooltipComponent, CanvasRenderer])
/** 首页两类分布图共用的数据结构，颜色引用项目主题 Token。 */
interface ChartItem { name: string; count: number; percentage: number; color: string }
const props = defineProps<{ kind: 'bar' | 'pie'; items: ChartItem[]; description: string }>()
const container = ref<HTMLDivElement>()
let chart: ECharts | undefined
let observer: ResizeObserver | undefined
let themeObserver: MutationObserver | undefined
// keep-alive 离开页面时不会卸载，禁止从脱离文档的容器读取主题并重绘。
let active = true

/** 从当前主题读取颜色；切换主题后重绘，不将 CSS 变量直接传给 canvas。 */
function render(): void {
  if (!active || !container.value?.isConnected || !chart) return
  const styles = getComputedStyle(container.value)
  const rootStyles = getComputedStyle(document.documentElement)
  const color = (token: string): string => styles.getPropertyValue(token).trim() || rootStyles.getPropertyValue(token).trim()
  const textColor = color('--el-text-color-regular')
  const data = props.items.map(item => ({ name: item.name, value: item.count, itemStyle: { color: color(item.color) } }))
  const option: EChartsCoreOption = {
    animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    textStyle: { color: textColor, fontFamily: styles.fontFamily },
    tooltip: { trigger: 'item', confine: true },
    ...(props.kind === 'bar' ? {
      grid: { left: '4%', right: '12%', top: '12%', bottom: '10%', containLabel: true },
      xAxis: { type: 'value', minInterval: 1, axisLabel: { color: textColor }, splitLine: { lineStyle: { color: color('--el-border-color-lighter') } } },
      yAxis: { type: 'category', inverse: true, data: props.items.map(item => item.name), axisLabel: { color: textColor }, axisLine: { show: false }, axisTick: { show: false } },
      series: [{ type: 'bar', data, barMaxWidth: 26, label: { show: true, position: 'right', color: textColor, formatter: '{c} 项' }, showBackground: true, backgroundStyle: { color: color('--el-fill-color-light') } }]
    } : {
      series: [{ type: 'pie', radius: ['55%', '78%'], center: ['50%', '50%'], avoidLabelOverlap: true, label: { show: false }, data, itemStyle: { borderColor: color('--el-bg-color'), borderWidth: 3 }, tooltip: { formatter: '{b}<br/>{c} 项 · {d}%' } }],
      graphic: { type: 'text', left: 'center', top: 'middle', style: { text: '优先级分布', fill: textColor, font: `14px ${styles.fontFamily}` } }
    })
  }
  chart.setOption(option, true)
}

watch(() => props.items, render, { deep: true })
onMounted(() => {
  if (!container.value) return
  chart = init(container.value)
  observer = new ResizeObserver(() => {
    if (active && container.value?.isConnected) chart?.resize()
  })
  observer.observe(container.value)
  themeObserver = new MutationObserver(render)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] })
  render()
})
/** 缓存页面恢复后重新写入有效主题颜色，resize 本身无法修复错误的图表配置。 */
onActivated(async () => {
  active = true
  await nextTick()
  if (!active || !container.value?.isConnected) return
  render()
  chart?.resize()
})
onDeactivated(() => { active = false })
onBeforeUnmount(() => { observer?.disconnect(); themeObserver?.disconnect(); chart?.dispose() })
</script>
