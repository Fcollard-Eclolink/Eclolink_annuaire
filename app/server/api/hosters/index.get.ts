export default defineEventHandler(async (event): Promise<string[]> => {
  const res  = await sbFetch(event, '/rest/v1/eclolink_groups?select=hoster&hoster=not.is.null&order=hoster.asc')
  const rows = (await res.json()) as { hoster: string }[]
  const seen = new Set<string>()
  return rows.reduce<string[]>((acc, r) => {
    if (r.hoster && !seen.has(r.hoster)) { seen.add(r.hoster); acc.push(r.hoster) }
    return acc
  }, [])
})
