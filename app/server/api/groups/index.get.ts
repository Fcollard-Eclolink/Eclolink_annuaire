export default defineEventHandler(async (event): Promise<Group[]> => {
  const res = await sbFetch(event, '/rest/v1/eclolink_groups?select=*&order=name.asc')
  return (await res.json()) as Group[]
})
