export default defineEventHandler(async (event): Promise<MaintenanceType[]> => {
  const res = await sbFetch(event, '/rest/v1/eclolink_maintenance_types?select=*&order=label.asc')
  return (await res.json()) as MaintenanceType[]
})
