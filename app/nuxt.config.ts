export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  devServer: {
    host: '0.0.0.0',
  },

  runtimeConfig: {
    supabaseUrl: '',  // surcharge via NUXT_SUPABASE_URL
    supabaseKey: '',  // surcharge via NUXT_SUPABASE_KEY
  },

  css: ['~/assets/css/main.css'],
})
