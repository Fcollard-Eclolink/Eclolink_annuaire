import type { UserProfile } from '~/server/utils/types'

export default defineEventHandler(async (event): Promise<UserProfile[]> => {
  const query = getQuery(event)
  const role  = query.role as string | undefined

  let url = '/rest/v1/eclolink_user_profiles?select=*&order=last_name.asc,first_name.asc'
  if (role) url += `&role=eq.${encodeURIComponent(role)}`

  const res = await sbFetch(event, url)
  return (await res.json()) as UserProfile[]
})
