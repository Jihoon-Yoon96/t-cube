import { createRequire } from 'node:module'

type AppRuntimeConfig = {
  GEMINI?: {
    API_KEY?: string
    MODEL?: string
  }
}

const require = createRequire(import.meta.url)
const appConfig = require('./config/config.cjs') as AppRuntimeConfig

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    geminiApiKey: process.env.GEMINI_API_KEY || appConfig.GEMINI?.API_KEY || '',
    geminiImageToHtmlModel: process.env.GEMINI_IMAGE_TO_HTML_MODEL || appConfig.GEMINI?.MODEL || 'gemini-2.5-flash'
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
