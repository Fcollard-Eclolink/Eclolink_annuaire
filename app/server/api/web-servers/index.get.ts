export default defineEventHandler(async (event): Promise<string[]> => {
  const res  = await sbFetch(event, '/rest/v1/eclolink_groups?select=web_server&web_server=not.is.null&order=web_server.asc')
  const rows = (await res.json()) as { web_server: string }[]
  const seen = new Set<string>()
  return rows.reduce<string[]>((acc, r) => {
    if (r.web_server && !seen.has(r.web_server)) { seen.add(r.web_server); acc.push(r.web_server) }
    return acc
  }, [])
})
