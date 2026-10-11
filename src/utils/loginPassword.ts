import forge from 'node-forge'

/** 支持HTTP页面的登录加密，OAEP与MGF1均使用SHA-256。 */
export function encryptLoginPassword(password: string, publicKeyPem: string): string {
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem)
  const encrypted = publicKey.encrypt(forge.util.encodeUtf8(password), 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: { md: forge.md.sha256.create() }
  })
  return forge.util.encode64(encrypted)
}
