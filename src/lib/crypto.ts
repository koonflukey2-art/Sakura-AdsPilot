import crypto from 'crypto';

const key = process.env.FIELD_ENCRYPTION_KEY || '';

function getKey() {
  if (key.length < 32) {
    throw new Error('FIELD_ENCRYPTION_KEY must be >=32 chars');
  }
  return Buffer.from(key.slice(0, 32));
}

export function encrypt(plainText: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(payload: string) {
  const buffer = Buffer.from(payload, 'base64');
  const iv = buffer.subarray(0, 16);
  const tag = buffer.subarray(16, 32);
  const encrypted = buffer.subarray(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
