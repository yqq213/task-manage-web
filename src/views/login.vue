<template>
  <div class="login">
    <!-- 背景仅作装饰；CSS 动画不参与登录状态，并尊重减少动态效果设置。 -->
    <div class="login-atmosphere" :class="{ 'is-paused': backgroundPaused }" aria-hidden="true">
      <div class="login-glow login-glow-one" /><div class="login-glow login-glow-two" />
      <svg class="login-network" viewBox="0 0 1200 800" fill="none" preserveAspectRatio="xMidYMid slice">
        <path d="M0 570H210L390 390H670L850 210H1200M0 720H330L510 540H800L1010 330H1200M160 0V180L390 390M670 390V640L830 800" />
        <g><circle cx="210" cy="570" r="5" /><circle cx="390" cy="390" r="7" /><circle cx="670" cy="390" r="5" /><circle cx="850" cy="210" r="7" /><circle cx="510" cy="540" r="5" /><circle cx="1010" cy="330" r="5" /></g>
      </svg>
    </div>
    <section class="login-intro">
      <div class="login-brand"><span class="login-brand-mark" aria-hidden="true">✓</span>{{ title }}</div>
      <h1>让任务有方向，<br />让协作有进展。</h1>
      <p>从任务分配到执行完成，<br />在一个工作台里掌握每一步。</p>
    </section>
    <el-form ref="loginRef" :model="loginForm" :rules="loginRules" class="login-form">
      <div class="login-form-heading"><span class="login-form-caption">任务工作台</span><h2 class="title">欢迎回来</h2><p>登录账号，继续推进你的任务。</p></div>
      <el-form-item prop="username">
        <el-input
          v-model="loginForm.username"
          type="text"
          size="large"
          auto-complete="off"
          placeholder="账号"
          aria-label="账号"
        >
          <template #prefix><svg-icon icon-class="user" class="el-input__icon input-icon" /></template>
        </el-input>
      </el-form-item>
      <el-form-item prop="password">
        <el-input
          v-model="loginForm.password"
          type="password"
          size="large"
          auto-complete="off"
          placeholder="密码"
          aria-label="密码"
          @keyup.enter="handleLogin"
        >
          <template #prefix><svg-icon icon-class="password" class="el-input__icon input-icon" /></template>
        </el-input>
      </el-form-item>
      <el-form-item prop="code" v-if="captchaEnabled">
        <el-input
          v-model="loginForm.code"
          size="large"
          auto-complete="off"
          placeholder="验证码"
          aria-label="验证码"
          style="width: 63%"
          @keyup.enter="handleLogin"
        >
          <template #prefix><svg-icon icon-class="validCode" class="el-input__icon input-icon" /></template>
        </el-input>
        <div class="login-code">
          <button type="button" class="login-code-refresh" aria-label="刷新验证码" @click="getCode"><img :src="codeUrl" alt="验证码" class="login-code-img" /></button>
        </div>
      </el-form-item>
      <el-checkbox v-model="loginForm.rememberMe" style="margin:0px 0px 25px 0px;">记住密码</el-checkbox>
      <el-form-item style="width:100%;">
        <el-button
          :loading="loading"
          size="large"
          type="primary"
          style="width:100%;"
          @click.prevent="handleLogin"
        >
          <span v-if="!loading">登 录</span>
          <span v-else>登 录 中...</span>
        </el-button>
        <div style="float: right;" v-if="register">
          <router-link class="link-type" :to="'/register'">立即注册</router-link>
        </div>
      </el-form-item>
    </el-form>
    <!--  底部  -->
    <div class="el-login-footer">
      <span>{{ footerContent }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCodeImg } from "@/api/login"
import Cookies from "js-cookie"
import { encrypt, decrypt } from "@/utils/jsencrypt"
import useUserStore from '@/store/modules/user'
import defaultSettings from '@/settings'
import type { CaptchaInfoResult } from '@/types/api/login'
import type { LoginForm } from '@/types/api/login'

const title = import.meta.env.VITE_APP_TITLE
const footerContent = defaultSettings.footerContent
// 标签页不可见时暂停装饰动画，离开登录页时移除监听。
const backgroundPaused = ref(document.hidden)
function syncBackgroundVisibility(): void { backgroundPaused.value = document.hidden }
onMounted(() => { document.addEventListener('visibilitychange', syncBackgroundVisibility) })
onBeforeUnmount(() => { document.removeEventListener('visibilitychange', syncBackgroundVisibility) })
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const { proxy } = getCurrentInstance()

const loginForm = ref<LoginForm>({
  username: "admin",
  password: "admin123",
  rememberMe: false,
  code: "",
  uuid: ""
})

const loginRules = {
  username: [{ required: true, trigger: "blur", message: "请输入您的账号" }],
  password: [{ required: true, trigger: "blur", message: "请输入您的密码" }],
  code: [{ required: true, trigger: "change", message: "请输入验证码" }]
}

const codeUrl = ref("")
const loading = ref(false)
// 验证码开关
const captchaEnabled = ref(true)
// 注册开关
const register = ref(false)
const redirect = ref<string | undefined>(undefined)

watch(route, (newRoute: any) => {
    redirect.value = (newRoute.query && newRoute.query.redirect) as string | undefined
}, { immediate: true })

function handleLogin(): void {
  proxy.$refs.loginRef.validate((valid: boolean) => {
    if (valid) {
      loading.value = true
      // 勾选了需要记住密码设置在 cookie 中设置记住用户名和密码
      if (loginForm.value.rememberMe) {
        Cookies.set("username", loginForm.value.username, { expires: 30 })
        Cookies.set("password", encrypt(loginForm.value.password), { expires: 30 })
        Cookies.set("rememberMe", loginForm.value.rememberMe, { expires: 30 })
      } else {
        // 否则移除
        Cookies.remove("username")
        Cookies.remove("password")
        Cookies.remove("rememberMe")
      }
      // 调用action的登录方法
      userStore.login(loginForm.value).then(() => {
        const query = route.query
        const otherQueryParams = Object.keys(query).reduce((acc: Record<string, any>, cur) => {
          if (cur !== "redirect") {
            acc[cur] = query[cur]
          }
          return acc
        }, {})
        router.push({ path: redirect.value || "/", query: otherQueryParams })
      }).catch(() => {
        loading.value = false
        // 重新获取验证码
        if (captchaEnabled.value) {
          getCode()
        }
      })
    }
  })
}

function getCode(): void {
  getCodeImg().then(res => {
    captchaEnabled.value = res.captchaEnabled === undefined ? true : res.captchaEnabled
    if (captchaEnabled.value) {
      codeUrl.value = "data:image/gif;base64," + res.img
      loginForm.value.uuid = res.uuid
    }
  })
}

function getCookie(): void {
  const username = Cookies.get("username")
  const password = Cookies.get("password")
  const rememberMe = Cookies.get("rememberMe")
  loginForm.value = {
    username: username === undefined ? loginForm.value.username : username,
    password: password === undefined ? loginForm.value.password : decrypt(password),
    rememberMe: rememberMe === undefined ? false : Boolean(rememberMe)
  }
}

getCode()
getCookie()
</script>

<style lang='scss' scoped>
.login {
  // 登录场景使用独立的深青背景，主色与工作台共享。
  --login-space: 32px;
  --login-light: #e5f2ef;
  --login-muted: #a4bab5;
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  gap: var(--login-space);
  position: relative;
  min-height: 100%;
  padding: calc(var(--login-space) * 2) var(--login-space);
  isolation: isolate;
  overflow: hidden;
  background: var(--workspace-night);
}
.title {
  margin: 12px 0;
  font-family: var(--workspace-display);
  font-size: 28px;
  color: var(--workspace-ink);
}
.login-atmosphere { position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
.login-atmosphere.is-paused .login-glow, .login-atmosphere.is-paused circle { animation-play-state: paused; }
.login-glow {
  position: absolute;
  width: 70vw;
  height: 70vw;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--el-color-primary) 28%, transparent), transparent 65%);
  animation: login-drift 24s ease-in-out infinite alternate;
}
.login-glow-one { top: -50%; left: -20%; }
.login-glow-two { bottom: -70%; right: -20%; animation-delay: -12s; }
.login-network {
  width: 100%; height: 100%; opacity: .18;
  path { stroke: var(--login-light); stroke-width: 1; }
  circle { fill: var(--login-light); animation: login-pulse 8s ease-in-out infinite alternate; }
}
.login-intro { max-width: 560px; color: var(--login-light); }
.login-brand { display: flex; align-items: center; gap: 12px; font-family: var(--workspace-display); font-size: 18px; font-weight: 600; }
.login-brand-mark {
  display: grid; place-items: center; width: 36px; height: 36px;
  border: 1px solid color-mix(in srgb, var(--login-light) 30%, transparent);
  border-radius: var(--workspace-radius-small); color: var(--login-light);
}
.login-intro h1 { margin: 64px 0 24px; font-family: var(--workspace-display); font-size: clamp(32px, 3.8vw, 54px); line-height: 1.3; letter-spacing: -1px; font-weight: 600; }
.login-intro p { font-size: 16px; line-height: 1.9; color: var(--login-muted); }
.login-workflow {
  display: flex; align-items: center; gap: 16px; margin-top: 48px; font-size: 13px;
  span { display: flex; align-items: center; gap: 8px; }
  span::before { content: ''; width: 6px; height: 6px; background: var(--login-light); border-radius: 50%; }
  i { width: 40px; height: 1px; background: color-mix(in srgb, var(--login-light) 30%, transparent); }
}
.login-form-heading { margin-bottom: var(--login-space); }
.login-form-heading p { margin: 0; font-size: 14px; line-height: 1.7; color: var(--workspace-muted); }
.login-form-caption { font-size: 12px; font-weight: 600; color: var(--el-color-primary); letter-spacing: 2px; }
.login-form {
  border-radius: var(--workspace-radius);
  background: var(--workspace-surface);
  width: 420px;
  max-width: 100%;
  flex-shrink: 0;
  padding: 40px 36px 16px;
  border: 1px solid var(--workspace-line);
  box-shadow: 0 24px 80px rgb(0 0 0 / 20%);
  z-index: 1;
  :deep(.el-input) {
    height: 40px;
    input {
      height: 40px;
      outline: none !important;
    }
  }
  .input-icon {
    height: 39px;
    width: 14px;
    margin-left: 0px;
  }
}
.login-tip {
  font-size: 13px;
  text-align: center;
  color: #bfbfbf;
}
.login-code {
  width: 33%;
  height: 40px;
  float: right;
  img {
    cursor: pointer;
    vertical-align: middle;
  }
}
.el-login-footer {
  height: 40px;
  line-height: 40px;
  position: fixed;
  bottom: 0;
  width: 100%;
  text-align: center;
  color: #fff;
  font-family: Arial;
  font-size: 12px;
  letter-spacing: 1px;
}
.login-code-img {
  height: 40px;
  max-width: 100%;
}
.login-code-refresh { border: 0; padding: 0; width: 100%; height: 100%; background: transparent; cursor: pointer; border-radius: var(--workspace-radius-small); }
@keyframes login-drift {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(10%, 8%, 0) scale(1.08); }
}
@keyframes login-pulse { from { opacity: .3; } to { opacity: 1; } }
@media (max-width: 900px) {
  .login { flex-direction: column; justify-content: center; gap: 24px; }
  .login-intro { width: 420px; max-width: 100%; }
  .login-intro h1, .login-intro p, .login-workflow { display: none; }
  .login-brand { justify-content: center; }
  .login-form { padding: var(--login-space) var(--workspace-space) 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .login-glow, .login-network circle { animation: none; }
}
</style>
