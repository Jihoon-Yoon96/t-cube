import { createHtmlEditSystemPrompt } from './prompts/htmlEditPrompt'
import type {
  HtmlEditChatRequestMessage,
  HtmlEditChatResponse
} from '~/types/builder/html-edit-chat'

type EditHtmlWithChatParams = {
  outerHtml: string
  targetLabel: string
  sourceName: string
  messages: HtmlEditChatRequestMessage[]
  signal?: AbortSignal
}

type GeminiHtmlEditJson = {
  outerHtml: string
  message: string
  warnings: string[]
}

const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash'
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash'
const GEMINI_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])

/**
 * 대화 요청에 맞춰 기존 HTML 수정
 *
 * @param params 현재 HTML, 대화 이력, 요청 취소 signal
 * @returns 수정 HTML과 사용자 안내 메시지
 */
export async function editHtmlWithChat(params: EditHtmlWithChatParams): Promise<HtmlEditChatResponse> {
  const config = useRuntimeConfig()

  if (!config.geminiApiKey) {
    return {
      outerHtml: params.outerHtml,
      message: 'GEMINI_API_KEY가 설정되지 않아 선택 노드를 수정하지 않았습니다.',
      warnings: ['AI HTML 편집 기능을 사용하려면 서버에 GEMINI_API_KEY를 설정해주세요.'],
      meta: {
        sourceName: params.sourceName,
        mode: 'dummy',
        generatedAt: new Date().toISOString()
      }
    }
  }

  const generated = await requestHtmlEditWithFallback({
    ...params,
    apiKey: config.geminiApiKey,
    model: config.geminiHtmlEditModel || config.geminiImageToHtmlModel || GEMINI_DEFAULT_MODEL
  })
  const outerHtml = generated.outerHtml?.trim()

  if (!outerHtml) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 응답에서 수정된 노드 outerHTML을 찾을 수 없습니다.'
    })
  }

  return {
    outerHtml,
    message: generated.message?.trim() || '요청한 내용에 맞춰 HTML을 수정했습니다.',
    warnings: generated.warnings || [],
    meta: {
      sourceName: params.sourceName,
      mode: 'ai',
      generatedAt: new Date().toISOString()
    }
  }
}

/**
 * 기본 모델 실패 시 예비 모델로 HTML 수정 재요청
 *
 * @param params Gemini 요청 설정과 HTML 편집 대화
 * @returns Gemini HTML 수정 JSON
 */
async function requestHtmlEditWithFallback(params: EditHtmlWithChatParams & {
  apiKey: string
  model: string
}) {
  const models = Array.from(new Set([
    params.model,
    params.model === GEMINI_FALLBACK_MODEL ? '' : GEMINI_FALLBACK_MODEL
  ].filter(Boolean)))
  let lastError: unknown

  for (const model of models) {
    try {
      return await requestHtmlEditFromGemini({ ...params, model })
    } catch (error) {
      if (isAbortError(error)) throw error
      if (!isRetryableGeminiError(error)) throw error
      lastError = error
    }
  }

  throw lastError
}

/**
 * Gemini generateContent API에 HTML 수정 대화 요청
 *
 * @param params Gemini 요청 설정과 HTML 편집 대화
 * @returns 파싱된 HTML 수정 JSON
 */
async function requestHtmlEditFromGemini(params: EditHtmlWithChatParams & {
  apiKey: string
  model: string
}): Promise<GeminiHtmlEditJson> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': params.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: createHtmlEditSystemPrompt(params.outerHtml, params.targetLabel) }]
      },
      contents: params.messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      })),
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            message: { type: 'STRING' },
            outerHtml: { type: 'STRING' },
            warnings: {
              type: 'ARRAY',
              items: { type: 'STRING' }
            }
          },
          required: ['message', 'outerHtml', 'warnings']
        }
      }
    }),
    signal: params.signal
  })
  const responseJson = await response.json()

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: getGeminiErrorMessage(responseJson)
    })
  }

  return parseGeminiHtmlEditResponse(responseJson)
}

/**
 * Gemini 응답에서 HTML 수정 JSON 추출
 *
 * @param responseJson Gemini 원본 응답
 * @returns HTML, 설명, 경고를 포함한 결과
 */
function parseGeminiHtmlEditResponse(responseJson: unknown): GeminiHtmlEditJson {
  const finishReasons = getGeminiFinishReasons(responseJson)

  if (finishReasons.includes('MAX_TOKENS')) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 응답이 길이 제한으로 중단되어 HTML을 적용하지 않았습니다.'
    })
  }

  const outputText = getGeminiOutputText(responseJson)
  const jsonText = extractJsonText(outputText)

  try {
    return validateGeminiHtmlEditJson(parsePossiblyEncodedJson(jsonText))
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 응답 형식을 확인할 수 없어 HTML을 적용하지 않았습니다.'
    })
  }
}

/**
 * 문자열로 한 번 더 감싸진 JSON까지 제한적으로 파싱
 *
 * @param value JSON 문자열
 * @returns 파싱된 JSON 값
 */
function parsePossiblyEncodedJson(value: string): unknown {
  const firstParsed = JSON.parse(value) as unknown

  if (typeof firstParsed !== 'string') return firstParsed

  return JSON.parse(firstParsed) as unknown
}

/**
 * Gemini HTML 편집 응답 필드와 HTML 형태 검증
 *
 * @param value 검증할 JSON 값
 * @returns 검증된 HTML 편집 응답
 */
function validateGeminiHtmlEditJson(value: unknown): GeminiHtmlEditJson {
  if (!value || typeof value !== 'object') throw new TypeError('Gemini response is not an object.')

  const result = value as Partial<GeminiHtmlEditJson>
  const outerHtml = typeof result.outerHtml === 'string' ? result.outerHtml.trim() : ''
  const message = typeof result.message === 'string' ? result.message.trim() : ''
  const warnings = Array.isArray(result.warnings)
    ? result.warnings.filter((warning): warning is string => typeof warning === 'string')
    : []

  if (!outerHtml || !looksLikeHtmlElement(outerHtml)) {
    throw new TypeError('Gemini response does not contain a valid HTML element.')
  }

  return {
    outerHtml,
    message: message || '요청한 내용에 맞춰 HTML을 수정했습니다.',
    warnings
  }
}

/**
 * JSON 원문이나 일반 설명이 HTML 요소로 오인되지 않도록 기본 형태 확인
 *
 * @param value 검사할 HTML 문자열
 * @returns HTML 요소 시작 형태이면 true
 */
function looksLikeHtmlElement(value: string) {
  const trimmed = value.trim()

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false

  return /^<[a-z][a-z0-9-]*(?:\s[^<>]*?)?\s*\/?\s*>/i.test(trimmed)
}

/**
 * Gemini 후보 응답의 종료 사유 목록 추출
 *
 * @param responseJson Gemini 원본 응답
 * @returns 후보별 종료 사유
 */
function getGeminiFinishReasons(responseJson: unknown) {
  if (!responseJson || typeof responseJson !== 'object') return []

  const candidates = (responseJson as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return []

  return candidates
    .map((candidate) => {
      if (!candidate || typeof candidate !== 'object') return ''

      const finishReason = (candidate as { finishReason?: unknown }).finishReason

      return typeof finishReason === 'string' ? finishReason : ''
    })
    .filter(Boolean)
}

/**
 * Gemini 후보 응답의 텍스트 병합
 *
 * @param responseJson Gemini 원본 응답
 * @returns 후보 응답 텍스트
 */
function getGeminiOutputText(responseJson: unknown) {
  if (!responseJson || typeof responseJson !== 'object') return ''

  const candidates = (responseJson as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ''

  return candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== 'object') return []
      const parts = (candidate as { content?: { parts?: unknown } }).content?.parts
      return Array.isArray(parts) ? parts : []
    })
    .map((part) => {
      if (!part || typeof part !== 'object') return ''
      const text = (part as { text?: unknown }).text
      return typeof text === 'string' ? text : ''
    })
    .filter(Boolean)
    .join('\n')
}

/**
 * 코드 펜스가 포함된 JSON 문자열 정리
 *
 * @param value Gemini 텍스트 응답
 * @returns JSON 파싱 대상 문자열
 */
function extractJsonText(value: string) {
  const trimmed = value.trim()
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)

  return fencedMatch?.[1]?.trim() || trimmed
}

/**
 * Gemini 오류 응답 메시지 추출
 *
 * @param responseJson Gemini 오류 응답
 * @returns 사용자 노출용 오류 메시지
 */
function getGeminiErrorMessage(responseJson: unknown) {
  if (!responseJson || typeof responseJson !== 'object') return 'Gemini API 호출에 실패했습니다.'

  const error = (responseJson as { error?: { message?: unknown } }).error

  return typeof error?.message === 'string' ? error.message : 'Gemini API 호출에 실패했습니다.'
}

/**
 * 요청 취소로 발생한 오류인지 확인
 *
 * @param error 확인할 오류
 * @returns 요청 취소 오류이면 true
 */
function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

/**
 * 예비 모델 재요청이 가능한 Gemini 오류인지 확인
 *
 * @param error 확인할 오류
 * @returns 일시적인 Gemini 오류이면 true
 */
function isRetryableGeminiError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const statusCode = (error as { statusCode?: unknown }).statusCode
  const status = (error as { status?: unknown }).status

  return GEMINI_RETRYABLE_STATUSES.has(Number(statusCode || status))
}
