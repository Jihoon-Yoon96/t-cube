export type DesignToHtmlRequestMeta = {
  fileName: string
  mimeType: string
  size: number
}

export type DesignToHtmlResponse = {
  title: string
  html: string
  warnings: string[]
  meta: {
    sourceName: string
    mode: 'dummy' | 'ai'
    generatedAt: string
  }
}

export type DesignToHtmlErrorResponse = {
  message: string
  code: 'INVALID_DESIGN_FILE' | 'DESIGN_TO_HTML_FAILED'
}
