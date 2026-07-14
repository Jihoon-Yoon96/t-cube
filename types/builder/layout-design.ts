export type BuilderLayoutViewport = 'pc' | 'mobile' | 'responsive'
export type BuilderLayoutGenerateType = 'html' | 'image' | 'pdf'

export type BuilderLayoutDesignBrief = {
  category: string
  purpose: string
  viewport: BuilderLayoutViewport
  planningFile: File | null
}
