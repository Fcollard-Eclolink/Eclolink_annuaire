import type { H3Event } from 'h3'

/**
 * Rate limiter in-memory à fenêtre glissante.
 *
 * - Stocke les timestamps des tentatives par clé (typiquement IP)
 * - À chaque check : purge les tentatives hors fenêtre, refuse si compteur dépassé
 * - Réinitialisable manuellement (sur login réussi par exemple)
 *
 * Limitations connues :
 * - Mémoire process : reset à chaque redéploiement et pas partagé entre instances.
 *   Pour du multi-instance, passer à Redis. Pour ce projet (1 instance interne),
 *   c'est suffisant.
 * - Pas de nettoyage périodique : la Map peut grossir. On purge à chaque accès,
 *   donc clés actives uniquement → acceptable.
 */

const WINDOW_MS = 15 * 60 * 1000

interface Bucket {
  attempts: number[]  // timestamps ms
}

const buckets = new Map<string, Bucket>()

function purge(bucket: Bucket): void {
  const cutoff = Date.now() - WINDOW_MS
  // Trie chronologique → on peut couper en début
  while (bucket.attempts.length > 0 && bucket.attempts[0]! < cutoff) {
    bucket.attempts.shift()
  }
}

interface RateLimitOptions {
  /** Identifiant unique du bucket (IP, IP+email, etc.) */
  key  : string
  /** Nombre max de tentatives sur la fenêtre (15 minutes, fixe) */
  limit: number
}

/**
 * Enregistre une tentative et throw 429 si la limite est dépassée.
 * À appeler AVANT de tenter l'opération coûteuse (login, etc.).
 */
export function checkRateLimit(opts: RateLimitOptions): void {
  let bucket = buckets.get(opts.key)
  if (!bucket) {
    bucket = { attempts: [] }
    buckets.set(opts.key, bucket)
  }
  purge(bucket)

  if (bucket.attempts.length >= opts.limit) {
    const retryAfter = Math.ceil((bucket.attempts[0]! + WINDOW_MS - Date.now()) / 1000)
    throw createError({
      statusCode   : 429,
      statusMessage: 'Too Many Requests',
      message      : `Trop de tentatives. Réessayez dans ${retryAfter} secondes.`,
    })
  }
  bucket.attempts.push(Date.now())
}

/** Réinitialise un bucket — typiquement appelé après un succès. */
export function clearRateLimit(key: string): void {
  buckets.delete(key)
}

/** Récupère l'IP réelle du client (X-Forwarded-For si derrière un proxy, sinon socket). */
export function getClientIp(event: H3Event): string {
  const ip = getRequestIP(event, { xForwardedFor: true })
  return ip ?? 'unknown'
}
