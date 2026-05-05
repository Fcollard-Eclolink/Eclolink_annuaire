<script setup lang="ts">
definePageMeta({ middleware: [] }) // page publique, pas de guard

const email    = ref('')
const password = ref('')
const loading  = ref(false)
const error    = ref('')

async function submit() {
  if (!email.value || !password.value) return
  loading.value = true
  error.value   = ''

  try {
    await $fetch('/api/auth/login', {
      method : 'POST',
      body   : { email: email.value, password: password.value },
    })
    await navigateTo('/')
  } catch {
    error.value   = 'Email ou mot de passe incorrect.'
    password.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-screen">
    <div class="login-card">
      <h2 class="login-title">Annuaire Eclolink</h2>

      <p v-if="error" class="login-error">{{ error }}</p>

      <form @submit.prevent="submit">
        <div class="field">
          <label for="login-email">Email</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            placeholder="prenom@eclolink.fr"
            autocomplete="email"
            autofocus
            required
          >
        </div>

        <div class="field">
          <label for="login-password">Mot de passe</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          >
        </div>

        <button class="btn primary" type="submit" :disabled="loading" style="width:100%">
          <span v-if="loading" class="spinner" />
          {{ loading ? 'Connexion…' : 'Accéder' }}
        </button>
      </form>
    </div>
  </div>
</template>
