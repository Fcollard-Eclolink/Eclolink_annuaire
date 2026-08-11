import { and, eq, ilike, isNotNull } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { sites } from '~/server/db/schema'
import { checkSiteWordPress, fetchLatestWpVersion } from '~/server/utils/wp-check'

export default defineTask({
  meta: {
    name       : 'check-wp-updates',
    description: 'Vérifie les mises à jour WordPress (core + plugins) de tous les sites WordPress',
  },
  async run() {
    const db = useDb()
    const wpSites = await db.select().from(sites)
      .where(and(isNotNull(sites.url), ilike(sites.technologies, '%wordpress%')))

    const latestVersion = await fetchLatestWpVersion()

    const results = await Promise.allSettled(wpSites.map(async (site) => {
      const result = await checkSiteWordPress(site, latestVersion)
      await db.update(sites).set({ ...result, wp_checked_at: new Date().toISOString() }).where(eq(sites.id, site.id))
    }))

    const checked = results.filter(r => r.status === 'fulfilled').length
    return { result: { total: wpSites.length, checked } }
  },
})
