const CONFIG = require('./config/config')
const DEFAULT_GEMINI_IMAGE_TO_HTML_MODEL = 'gemini-3.5-flash'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiImageToHtmlModel: process.env.GEMINI_IMAGE_TO_HTML_MODEL || CONFIG.GEMINI?.MODEL || DEFAULT_GEMINI_IMAGE_TO_HTML_MODEL
  },
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
    '~/assets/styles/common.css',
    'remixicon/fonts/remixicon.css'
  ]
})
