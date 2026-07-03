export type ImageToHtmlRequestMeta = {
  fileName: string
  mimeType: string
  size: number
}

export type ImageToHtmlResponse = {
  title: string
  html: string
  warnings: string[]
  meta: {
    sourceName: string
    mode: 'dummy' | 'ai'
    generatedAt: string
  }
}

export type ImageToHtmlErrorResponse = {
  message: string
  code: 'INVALID_IMAGE_FILE' | 'IMAGE_TO_HTML_FAILED'
}
