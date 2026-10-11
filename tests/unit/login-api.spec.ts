import { generateKeyPairSync, privateDecrypt, constants } from 'node:crypto'
import type { AxiosRequestConfig } from 'axios'
import request from '@/utils/request'
import { login } from '@/api/login'

jest.mock('@/utils/request', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('element-plus', () => ({ ElMessage: { error: jest.fn() } }))

/** 验证登录请求边界：只发送密文，公钥失败时不提交密码。 */
describe('登录请求', () => {
  const mockedRequest = request as unknown as jest.Mock<Promise<unknown>, [AxiosRequestConfig<{
    username: string; password: string; code: string; uuid: string
  }>]>
  const keys = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  })

  it('先读取公钥，再发送可解密的密文和原有验证码字段', async () => {
    mockedRequest.mockResolvedValueOnce({ code: 200, data: keys.publicKey })
    mockedRequest.mockResolvedValueOnce({ code: 200, token: 'test-token' })
    await login('admin', '密码Abc123!', '56', 'test-uuid')
    expect(mockedRequest.mock.calls[0][0]).toMatchObject({ url: '/login/public-key', method: 'get' })
    const config = mockedRequest.mock.calls[1][0]
    expect(config).toMatchObject({
      url: '/login', method: 'post',
      data: { username: 'admin', code: '56', uuid: 'test-uuid' }
    })
    const password = config.data!.password
    expect(password).not.toBe('密码Abc123!')
    expect(privateDecrypt({ key: keys.privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256' }, Buffer.from(password, 'base64')).toString('utf8')).toBe('密码Abc123!')
  })

  it('公钥获取失败时不发送登录请求', async () => {
    mockedRequest.mockRejectedValueOnce(new Error('network error'))
    await expect(login('admin', 'admin123', '', '')).rejects.toThrow('network error')
    expect(mockedRequest).toHaveBeenCalledTimes(1)
  })

  it('无效公钥时拒绝提交，不降级为明文', async () => {
    mockedRequest.mockResolvedValueOnce({ code: 200, data: 'invalid-key' })
    await expect(login('admin', 'admin123', '', '')).rejects.toThrow('登录密码加密失败')
    expect(mockedRequest).toHaveBeenCalledTimes(1)
  })
})
