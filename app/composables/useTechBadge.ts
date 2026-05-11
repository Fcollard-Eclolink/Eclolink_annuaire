import type { Site } from '~/server/utils/types'
import type { Technology } from '~/server/utils/types'

/** State partagé — peuplé par index.vue au chargement. */
const refTechs = () => useState<Technology[]>('ref:techs', () => [])

// Correspondances des anciens IDs statiques vers les labels actuels
const LEGACY_IDS: Record<string, string> = {
  wpbakery: 'WP Bakery',
  next    : 'Next.js',
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s.\-_]/g, '')
}

function findTech(name: string): Technology | undefined {
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

/** Parse le champ technologies (JSON array ou CSV) en tableau de labels normalisés et dédupliqués. */
export function techTags(site: Site): string[] {
  if (!site.technologies) return []
  const raw = site.technologies.trim()
  let values: string[]
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as unknown
      values = Array.isArray(parsed)
        ? (parsed as unknown[]).map(v => String(v).trim()).filter(Boolean)
        : raw.split(',').map(t => t.trim()).filter(Boolean)
    } catch {
      values = raw.split(',').map(t => t.trim()).filter(Boolean)
    }
  } else {
    values = raw.split(',').map(t => t.trim()).filter(Boolean)
  }
  // Normalise en labels et déduplique (gère les doublons legacy/nouveau)
  const seen = new Set<string>()
  const result: string[] = []
  for (const v of values) {
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
