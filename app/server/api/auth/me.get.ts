import type { AuthUser } from '~/server/utils/types'

export default defineEventHandler(async (event): Promise<AuthUser> => {
  const user = await requireUser(event)
  return toAuthUser(user)
})
