export default defineEventHandler(async (event): Promise<Developer[]> => {
  const res = await sbFetch(event, '/rest/v1/eclolink_developers?select=*&order=first_name.asc')
  return (await res.json()) as Developer[]
})
