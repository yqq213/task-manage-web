<template>
  <div ref="container" role="img" :aria-label="description" :style="{ width: '100%', aspectRatio: '2 / 1', minHeight: '240px' }" />
</template>

<script setup lang="ts">
import { init, use, graphic } from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import { GraphicComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
import { nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'

use([BarChart, PieChart, GraphicComponent, GridComponent, TooltipComponent, CanvasRenderer])
/** 首页两类分布图共用的数据结构，颜色引用看板业务 Token。 */
interface ChartItem { name: string; count: number; percentage: number; color: string }
const props = defineProps<{ kind: 'bar' | 'pie'; items: ChartItem[]; description: string }>()
const container = ref<HTMLDivElement>()
let chart: ECharts | undefined
let observer: ResizeObserver | undefined
let themeObserver: MutationObserver | undefined
// keep-alive 离开页面时不会卸载，禁止从脱离文档的容器读取主题并重绘。
let active = true

function tokenColor(styles: CSSStyleDeclaration, rootStyles: CSSStyleDeclaration, token: string): string {
  return styles.getPropertyValue(token).trim() || rootStyles.getPropertyValue(token).trim()
}

function paint(styles: CSSStyleDeclaration, rootStyles: CSSStyleDeclaration, token: string): { main: string; soft: string } {
  const main = tokenColor(styles, rootStyles, token)
  return { main, soft: tokenColor(styles, rootStyles, `${token}-soft`) || main }
}

function barFill(main: string, soft: string) {
  return new graphic.LinearGradient(0, 0, 1, 0, [
    { offset: 0, color: soft },
    { offset: 1, color: main }
  ])
}

function pieFill(main: string, soft: string) {
  return new graphic.LinearGradient(0, 0, 1, 1, [
    { offset: 0, color: soft },
    { offset: 1, color: main }
  ])
}

/** 从当前主题读取颜色；切换主题后重绘，不将 CSS 变量直接传给 canvas。 */
function render(): void {
  if (!active || !container.value?.isConnected || !chart) return
  const styles = getComputedStyle(container.value)
  const rootStyles = getComputedStyle(document.documentElement)
  const color = (token: string): string => tokenColor(styles, rootStyles, token)
  const textColor = color('--el-text-color-regular')
  const ink = color('--workspace-ink') || color('--el-text-color-primary')
  const muted = color('--workspace-muted') || textColor
  const fills = props.items.map(item => paint(styles, rootStyles, item.color))
  const option: EChartsCoreOption = {
    animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    textStyle: { color: textColor, fontFamily: styles.fontFamily },
    tooltip: { trigger: 'item', confine: true },
    ...(props.kind === 'bar' ? {
      grid: { left: '4%', right: '12%', top: '12%', bottom: '10%', containLabel: true },
      xAxis: { type: 'value', minInterval: 1, axisLabel: { color: textColor }, splitLine: { lineStyle: { color: color('--workspace-line') || color('--el-border-color-lighter') } } },
      yAxis: { type: 'category', inverse: true, data: props.items.map(item => item.name), axisLabel: { color: ink }, axisLine: { show: false }, axisTick: { show: false } },
      series: [{
        type: 'bar',
        data: props.items.map((item, index) => ({
          name: item.name,
          value: item.count,
          itemStyle: { color: barFill(fills[index].main, fills[index].soft), borderRadius: [0, 8, 8, 0] }
        })),
        barMaxWidth: 22,
        label: { show: true, position: 'right', color: muted, formatter: '{c} 项' },
        showBackground: true,
        backgroundStyle: { color: color('--workspace-canvas') || color('--el-fill-color-light'), borderRadius: [0, 8, 8, 0] }
      }]
    } : {
      series: [{
        type: 'pie',
        radius: ['52%', '76%'],
        center: ['50%', '50%'],
        padAngle: 2,
        avoidLabelOverlap: true,
        label: { show: false },
        data: props.items.map((item, index) => ({
          name: item.name,
          value: item.count,
          itemStyle: { color: pieFill(fills[index].main, fills[index].soft) }
        })),
        itemStyle: { borderColor: color('--workspace-surface') || color('--el-bg-color'), borderWidth: 3, borderRadius: 8 },
        tooltip: { formatter: '{b}<br/>{c} 项 · {d}%' }
      }],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '43%',
          style: { text: String(props.items.reduce((sum, item) => sum + item.count, 0)), fill: ink, font: `700 28px ${styles.fontFamily}`, textAlign: 'center', textVerticalAlign: 'middle' }
        },
        {
          type: 'text',
          left: 'center',
          top: '58%',
          style: { text: '项', fill: muted, font: `12px ${styles.fontFamily}`, textAlign: 'center', textVerticalAlign: 'middle' }
        }
      ]
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
