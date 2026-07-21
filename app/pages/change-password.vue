<script setup lang="ts">
import type { AuthUser } from '~/server/utils/types'

definePageMeta({ middleware: 'auth' })

const { user, logout } = useAuth()

const current = ref('')
const next    = ref('')
const confirm = ref('')
const loading = ref(false)
const error   = ref('')

async function submit(): Promise<void> {
  error.value = ''
  if (next.value.length < 10) {
    error.value = 'Le nouveau mot de passe doit faire au moins 10 caractères.'
    return
  }
  if (next.value !== confirm.value) {
    error.value = 'Les deux mots de passe ne correspondent pas.'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/auth/password', {
      method: 'POST',
      body  : { current_password: current.value, new_password: next.value },
    })
    // La session est rotée côté serveur ; on rafraîchit l'utilisateur.
    user.value = await $fetch<AuthUser>('/api/auth/me')
    await navigateTo('/')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Mot de passe actuel incorrect.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-screen">
    <div class="login-card">
      <h2 class="login-title">Changer le mot de passe</h2>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
        {{ user?.must_change_password
          ? 'Vous devez définir un nouveau mot de passe avant de continuer.'
          : 'Choisissez un nouveau mot de passe.' }}
      </p>

      <p v-if="error" class="login-error">{{ error }}</p>

      <form @submit.prevent="submit">
        <div class="field">
          <label for="cp-current">Mot de passe actuel</label>
          <input id="cp-current" v-model="current" type="password" autocomplete="current-password" required>
        </div>
        <div class="field">
          <label for="cp-next">Nouveau mot de passe</label>
          <input id="cp-next" v-model="next" type="password" autocomplete="new-password" placeholder="10 caractères minimum" required>
        </div>
        <div class="field">
          <label for="cp-confirm">Confirmer</label>
          <input id="cp-confirm" v-model="confirm" type="password" autocomplete="new-password" required>
        </div>

        <button class="btn primary" type="submit" :disabled="loading" style="width:100%">
          <span v-if="loading" class="spinner" />
          {{ loading ? 'Enregistrement…' : 'Valider' }}
        </button>
      </form>

      <button class="btn" style="width:100%;margin-top:8px" @click="logout">Se déconnecter</button>
    </div>
  </div>
</template>
