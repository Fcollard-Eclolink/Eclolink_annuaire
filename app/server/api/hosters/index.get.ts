export default defineEventHandler(async (event): Promise<Hoster[]> => {
  const res = await sbFetch(event, '/rest/v1/eclolink_hosters?order=name.asc')
  return (await res.json()) as Hoster[]
})
