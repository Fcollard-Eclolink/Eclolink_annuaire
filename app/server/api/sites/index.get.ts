export default defineEventHandler(async (event): Promise<Site[]> => {
  const res = await sbFetch(event, '/rest/v1/eclolink_sites?select=*&order=name.asc')
  return (await res.json()) as Site[]
})
