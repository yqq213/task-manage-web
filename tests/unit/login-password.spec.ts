import { generateKeyPairSync, privateDecrypt, constants } from 'node:crypto'
import { encryptLoginPassword } from '@/utils/loginPassword'

/** 用独立的Node RSA实现验证前端协议，避免只用同一加密库自证。 */
describe('登录密码加密', () => {
  const keys = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  })

  it('在无Web Crypto环境中加密UTF-8密码，且每次密文不同', () => {
    const password = '密码Abc123!'
    const encrypted = encryptLoginPassword(password, keys.publicKey)
    expect(encrypted).not.toContain(password)
    expect(Buffer.from(encrypted, 'base64')).toHaveLength(256)
    const decrypted = privateDecrypt({
      key: keys.privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    }, Buffer.from(encrypted, 'base64')).toString('utf8')
    expect(decrypted).toBe(password)
    expect(encryptLoginPassword(password, keys.publicKey)).not.toBe(encrypted)
  })

  it('无效公钥导致失败而非返回明文', () => {
    expect(() => encryptLoginPassword('admin123', 'invalid-key')).toThrow()
  })
})
