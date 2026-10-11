import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import { encryptLoginPassword } from '@/utils/loginPassword'
import type { SysRegister, LoginInfoResult, UserInfoResult, CaptchaInfoResult, AjaxResult } from '@/types'

// 登录方法
export async function login(username: string, password: string, code: string, uuid: string): Promise<LoginInfoResult> {
  // 每次登录读取当前公钥，服务端更换密钥后无需重新发布前端。
  const key: AjaxResult<string> = await request({
    url: '/login/public-key',
    headers: { isToken: false },
    method: 'get'
  })
  let encryptedPassword: string
  try {
    if (!key.data) throw new Error('登录公钥为空')
    encryptedPassword = encryptLoginPassword(password, key.data)
  } catch {
    const error = new Error('登录密码加密失败，请刷新页面后重试')
    ElMessage.error(error.message)
    throw error
  }
  const data = {
    username,
    password: encryptedPassword,
    code,
    uuid
  }
  return request({
    url: '/login',
    headers: {
      isToken: false,
      repeatSubmit: false
    },
    method: 'post',
    data: data
  })
}

// 注册方法
export function register(data: SysRegister): Promise<AjaxResult> {
  return request({
    url: '/register',
    headers: {
      isToken: false
    },
    method: 'post',
    data: data
  })
}

// 获取用户详细信息
export function getInfo(): Promise<UserInfoResult> {
  return request({
    url: '/getInfo',
    method: 'get'
  })
}

// 解锁屏幕
export function unlockScreen(password: string) {
  return request({
    url: '/unlockscreen',
    method: 'post',
    data: { password }
  })
}

// 退出方法
export function logout() {
  return request({
    url: '/logout',
    method: 'post'
  })
}

// 获取验证码
export function getCodeImg(): Promise<CaptchaInfoResult> {
  return request({
    url: '/captchaImage',
    headers: {
      isToken: false
    },
    method: 'get',
    timeout: 20000
  })
}
