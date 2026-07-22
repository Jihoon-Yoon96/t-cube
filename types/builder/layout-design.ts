export type BuilderLayoutViewport = 'pc' | 'mobile' | 'responsive'

export type BuilderLayoutDesignColors = {
  main: string
  sub: string
  background: string
  accent: string
}

export type BuilderLayoutDesignBrief = {
  category: string
  purpose: string
  viewport: BuilderLayoutViewport
  referenceUrl: string
  designColors: BuilderLayoutDesignColors
  planningFile: File | null
}
