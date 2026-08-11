import type { H3Event } from 'h3'
import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { sessions, users, type User } from '~/server/db/schema'

// Sessions serveur : token opaque aléatoire posé en cookie httpOnly, dont seul
// le SHA-256 est stocké en base (fuite DB = pas de session réutilisable).
// Révocables (logout, ban, rotation mdp). Renouvellement glissant.

const COOKIE_SESSION   = 'eclo_session'
const SESSION_TTL_MS   = 1000 * 60 * 60 * 24 * 30 // 30 jours
const SLIDING_RENEW_MS = 1000 * 60 * 60 * 24 * 7  // prolonge si expire dans < 7 j

function sessionCookieOpts(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure  : process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path    : '/',
    maxAge  : maxAgeSec,
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(event: H3Event, userId: string): Promise<void> {
  const token     = randomBytes(32).toString('base64url')
  const tokenHash = hashToken(token)
  const now       = new Date()

  await useDb().insert(sessions).values({
    token_hash  : tokenHash,
    user_id     : userId,
    expires_at  : new Date(now.getTime() + SESSION_TTL_MS),
    last_seen_at: now,
    user_agent  : getRequestHeader(event, 'user-agent') ?? null,
    ip          : getRequestIP(event, { xForwardedFor: true }) ?? null,
  })

  setCookie(event, COOKIE_SESSION, token, sessionCookieOpts(Math.floor(SESSION_TTL_MS / 1000)))
}

export async function resolveSessionUser(event: H3Event): Promise<User | null> {
  const token = getCookie(event, COOKIE_SESSION)
  if (!token) return null

  const tokenHash = hashToken(token)
  const db        = useDb()

  const rows = await db
    .select({ user: users, expiresAt: sessions.expires_at })
    .from(sessions)
    .innerJoin(users, eq(sessions.user_id, users.id))
    .where(and(eq(sessions.token_hash, tokenHash), gt(sessions.expires_at, new Date())))
    .limit(1)

  const row = rows[0]
  if (!row || !row.user.is_active) return null

  // Renouvellement glissant : prolonge la session active proche de l'expiration.
  const now = new Date()
  if (row.expiresAt.getTime() - now.getTime() < SLIDING_RENEW_MS) {
    await db.update(sessions)
      .set({ expires_at: new Date(now.getTime() + SESSION_TTL_MS), last_seen_at: now })
      .where(eq(sessions.token_hash, tokenHash))
    setCookie(event, COOKIE_SESSION, token, sessionCookieOpts(Math.floor(SESSION_TTL_MS / 1000)))
  } else {
    await db.update(sessions).set({ last_seen_at: now }).where(eq(sessions.token_hash, tokenHash))
  }

  return row.user
}

export async function revokeCurrentSession(event: H3Event): Promise<void> {
  const token = getCookie(event, COOKIE_SESSION)
  if (token) {
    await useDb().delete(sessions).where(eq(sessions.token_hash, hashToken(token)))
  }
  deleteCookie(event, COOKIE_SESSION, { path: '/' })
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await useDb().delete(sessions).where(eq(sessions.user_id, userId))
}
