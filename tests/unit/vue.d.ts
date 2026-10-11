/** 为独立的 Jest TypeScript 工程声明 Vue 单文件组件。 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
