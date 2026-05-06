export default defineEventHandler(async (event): Promise<ProjectManager[]> => {
  const res = await sbFetch(event, '/rest/v1/eclolink_project_managers?select=*&order=first_name.asc')
  return (await res.json()) as ProjectManager[]
})
