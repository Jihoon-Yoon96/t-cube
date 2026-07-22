import { generateHtmlFromDesignFile } from './geminiToHtml'
import { fetchDesignReferenceAnalysis } from './designReferenceUrl'
import { createLayoutDesignPrompt } from './prompts/layoutDesignPrompt'
import { createLayoutDesignHtml } from '~/services/builder/layoutDesignToHtml'
import type { DesignToHtmlSourceFile } from './geminiToHtml'
import type { BuilderLayoutBlock } from '~/stores/builder/type/types'
import type { DesignToHtmlResponse } from '~/types/builder/design-to-html'
import type {
  BuilderLayoutDesignColors,
  BuilderLayoutViewport
} from '~/types/builder/layout-design'

type GenerateLayoutDesignParams = {
  category: string
  purpose: string
  viewport: BuilderLayoutViewport
  referenceUrl?: string
  designColors: Partial<BuilderLayoutDesignColors>
  blocks: BuilderLayoutBlock[]
  planningFile?: DesignToHtmlSourceFile
}

/**
 * 입력 정보와 배치 레이아웃 기반 AI 디자인 HTML 생성
 * 첨부 PDF가 없으면 레이아웃 JSON을 Gemini inline 데이터로 전달
 *
 * @param params 디자인 정보, 레이아웃 블록, 선택 결과 유형
 * @returns AI 또는 더미 HTML 생성 응답
 */
export async function generateLayoutDesign(params: GenerateLayoutDesignParams): Promise<DesignToHtmlResponse> {
  const title = `${params.category} 디자인 시안`
  const referenceAnalysis = params.referenceUrl
    ? await fetchDesignReferenceAnalysis(params.referenceUrl)
    : ''
  const layoutJson = JSON.stringify({
    category: params.category,
    purpose: params.purpose,
    viewport: params.viewport,
    referenceUrl: params.referenceUrl,
    designColors: params.designColors,
    blocks: params.blocks
  })
  const sourceFile = params.planningFile || {
    fileName: 'layout-design.json',
    mimeType: 'text/plain',
    data: Buffer.from(layoutJson, 'utf8')
  }

  return generateHtmlFromDesignFile({
    sourceFile,
    fallbackTitle: title,
    prompt: createLayoutDesignPrompt({
      category: params.category,
      purpose: params.purpose,
      viewport: params.viewport,
      referenceUrl: params.referenceUrl,
      referenceAnalysis,
      designColors: params.designColors,
      blocks: params.blocks,
      hasPlanningFile: Boolean(params.planningFile)
    }),
    dummyHtml: createLayoutDesignHtml(params.blocks),
    dummyWarning: 'GEMINI_API_KEY가 설정되지 않아 배치한 레이아웃 기반 HTML을 반환했습니다.'
  })
}
