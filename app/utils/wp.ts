import type { Site } from '~/server/utils/types'

export function isWpOutdated(site: Pick<Site, 'wp_core_version' | 'wp_latest_version'>): boolean {
  return !!site.wp_latest_version && site.wp_core_version !== site.wp_latest_version
}
