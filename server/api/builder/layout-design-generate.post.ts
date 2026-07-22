import { generateLayoutDesign } from '~/server/services/builder/layoutDesignGenerate'
import type { BuilderLayoutBlock } from '~/stores/builder/type/types'
import type { DesignToHtmlResponse } from '~/types/builder/design-to-html'
import type {
  BuilderLayoutDesignColors,
  BuilderLayoutViewport
} from '~/types/builder/layout-design'

type LayoutDesignBriefPayload = {
  category?: unknown
  purpose?: unknown
  viewport?: unknown
  referenceUrl?: unknown
  designColors?: unknown
}

/**
 * 정보 입력 및 배치 레이아웃 기반 AI 디자인 생성 요청 처리
 *
 * @param event multipart 디자인 생성 요청 이벤트
 * @returns AI 생성 HTML 응답
 */
export default defineEventHandler(async (event): Promise<DesignToHtmlResponse> => {
  const formData = await readMultipartFormData(event)
  const brief = parseJsonField<LayoutDesignBriefPayload>(formData, 'brief')
  const blocks = parseJsonField<BuilderLayoutBlock[]>(formData, 'blocks')
  const planningFile = formData?.find((item) => item.name === 'planningFile')

  if (!isValidBrief(brief) || !Array.isArray(blocks)) {
    throw createError({
      statusCode: 400,
      statusMessage: '디자인 생성 정보가 올바르지 않습니다.'
    })
  }

  const referenceUrl = normalizeReferenceUrl(brief.referenceUrl)
  const designColors = normalizeDesignColors(brief.designColors)

  if (planningFile?.data.length && !isPdfFile(planningFile.type, planningFile.filename)) {
    throw createError({
      statusCode: 400,
      statusMessage: '기획안은 PDF 파일만 첨부할 수 있습니다.'
    })
  }

  return generateLayoutDesign({
    category: brief.category,
    purpose: brief.purpose,
    viewport: brief.viewport,
    referenceUrl,
    designColors,
    blocks,
    planningFile: planningFile?.data.length
      ? {
          fileName: planningFile.filename || 'planning-document.pdf',
          mimeType: planningFile.type || 'application/pdf',
          data: planningFile.data
        }
      : undefined
  })
})

/**
 * multipart JSON 필드 파싱
 *
 * @param formData multipart 필드 목록
 * @param name 읽을 필드명
 * @returns 파싱 결과, 실패 시 null
 */
function parseJsonField<T>(formData: Awaited<ReturnType<typeof readMultipartFormData>>, name: string) {
  const value = readTextField(formData, name)

  if (!value) return null

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

/**
 * multipart 문자열 필드 조회
 *
 * @param formData multipart 필드 목록
 * @param name 읽을 필드명
 * @returns UTF-8 문자열, 없으면 빈 문자열
 */
function readTextField(formData: Awaited<ReturnType<typeof readMultipartFormData>>, name: string) {
  return formData?.find((item) => item.name === name)?.data.toString('utf8') || ''
}

/**
 * 필수 디자인 정보 형식 검증
 *
 * @param brief 검증할 정보 payload
 * @returns 유효한 정보이면 true
 */
function isValidBrief(brief: LayoutDesignBriefPayload | null): brief is {
  category: string
  purpose: string
  viewport: BuilderLayoutViewport
} {
  return Boolean(
    brief
    && typeof brief.category === 'string'
    && brief.category.trim()
    && typeof brief.purpose === 'string'
    && brief.purpose.trim()
    && ['pc', 'mobile', 'responsive'].includes(String(brief.viewport))
  )
}

/**
 * 선택 입력 URL의 프로토콜과 길이 검증 및 정규화
 *
 * @param value URL 입력값
 * @returns 정규화된 공개 웹 URL 또는 undefined
 */
function normalizeReferenceUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return undefined

  const normalizedValue = value.trim()

  if (normalizedValue.length > 2048) {
    throw createError({ statusCode: 400, statusMessage: '참고 URL이 너무 깁니다.' })
  }

  try {
    const url = new URL(normalizedValue)

    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol')

    return url.toString()
  } catch {
    throw createError({ statusCode: 400, statusMessage: '참고 URL 형식이 올바르지 않습니다.' })
  }
}

/**
 * 입력된 디자인 색상 문자열만 AI 전달 객체로 정리
 *
 * @param value 디자인 색상 payload
 * @returns 값이 입력된 디자인 색상 객체
 */
function normalizeDesignColors(value: unknown): Partial<BuilderLayoutDesignColors> {
  if (!value || typeof value !== 'object') return {}

  const source = value as Record<string, unknown>
  const colorKeys: Array<keyof BuilderLayoutDesignColors> = ['main', 'sub', 'background', 'accent']

  return colorKeys.reduce<Partial<BuilderLayoutDesignColors>>((colors, key) => {
    const color = source[key]

    if (typeof color === 'string' && color.trim()) colors[key] = color.trim().slice(0, 40)
    return colors
  }, {})
}

/**
 * 첨부 파일 PDF 형식 검증
 *
 * @param mimeType 파일 MIME 타입
 * @param fileName 파일명
 * @returns PDF 파일이면 true
 */
function isPdfFile(mimeType = '', fileName = '') {
  return mimeType.toLowerCase() === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
}
