// Détection de version WordPress (core + plugins) d'un site.
//
// - Core : version installée détectée même sans le mu-plugin, via
//   <meta name="generator">. Comparée côté client à la dernière version
//   publiée par l'API publique WordPress.org (une seule requête par run,
//   partagée par tous les sites).
// - Plugins : nécessite le mu-plugin (docs/eclolink-status-plugin.php) déployé
//   sur le site, avec une clé partagée définie dans wp-config.php (wp_api_key
//   côté annuaire) — WordPress n'expose ce compte nulle part publiquement.

const WP_VERSION_CHECK_URL = 'https://api.wordpress.org/core/version-check/1.7/'
const FETCH_TIMEOUT_MS = 8000

export interface WpCheckResult {
  wp_core_version  : string | null
  wp_latest_version: string | null
  wp_plugin_updates: number | null
}

interface PluginStatus {
  core_version: string
  plugin_updates: number
}

export async function fetchLatestWpVersion(): Promise<string | null> {
  try {
    const res = await $fetch<{ offers?: { version?: string }[] }>(WP_VERSION_CHECK_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    return res.offers?.[0]?.version ?? null
  } catch {
    return null
  }
}

function detectGeneratorVersion(html: string): string | null {
  const m = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']WordPress\s+([\d.]+)/i)
  return m?.[1] ?? null
}

async function checkViaPlugin(url: string, apiKey: string): Promise<PluginStatus | null> {
  try {
    const base = url.replace(/\/$/, '')
    return await $fetch<PluginStatus>(`${base}/wp-json/eclolink/v1/status`, {
      headers: { 'X-Eclolink-Key': apiKey },
      signal : AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch {
    return null
  }
}

async function detectVersionFromHtml(url: string): Promise<string | null> {
  try {
    const html = await $fetch<string>(url, {
      signal      : AbortSignal.timeout(FETCH_TIMEOUT_MS),
      responseType: 'text',
    })
    return detectGeneratorVersion(html)
  } catch {
    return null
  }
}

export async function checkSiteWordPress(
  site: { url: string | null; wp_api_key: string | null },
  latestVersion: string | null,
): Promise<WpCheckResult> {
  if (!site.url) return { wp_core_version: null, wp_latest_version: null, wp_plugin_updates: null }

  if (site.wp_api_key) {
    const status = await checkViaPlugin(site.url, site.wp_api_key)
    if (status) return { wp_core_version: status.core_version, wp_latest_version: latestVersion, wp_plugin_updates: status.plugin_updates }
  }

  const version = await detectVersionFromHtml(site.url)
  return { wp_core_version: version, wp_latest_version: version ? latestVersion : null, wp_plugin_updates: null }
}
