import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY = crypto.createHash('sha256')
  .update(process.env.VAULT_ENCRYPTION_KEY || 'nexus-local-dev-key-32chars!')
  .digest();

export function encryptVault(content: string, aad = 'nexus-vault'): string {
  if (!process.env.VAULT_ENCRYPTION_KEY) return content;
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, KEY, iv);
    cipher.setAAD(Buffer.from(aad));
    
    let enc = cipher.update(content, 'utf8', 'hex');
    enc += cipher.final('hex');
    const tag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: enc
    });
  } catch (err) {
    console.error('[VaultCrypto] encryption failed:', err);
    return content;
  }
}

export function decryptVault(blob: string): string {
  try {
    const { iv, tag, data } = JSON.parse(blob);
    if (!iv || !tag || !data) return blob;
    
    const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(iv, 'hex'));
    decipher.setAAD(Buffer.from('nexus-vault'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let dec = decipher.update(data, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch {
    // If it's not valid JSON or doesn't have the AES payload, return as raw string
    return blob;
  }
}
