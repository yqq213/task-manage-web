<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/** 与锁屏一致的漂浮粒子和近距离连线，仅用于装饰背景。 */
interface Particle { x: number; y: number; radius: number; vx: number; vy: number; alpha: number }
const canvas = ref<HTMLCanvasElement>()
let context: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let frame = 0
let lastTime = 0
let width = 0
let height = 0
let color = ''
let observer: ResizeObserver | undefined
let motion: MediaQueryList | undefined
const LINK_DISTANCE = 120

function stop(): void { cancelAnimationFrame(frame); frame = 0; lastTime = 0 }

function draw(time: number): void {
  if (!context) return
  // 使用经过时间计算速度，避免高刷新率屏幕上的粒子移动更快。
  const step = lastTime ? Math.min((time - lastTime) / (1000 / 60), 2) : 0
  lastTime = time
  context.clearRect(0, 0, width, height)
  context.fillStyle = context.strokeStyle = color
  for (const particle of particles) {
    particle.x = Math.max(0, Math.min(width, particle.x + particle.vx * step))
    particle.y = Math.max(0, Math.min(height, particle.y + particle.vy * step))
    if (particle.x <= 0 || particle.x >= width) particle.vx *= -1
    if (particle.y <= 0 || particle.y >= height) particle.vy *= -1
    context.globalAlpha = particle.alpha
    context.beginPath()
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
    context.fill()
  }
  context.lineWidth = 0.5
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (distance >= LINK_DISTANCE) continue
      context.globalAlpha = 0.15 * (1 - distance / LINK_DISTANCE)
      context.beginPath()
      context.moveTo(a.x, a.y)
      context.lineTo(b.x, b.y)
      context.stroke()
    }
  }
  context.globalAlpha = 1
  if (!document.hidden && !motion?.matches) frame = requestAnimationFrame(draw)
}

/** 隐藏标签页停止循环；减少动态效果时保留一帧静态粒子。 */
function syncPlayback(): void {
  stop()
  if (!document.hidden) draw(performance.now())
}
function resize(): void {
  const element = canvas.value
  if (!element || !context) return
  const bounds = element.getBoundingClientRect()
  width = bounds.width
  height = bounds.height
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  element.width = Math.round(width * ratio)
  element.height = Math.round(height * ratio)
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  color = getComputedStyle(element).getPropertyValue('--login-light').trim()
  // 小屏减少粒子数量，连接计算量有上限；颜色取登录页现有 Token。
  particles = Array.from({ length: Math.min(80, Math.max(24, Math.round(width * height / 16000))) }, () => ({
    x: Math.random() * width, y: Math.random() * height, radius: Math.random() * 2 + 1,
    vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, alpha: Math.random() * 0.5 + 0.2
  }))
  syncPlayback()
}

onMounted(() => {
  context = canvas.value?.getContext('2d') ?? null
  if (!context || !canvas.value) return
  motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  motion.addEventListener('change', syncPlayback)
  document.addEventListener('visibilitychange', syncPlayback)
  observer = new ResizeObserver(resize)
  observer.observe(canvas.value)
  resize()
})
onBeforeUnmount(() => {
  stop()
  observer?.disconnect()
  motion?.removeEventListener('change', syncPlayback)
  document.removeEventListener('visibilitychange', syncPlayback)
})
</script>
