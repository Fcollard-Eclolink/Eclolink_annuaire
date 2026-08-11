/** Trim les champs (string) listés d'un objet ; chaîne vide → null. */
export function trimOrNull<T, K extends keyof T>(
  obj: T, keys: K[],
): Record<K, string | null> {
  const out = {} as Record<K, string | null>
  for (const k of keys) out[k] = (obj[k] as string).trim() || null
  return out
}
