/**
 * Helpers de validation pour les server routes.
 *
 * Convention : retourne la valeur normalisée si OK, throw `createError(400)` sinon.
 * Toutes les validations sont strictes (refus par défaut) plutôt que permissives.
 */

import type { H3Event } from 'h3'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** True si l'URL est http:// ou https:// et bien formée. Refuse javascript:, data:, file:, etc. */
function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** Optionnel : retourne `null` si vide, la string trimée si OK, throw si non-URL http(s). */
export function validateOptionalHttpUrl(value: string | null | undefined, field: string): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  if (!isSafeHttpUrl(s)) {
    throw createError({ statusCode: 400, message: `${field} doit être une URL http(s) valide` })
  }
  return s
}

/** Optionnel : email format basique. */
export function validateOptionalEmail(value: string | null | undefined, field: string): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  if (s.length > 254 || !EMAIL_RE.test(s)) {
    throw createError({ statusCode: 400, message: `${field} doit être un email valide` })
  }
  return s
}

/** Optionnel : ISO YYYY-MM-DD valide. */
export function validateOptionalIsoDate(value: string | null | undefined, field: string): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  if (!ISO_DATE_RE.test(s)) {
    throw createError({ statusCode: 400, message: `${field} doit être au format YYYY-MM-DD` })
  }
  const d = new Date(s + 'T00:00:00Z')
  if (isNaN(d.getTime())) {
    throw createError({ statusCode: 400, message: `${field} n'est pas une date valide` })
  }
  return s
}

/** Requis : ISO YYYY-MM-DD valide, non vide. */
export function requireIsoDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError({ statusCode: 400, message: `${field} est requis` })
  }
  return validateOptionalIsoDate(value, field)!
}

/**
 * Nombre optionnel non-négatif. Refuse NaN/Infinity, accepte 0.
 * Renvoie `null` si vide/null/undefined.
 */
export function validateOptionalNonNegativeNumber(value: unknown, field: string): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) {
    throw createError({ statusCode: 400, message: `${field} doit être un nombre positif` })
  }
  return n
}

/** Trim + cap de longueur. Pour les champs texte libres. */
export function clampString(value: string | null | undefined, maxLen: number): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  return s.slice(0, maxLen)
}

/** Requis non vide + cap de longueur. */
export function requireString(value: unknown, field: string, maxLen: number = 500): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError({ statusCode: 400, message: `${field} est requis` })
  }
  return value.trim().slice(0, maxLen)
}

/** Récupère et valide le paramètre d'URL `id` — throw 400 s'il est absent. */
export function requireId(event: H3Event): string {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })
  return id
}
