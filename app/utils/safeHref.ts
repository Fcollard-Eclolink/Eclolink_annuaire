/**
 * Garde-fou XSS pour les liens : retourne l'URL seulement si elle est http(s),
 * sinon `undefined`. Évite l'exécution de `javascript:` ou `data:` saisi côté DB.
 *
 * Usage : `<a v-if="safeHref(url)" :href="safeHref(url)">`
 */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url)
    return (u.protocol === 'http:' || u.protocol === 'https:') ? url : undefined
  } catch {
    return undefined
  }
}
