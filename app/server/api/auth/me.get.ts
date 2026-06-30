import type { UserProfile } from '~/server/utils/types'

export default defineEventHandler(async (event): Promise<SupabaseUser> => {
  // 1. Récupère l'utilisateur Supabase Auth
  const res  = await sbFetch(event, '/auth/v1/user')
  const raw  = (await res.json()) as { id: string; email: string }

  // 2. Récupère (ou crée) le profil en DB
  const profileRes = await sbFetch(event, `/rest/v1/eclolink_user_profiles?user_id=eq.${encodeURIComponent(raw.id)}&select=*`)
  let profiles = (await profileRes.json()) as UserProfile[]

  if (!profiles.length) {
    // Création automatique du profil au premier login
    const createRes = await sbFetch(event, '/rest/v1/eclolink_user_profiles', {
      method : 'POST',
      body   : JSON.stringify({ user_id: raw.id, first_name: '', last_name: '', role: 'viewer' }),
      headers: { Prefer: 'return=representation' },
    })
    profiles = (await createRes.json()) as UserProfile[]
  }

  const profile = profiles[0]

  return {
    id        : raw.id,
    email     : raw.email,
    first_name: profile?.first_name ?? '',
    last_name : profile?.last_name  ?? '',
    role      : profile?.role       ?? 'viewer',
    agency    : profile?.agency     ?? null,
    job_title : profile?.job_title  ?? null,
  }
})
