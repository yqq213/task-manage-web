import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

// Jest 不执行 Vite 自动导入插件，为任务列表使用的自动导入 API 提供运行时绑定。
Object.assign(globalThis, { computed, onBeforeUnmount, onMounted, reactive, ref })
