import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

// Hash des mots de passe via scrypt (intégré à Node — aucune dépendance native).
// Format stocké : `scrypt$<saltHex>$<keyHex>`. Comparaison en temps constant.

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt    : string | Buffer,
  keylen  : number,
) => Promise<Buffer>

const KEY_LEN  = 64
const SALT_LEN = 16

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN)
  const key  = await scryptAsync(password, salt, KEY_LEN)
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !parts[1] || !parts[2]) return false

  const salt     = Buffer.from(parts[1], 'hex')
  const expected = Buffer.from(parts[2], 'hex')
  const key      = await scryptAsync(password, salt, expected.length)

  if (key.length !== expected.length) return false
  return timingSafeEqual(key, expected)
}
