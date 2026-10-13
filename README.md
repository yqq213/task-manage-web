# 任务管理系统 · 前端

基于 RuoYi 前端结构开发的任务管理系统，使用 Vue 3、TypeScript 和 Element Plus，提供数据看板、任务列表、任务详情及系统管理等页面。项目采用前后端分离模式，登录鉴权、菜单、任务数据与统计结果由后端接口提供。

## 线上访问地址

- **测试环境**：`http://39.96.7.19:8000`

## 测试账号

- **管理员**：admin  admin123
- **普通用户**：user1  123456


## 主要功能

- **数据看板**：首页 `/index` 展示任务总量、状态分布、优先级分布和个人完成情况；支持创建日期范围、近 7 天、近 30 天、本月及全部时间筛选。
- **任务管理**：任务查询、分页、排序、新增、编辑、指派负责人、状态变更、删除、详情及操作记录查看。
- **系统管理**：用户、角色、菜单、部门、岗位、字典、参数和通知公告等页面，实际可见菜单取决于后端配置和用户权限。
- **系统监控与工具**：在线用户、日志、定时任务、服务与缓存监控、代码生成、表单构建等页面。
- **通用能力**：登录、个人中心、锁屏、权限指令、页签缓存、主题设置、文件上传及下载。

## 本地运行

建议使用 Node.js 22 LTS。仓库提供 `pnpm-lock.yaml`，建议使用 pnpm 安装依赖，避免混用包管理器产生新的锁文件。

在项目根目录执行：

```bash
# 安装依赖
pnpm install

# 启动开发服务
pnpm dev
```

开发服务默认端口为 **80**，启动后自动打开浏览器，通常访问地址为 `http://localhost`。如果端口被占用，以终端实际输出为准；需要修改端口时，在 `vite.config.ts` 的 `server.port` 中调整。

后端应运行在 `http://localhost:8080`。后端服务、数据库及 Redis 的启动配置由后端项目维护，本仓库只包含前端。登录使用后端已配置的有效账号。

### 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务 |
| `pnpm build:prod` | 使用生产环境配置构建 |
| `pnpm build:stage` | 使用 staging 环境配置构建 |
| `pnpm preview` | 本地预览已生成的构建产物 |
| `pnpm test:unit` | 使用 Jest 单次运行单元测试 |
| `pnpm test:unit:watch` | 监听变更，重跑相关单元测试 |
| `pnpm test:unit:coverage` | 运行单元测试并生成覆盖率报告 |


## 环境配置与接口代理

| 文件 | 模式 | API 前缀 |
| --- | --- | --- |
| `.env.development` | development | `/dev-api` |
| `.env.production` | production | `/prod-api` |
| `.env.staging` | staging | `/stage-api` |

主要变量：

| 变量 | 说明 |
| --- | --- |
| `VITE_APP_TITLE` | 页面标题，当前为“任务管理系统” |
| `VITE_APP_ENV` | 项目环境标识 |
| `VITE_APP_BASE_API` | Axios 请求基础路径 |
| `VITE_BUILD_COMPRESS` | 构建压缩选项，生产和 staging 当前配置为 `gzip` |

开发环境代理在 `vite.config.ts` 中配置：

```text
浏览器：GET /dev-api/task/tasks/list
   ↓ Vite 代理移除 /dev-api 前缀
后端：GET http://localhost:8080/task/tasks/list
```

后端地址由该文件中的 `baseUrl` 配置。项目另有 `/v3/api-docs/` 子路径代理，用于后端接口文档相关请求。

生产部署时，将 `dist/` 交给 Nginx 等静态服务，并配置 `/prod-api` 到后端的反向代理；staging 部署对应 `/stage-api`。Vite 开发代理不会随构建产物部署，`pnpm preview` 也不能代替生产反向代理配置。

项目使用 `createWebHistory()`，静态服务器需要支持 SPA 回退：直接访问或刷新业务路由时，应返回 `index.html`，避免出现服务器 404。

## 主要项目目录

```text
task-manage-web/
├── public/                      # 不参与模块处理的静态资源
├── src/
│   ├── api/                     # 按模块组织的接口函数
│   │   ├── login.ts             # 登录、验证码、用户信息、退出、解锁
│   │   ├── menu.ts              # 后端菜单路由接口
│   │   ├── task.ts              # 任务与统计接口
│   │   ├── system/              # 系统管理接口
│   │   ├── monitor/             # 系统监控接口
│   │   └── tool/                # 开发工具接口
│   ├── assets/                  # 图片、SVG 图标、全局 SCSS
│   ├── components/              # 公共组件
│   ├── directive/               # 权限等自定义指令
│   ├── layout/                  # 主布局、侧栏、顶部栏、页签、设置面板
│   ├── plugins/                 # 权限判断、缓存、弹窗、页签等插件
│   ├── router/index.ts          # 公共路由及本地权限路由
│   ├── store/modules/           # 用户、权限、布局、锁屏、页签等 Pinia Store
│   ├── types/                   # 公共类型与 API 类型声明
│   │   └── api/task.ts          # 任务实体、枚举、查询与统计类型
│   ├── utils/                   # 请求、鉴权、字典、主题及通用工具
│   │   ├── request.ts          # Axios 实例、拦截器、通用下载
│   │   ├── auth.ts             # Token Cookie 操作
│   │   └── theme.ts            # 主色及深浅色生成
│   ├── views/                   # 页面
│   │   ├── index.vue           # 数据看板首页
│   │   ├── dashboard/          # 看板图表组件
│   │   ├── task/list/          # 任务列表及表单、详情组件
│   │   ├── system/             # 系统管理页面
│   │   ├── monitor/            # 系统监控页面
│   │   └── tool/               # 开发工具页面
│   ├── App.vue                 # 根组件、主题初始化
│   ├── main.ts                 # 应用入口与全局注册
│   ├── permission.ts           # 路由守卫
│   └── settings.ts             # 默认布局配置
├── vite/plugins/               # Vite 插件配置
├── tests/unit/                 # Jest 单元测试、初始化和 Vue 类型声明
├── tests/tsconfig.json          # 独立的测试 TypeScript 配置
├── jest.config.cjs              # Jest 环境、转换器及路径别名
├── .env.*                      # 环境变量
├── auto-imports.d.ts            # 自动导入生成的类型声明
├── package.json                # 依赖及运行脚本
├── pnpm-lock.yaml              # 依赖锁文件
├── tsconfig.json               # TypeScript 配置
└── vite.config.ts              # 别名、代理、构建及插件配置
```

## 路由与路由守卫

### 路由来源

`src/router/index.ts` 中定义两类本地路由：

- `constantRoutes`：登录、注册、首页、个人中心、锁屏、错误页等固定路由。固定路由并不代表免登录，免登录范围由守卫白名单控制。
- `dynamicRoutes`：角色分配、字典数据、调度日志、生成配置等需要权限的隐藏业务路由。

普通业务菜单通过 `/getRouters` 从后端获取。`src/store/modules/permission.ts` 将后端返回的组件字符串转换成实际组件：`Layout`、`ParentView`、`InnerLink` 使用特定组件，其余组件通过 `import.meta.glob` 匹配 `src/views/**/*.vue`。

例如，后端菜单组件配置为 `task/list/index` 时，会匹配 `src/views/task/list/index.vue`。因此，新建页面文件后，还需要配置相应后端菜单及角色权限，页面才会出现在授权用户的菜单中。

### 导航流程

守卫定义在 `src/permission.ts`，由 `main.ts` 导入执行：

1. 每次导航启动 NProgress。
2. 无 Token：允许进入 `/login`、`/register`，其他地址重定向到 `/login?redirect=目标地址`。
3. 有 Token：访问登录页时回到首页；根据锁屏状态进入 `/lock` 或离开锁屏页。
4. 用户角色尚未初始化时，调用 `/getInfo` 获取用户、角色和权限，再调用 `/getRouters` 生成菜单路由。
5. 注册动态路由后，以 `replace` 方式重新导航到目标页面，确保首次访问和刷新时能匹配新注册的路由。
6. 初始化失败时执行退出并提示错误；导航结束后关闭 NProgress。

本地 `dynamicRoutes` 依据 `permissions` 或 `roles` 筛选。按钮权限可使用项目已有的 `v-hasPermi`、`v-hasRole` 指令。前端权限用于控制入口和展示，接口与记录级权限仍由后端校验。

### 路由配置与缓存

常用配置包括 `hidden`、`alwaysShow`、`name`，以及 `meta.title`、`meta.icon`、`meta.noCache`、`meta.activeMenu`、`meta.affix`。

主内容区 `src/layout/components/AppMain.vue` 使用 `<keep-alive>`，缓存范围由页签 Store 的 `cachedViews` 控制。需要缓存的页面应保持路由 `name` 与组件名称一致。图表等依赖容器尺寸的组件还需处理 `onActivated`、`onDeactivated` 和尺寸变化；相关实现可参考 `src/views/dashboard/DistributionChart.vue`。

## Axios 封装

统一入口为 `src/utils/request.ts`。业务页面通过 `src/api/` 中的接口函数发起请求，复用鉴权、参数处理和错误提示。

### 实例配置

- `baseURL`：读取 `VITE_APP_BASE_API`。
- 默认超时：**60 秒**，单个接口可通过 `timeout` 覆盖；验证码接口当前为 20 秒。
- 默认内容类型：`application/json;charset=utf-8`。

### 请求拦截器

1. 从名为 `Admin-Token` 的 Cookie 读取 Token，写入 `Authorization: Bearer <token>`。
2. GET 请求通过 `tansParams` 将 `params` 转换为 URL 查询参数。
3. POST、PUT 请求默认执行防重复提交：将最近一次提交的地址、数据与时间记录到 sessionStorage；相同地址与数据在默认 1 秒内重复提交时，拒绝请求并提示“数据正在处理，请勿重复提交”。这属于前端提交保护，不代替后端幂等性控制。

项目约定的请求配置开关放在 `headers` 中：

| 配置 | 含义 |
| --- | --- |
| `isToken: false` | 不自动添加 Token，如登录、验证码 |
| `repeatSubmit: false` | 关闭该请求的防重复提交检查 |
| `interval: 2000` | 将防重复提交间隔设为 2000 毫秒 |

### 响应拦截器

普通请求成功后返回的是 **后端响应体 `res.data`**，而非 Axios 原始响应对象，也不会自动提取业务 `data` 字段。

| 响应情况 | 处理方式 |
| --- | --- |
| 业务码 `200`，或未提供业务码 | 返回响应体 |
| 业务码 `401` | 防止重复弹出登录过期提示；确认后退出并跳转 |
| 业务码 `500` | 错误消息提示并拒绝 Promise |
| 业务码 `601` | 警告消息提示并拒绝 Promise |
| 其他非成功业务码 | 通知提示并拒绝 Promise |
| `blob`、`arraybuffer` | 返回二进制响应体 |
| 网络错误、超时、HTTP 状态错误 | 转换为统一中文提示并拒绝 Promise |

普通业务响应使用 `AjaxResult<T>`，业务数据位于 `response.data`；分页响应使用 `TableDataInfo<T>`，列表及总数直接位于 `response.rows`、`response.total`。类型定义见 `src/types/api/common.ts`。

## 任务模块

页面入口为 `src/views/task/list/index.vue`，表单、详情及枚举文案分别位于 `TaskForm.vue`、`TaskDetail.vue`、`options.ts`。接口集中在 `src/api/task.ts`，类型集中在 `src/types/api/task.ts`。

| 方法 | 接口 | 用途 |
| --- | --- | --- |
| GET | `/task/tasks/list` | 分页、筛选与排序 |
| GET | `/task/tasks/{id}` | 任务详情与操作记录 |
| GET | `/task/tasks/assignees` | 可选负责人 |
| GET | `/task/tasks/stats` | 看板统计 |
| POST | `/task/tasks` | 新增任务 |
| PUT | `/task/tasks/{id}` | 编辑任务基本信息 |
| PUT | `/task/tasks/{id}/assignee` | 指派负责人 |
| PUT | `/task/tasks/{id}/status` | 更新任务状态 |
| DELETE | `/task/tasks/{id}` | 删除任务 |

### 权限范围

| 操作 | 管理员 | 普通创建人（非当前负责人） | 普通当前负责人（非创建人） | 普通用户同时为创建人和负责人 |
| --- | --- | --- | --- | --- |
| 创建任务 | 可以 | 可以 | 可以 | 可以 |
| 查看列表、详情和操作历史 | 全部未删除任务 | 自己创建的任务 | 自己当前负责的任务 | 自己创建或当前负责的任务 |
| 编辑标题、描述、优先级、截止时间 | 可以，任务须未完成 | 可以，任务须未完成 | 不可以 | 可以，任务须未完成 |
| 更换负责人 | 可以，任务须未完成 | 可以，任务须未完成 | 不可以 | 可以，任务须未完成 |
| 推进任务状态 | 可以，须按顺序推进 | 不可以 | 可以，须按顺序推进 | 可以，须按顺序推进 |
| 逻辑删除任务 | 可以，包含已完成任务 | 可以，包含已完成任务 | 不可以 | 可以，包含已完成任务 |

普通用户与某个任务既无创建关系也无当前负责关系时，不能查看或操作该任务。上述“创建人”和“负责人”是相对于具体任务的身份，不是需要单独配置的系统角色；任何已登录用户均可创建任务。

## 主题与布局配置

默认主题色为 **`#009688`**，配置入口位于 `src/store/modules/settings.ts`。用户在设置面板保存过主题时，优先使用 localStorage 中 `layout-setting` 的主题值；首次使用或重置配置后采用默认色。

`src/utils/theme.ts` 根据主色生成 Element Plus 的主色及深浅色 CSS 变量，暗色模式使用现有柔化处理。`src/settings.ts` 维护侧栏、页签、固定头部、Logo、动态标题及版权等默认布局设置。

## 单元测试

项目使用 **Jest 29**、**Vue Test Utils 2** 和 **jsdom** 测试 Vue 3 页面。`@vue/vue3-jest` 转换 Vue 单文件组件，`ts-jest` 转换并检查测试中的 TypeScript。Jest 配置使用 `.cjs`，与项目的 ESM、Vite 构建配置独立，路径别名 `@` 同样指向 `src/`。

```bash
# 单次运行全部单元测试，适合本地验证和 CI
pnpm test:unit

# 开发时监听文件变化；按 a 运行全部用例，按 q 退出
pnpm test:unit:watch

# 只运行任务列表测试
pnpm test:unit tests/unit/task-list.spec.ts

# 运行测试并生成覆盖率报告
pnpm test:unit:coverage
```

覆盖率报告输出到 `tests/unit/coverage/`，HTML 入口为 `tests/unit/coverage/lcov-report/index.html`，该目录已被 Git 忽略。当前覆盖率统计对象为 `src/views/task/list/index.vue`；增加其他模块测试时，可同步扩展 `jest.config.cjs` 中的 `collectCoverageFrom`。

### 任务列表测试范围

用例位于 `tests/unit/task-list.spec.ts`，通过挂载真实任务列表页面、点击按钮及触发组件事件验证业务行为：

- 首次查询、负责人加载、分页、组合筛选、关键词空白处理、排序及重置。
- 管理员、创建人、负责人及无关用户的操作权限；已完成任务隐藏编辑、指派和状态推进入口。
- 新增、编辑、指派、详情入口及表单成功后的列表刷新。
- 待办 → 进行中 → 已完成的状态提交、删除确认、取消确认、操作期间防止重复提交。
- 列表和负责人请求失败、负责人重新展开时重试、写入失败后恢复操作。
- 并发请求乱序返回时保留最新结果，以及删除末页最后一项后回到有效页。

测试 Mock 任务 API、用户 Store、Element Plus 提示及表单/详情子组件，使用轻量 UI 替身保留插槽、`v-model` 和事件。测试不会连接真实后端，也不验证 Element Plus 自身、真实弹窗表单、浏览器布局或后端权限。

### 新增测试

1. 在 `tests/unit/` 下创建 `*.spec.ts` 文件，Jest 会自动发现。
2. 使用 Vue Test Utils 挂载目标组件，Mock 网络请求和不属于当前测试范围的依赖。
3. 优先通过输入、点击与事件断言页面行为、接口参数和可见结果，避免依赖组件私有状态。
4. 使用 `flushPromises()` 等待异步查询完成，并在用例结束后卸载组件、清理 Mock。

`tests/unit/setup.ts` 为任务列表使用的 Vue 自动导入函数提供运行时绑定，因为 Jest 不会执行 Vite 的自动导入插件。测试其他组件时，如使用了额外的自动导入 API，需补充相应绑定。测试独立配置 `tests/tsconfig.json` 保留严格类型检查，`tests/unit/vue.d.ts` 提供 Vue 文件声明。

## 开发约定

- 新接口写在 `src/api/`，请求与响应类型写在 `src/types/api/`；优先复用统一 Axios 实例和已有公共类型。
- 开发页面前检查 `src/components/`，优先复用分页、表格工具、字典标签、上传等已有能力。
- 使用 Element Plus 及项目既有 SCSS、主题变量，避免业务组件独立维护一套主色。
- 页面组件名称、路由名称和缓存配置保持一致；后端菜单组件路径必须能匹配 `src/views/` 中的实际文件。
- 对日期口径、状态编码、空值语义和权限规则添加必要注释，保持前后端契约一致。
