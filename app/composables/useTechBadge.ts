import type { Site } from '~/server/utils/types'

const TECH_ICONS: Record<string, { slug: string; color: string }> = {
  wordpress:   { slug: 'wordpress',   color: '21759b' },
  woocommerce: { slug: 'woocommerce', color: '96588A' },
  wpbakery:    { slug: 'wpbakery',    color: '522D80' },
  elementor:   { slug: 'elementor',   color: '92003B' },
  divi:        { slug: 'divi',        color: '7EBEC5' },
  shopify:     { slug: 'shopify',     color: '7AB55C' },
  prestashop:  { slug: 'prestashop',  color: 'DF0067' },
  drupal:      { slug: 'drupal',      color: '0678BE' },
  joomla:      { slug: 'joomla',      color: '5091CD' },
  magento:     { slug: 'magento',     color: 'EE672F' },
  vue:         { slug: 'vuedotjs',    color: '42B883' },
  nuxt:        { slug: 'nuxtdotjs',   color: '00DC82' },
  react:       { slug: 'react',       color: '61DAFB' },
  nextjs:      { slug: 'nextdotjs',   color: '000000' },
  laravel:     { slug: 'laravel',     color: 'FF2D20' },
  symfony:     { slug: 'symfony',     color: '000000' },
  php:         { slug: 'php',         color: '777BB4' },
  typescript:  { slug: 'typescript',  color: '3178C6' },
  javascript:  { slug: 'javascript',  color: 'F7DF1E' },
  docker:      { slug: 'docker',      color: '2496ED' },
  sass:        { slug: 'sass',        color: 'CC6699' },
}

/** Parse le champ technologies (JSON array ou CSV) en tableau de strings. */
export function techTags(site: Site): string[] {
  if (!site.technologies) return []
  const raw = site.technologies.trim()
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return (parsed as unknown[]).map(v => String(v).trim()).filter(Boolean)
      }
    } catch { /* fallback CSV */ }
  }
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

/** Retourne l'URL simpleicons pour une technologie connue, ou null. */
export function techIconUrl(tech: string): string | null {
  const n = tech.toLowerCase()
  const key = Object.keys(TECH_ICONS).find(k => n.includes(k))
  if (!key) return null
  const { slug, color } = TECH_ICONS[key]!
  return `https://cdn.simpleicons.org/${slug}/${color}`
}
