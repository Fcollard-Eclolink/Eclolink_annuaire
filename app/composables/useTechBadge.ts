import type { Site } from '~/server/utils/types'
import { TECHS } from '~/utils/selectOptions'
import type { TechOption } from '~/utils/selectOptions'

/** Trouve une entrée TECHS par id ou label (insensible à la casse). */
function findTech(name: string): TechOption | undefined {
  const n = name.toLowerCase().trim()
  return TECHS.find(t => t.id === n || t.label.toLowerCase() === n || n.includes(t.id))
}

/** Parse le champ technologies (JSON array ou CSV) en tableau de labels normalisés. */
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
  // Normalise les ids (ex: "wordpress") en labels (ex: "WordPress")
  return values.map(v => findTech(v)?.label ?? v)
}

/** URL simpleicons pour une techno connue par slug, ou null. */
export function techIconUrl(tech: string): string | null {
  const t = findTech(tech)
  if (!t?.slug) return null
  return `https://cdn.simpleicons.org/${t.slug}`
}

/** SVG inline pour les technos sans slug simpleicons, ou null. */
export function techIconSvg(tech: string): string | null {
  return findTech(tech)?.svg ?? null
}
