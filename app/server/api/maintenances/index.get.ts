export default defineEventHandler(async (event): Promise<Maintenance[]> => {
  const res = await sbFetch(event, '/rest/v1/eclolink_maintenances?select=*&order=intervention_date.desc,created_at.desc')
  return (await res.json()) as Maintenance[]
})
