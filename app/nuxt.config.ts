export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  devServer: {
    host: '0.0.0.0',
  },

  vite: {
    server: {
      // HMR désactivé : les changements de code nécessitent un refresh manuel
      // du navigateur. Évite les bugs de state zombie sur les composables.
      hmr: false,
    },
  },

  runtimeConfig: {
    supabaseUrl: '',  // surcharge via NUXT_SUPABASE_URL
    supabaseKey: '',  // surcharge via NUXT_SUPABASE_KEY
  },

  css: ['~/assets/css/main.css'],
})
