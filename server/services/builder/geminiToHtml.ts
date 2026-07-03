import type { DesignToHtmlResponse } from '~/types/builder/design-to-html'

export type DesignToHtmlSourceFile = {
  fileName: string
  mimeType: string
  data: Uint8Array
}

type GenerateHtmlFromDesignFileParams = {
  sourceFile: DesignToHtmlSourceFile
  fallbackTitle: string
  prompt: string
  dummyHtml: string
  dummyWarning: string
}

type GeminiToHtmlJson = {
  title?: string
  html?: string
  warnings?: string[]
}

type GeminiAttemptResult = {
  generated: GeminiToHtmlJson
  warnings: string[]
}

const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash-lite'
const GEMINI_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])

export async function generateHtmlFromDesignFile(
  params: GenerateHtmlFromDesignFileParams
): Promise<DesignToHtmlResponse> {
  const config = useRuntimeConfig()
  const sourceName = params.sourceFile.fileName || 'uploaded-design-file'
  const title = params.fallbackTitle

  if (config.geminiApiKey) {
    return generateHtmlFromDesignFileWithGemini({
      sourceFile: params.sourceFile,
      title,
      prompt: params.prompt,
      apiKey: config.geminiApiKey,
      model: config.geminiImageToHtmlModel || 'gemini-2.5-flash'
    })
  }

  return {
    title,
    html: params.dummyHtml,
    warnings: [
      params.dummyWarning
    ],
    meta: {
      sourceName,
      mode: 'dummy',
      generatedAt: new Date().toISOString()
    }
  }
}

async function generateHtmlFromDesignFileWithGemini(params: {
  sourceFile: DesignToHtmlSourceFile
  title: string
  prompt: string
  apiKey: string
  model: string
}): Promise<DesignToHtmlResponse> {
  const result = await requestGeminiWithFallback(params)
  const html = result.generated.html?.trim()

  if (!html) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 응답에서 HTML을 찾을 수 없습니다.'
    })
  }

  return {
    title: result.generated.title?.trim() || params.title,
    html,
    warnings: [
      ...result.warnings,
      ...(result.generated.warnings || [])
    ],
    meta: {
      sourceName: params.sourceFile.fileName,
      mode: 'ai',
      generatedAt: new Date().toISOString()
    }
  }
}

async function requestGeminiWithFallback(params: {
  sourceFile: DesignToHtmlSourceFile
  title: string
  prompt: string
  apiKey: string
  model: string
}): Promise<GeminiAttemptResult> {
  const modelQueue = Array.from(new Set([
    params.model,
    params.model === GEMINI_FALLBACK_MODEL ? '' : GEMINI_FALLBACK_MODEL
  ].filter(Boolean)))
  const warnings: string[] = []
  let lastError: unknown

  for (const model of modelQueue) {
    try {
      const generated = await requestGeminiWithRetry({
        ...params,
        model
      })

      if (model !== params.model) {
        warnings.push(`${params.model} 호출이 불안정해 ${model} 모델로 다시 생성했습니다.`)
      }

      return {
        generated,
        warnings
      }
    } catch (error) {
      lastError = error

      if (!isRetryableGeminiError(error)) {
        throw error
      }

      if (model !== modelQueue.at(-1)) {
        warnings.push(`${model} 모델 호출이 일시적으로 실패해 예비 모델로 재시도합니다.`)
      }
    }
  }

  throw lastError
}

async function requestGeminiWithRetry(params: {
  sourceFile: DesignToHtmlSourceFile
  prompt: string
  apiKey: string
  model: string
}): Promise<GeminiToHtmlJson> {
  const maxAttempts = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await requestGemini(params)
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryableGeminiError(error)) {
        throw error
      }

      await sleep(450 * attempt)
    }
  }

  return requestGemini(params)
}

async function requestGemini(params: {
  sourceFile: DesignToHtmlSourceFile
  prompt: string
  apiKey: string
  model: string
}): Promise<GeminiToHtmlJson> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': params.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: params.prompt
            },
            {
              inline_data: {
                mime_type: params.sourceFile.mimeType || 'application/octet-stream',
                data: createFileBase64(params.sourceFile)
              }
            }
          ]
        }
      ]
    })
  })

  const responseJson = await response.json()

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: getGeminiErrorMessage(responseJson)
    })
  }

  return parseGeminiToHtmlResponse(responseJson)
}

function createFileBase64(sourceFile: DesignToHtmlSourceFile) {
  return Buffer.from(sourceFile.data).toString('base64')
}

function parseGeminiToHtmlResponse(responseJson: unknown): GeminiToHtmlJson {
  const outputText = getGeminiOutputText(responseJson)
  const jsonText = extractJsonText(outputText)

  try {
    return JSON.parse(jsonText) as GeminiToHtmlJson
  } catch {
    return {
      title: '',
      html: outputText,
      warnings: ['AI 응답이 JSON 형식이 아니어서 전체 응답을 HTML로 처리했습니다.']
    }
  }
}

function getGeminiOutputText(responseJson: unknown) {
  if (!responseJson || typeof responseJson !== 'object') return ''

  const candidates = (responseJson as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ''

  return candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== 'object') return []
      const content = (candidate as { content?: { parts?: unknown } }).content
      return Array.isArray(content?.parts) ? content.parts : []
    })
    .map((content) => {
      if (!content || typeof content !== 'object') return ''
      const text = (content as { text?: unknown }).text
      return typeof text === 'string' ? text : ''
    })
    .filter(Boolean)
    .join('\n')
}

function extractJsonText(value: string) {
  const trimmed = value.trim()
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)

  if (fencedMatch?.[1]) return fencedMatch[1].trim()

  return trimmed
}

function getGeminiErrorMessage(responseJson: unknown) {
  if (!responseJson || typeof responseJson !== 'object') return 'Gemini API 호출에 실패했습니다.'

  const error = (responseJson as { error?: { message?: unknown } }).error

  return typeof error?.message === 'string' ? error.message : 'Gemini API 호출에 실패했습니다.'
}

function isRetryableGeminiError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const statusCode = (error as { statusCode?: unknown }).statusCode
  const status = (error as { status?: unknown }).status

  return GEMINI_RETRYABLE_STATUSES.has(Number(statusCode || status))
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
