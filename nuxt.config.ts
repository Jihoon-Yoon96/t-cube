// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@vueuse/nuxt', '@pinia/nuxt'],
  components: [
    {
      path: '~/components/ui',
      prefix: 'Tcube',
      pathPrefix: false
    },
    {
      path: '~/components/builder',
      pathPrefix: false
    },
    {
      path: '~/components/layouts',
      prefix: 'Builder',
      pathPrefix: false
    },
    {
      path: '~/components/test',
      pathPrefix: false
    }
  ],
  css: [
    'remixicon/fonts/remixicon.css'
  ]
})
