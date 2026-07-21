import { revokeCurrentSession } from '~/server/utils/session'

export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  await revokeCurrentSession(event)
  return { ok: true }
})
