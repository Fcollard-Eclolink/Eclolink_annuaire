import type { Site } from '~/server/utils/types'
import type { Technology } from '~/server/utils/types'

/** State partagé — peuplé par useReferenceData. */
const refTechs = () => useState<Technology[]>('ref:technologies', () => [])

// Correspondances des anciens IDs statiques vers les labels actuels
const LEGACY_IDS: Record<string, string> = {
  wpbakery: 'WP Bakery',
  next    : 'Next.js',
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s.\-_]/g, '')
}

/** Résout un nom brut (label, slug simpleicons, ou legacy id) vers la technologie de référence. */
export function findTech(name: string): Technology | undefined {
  const n    = name.toLowerCase().trim()
  const nNorm = normalize(n)
  // Correspondance exacte label, slug, ou legacy id
  return refTechs().value.find(t => {
    if (t.label.toLowerCase() === n)                   return true
    if ((t.simpleicons_slug ?? '').toLowerCase() === n) return true
    if (normalize(t.label) === nNorm)                  return true
    const legacyLabel = LEGACY_IDS[n]
    if (legacyLabel && t.label === legacyLabel)        return true
    return false
  })
}

/** Parse un champ technologies (JSON array ou CSV) en valeurs brutes (non résolues). */
export function parseTechField(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  const trimmed = raw.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) return (parsed as unknown[]).map(v => String(v).trim()).filter(Boolean)
    } catch { /* fallback */ }
  }
  return trimmed.split(',').map(t => t.trim()).filter(Boolean)
}

/** Parse le champ technologies d'un site en tableau de labels normalisés et dédupliqués. */
export function techTags(site: Site): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const v of parseTechField(site.technologies)) {
    const label = findTech(v)?.label ?? v
    if (!seen.has(label)) {
      seen.add(label)
      result.push(label)
    }
  }
  return result
}

/** URL simpleicons pour une techno connue par slug, ou null. */
export function techIconUrl(tech: string): string | null {
  const t = findTech(tech)
  if (!t?.simpleicons_slug) return null
  return `https://cdn.simpleicons.org/${t.simpleicons_slug}`
}

/** SVG inline pour les technos sans slug simpleicons, ou null. */
export function techIconSvg(tech: string): string | null {
  return findTech(tech)?.svg ?? null
}
