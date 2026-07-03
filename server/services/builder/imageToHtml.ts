import type { ImageToHtmlResponse } from '~/types/builder/image-to-html'

type ImageToHtmlSourceImage = {
  fileName: string
  mimeType: string
  data: Uint8Array
}

type GenerateHtmlFromImageDesignParams = {
  image: ImageToHtmlSourceImage
}

type GeminiImageToHtmlJson = {
  title?: string
  html?: string
  warnings?: string[]
}

type GeminiAttemptResult = {
  generated: GeminiImageToHtmlJson
  warnings: string[]
}

const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash-lite'
const GEMINI_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])

export async function generateHtmlFromImageDesign(
  params: GenerateHtmlFromImageDesignParams
): Promise<ImageToHtmlResponse> {
  const config = useRuntimeConfig()
  const sourceName = params.image.fileName || 'uploaded-design-image'
  const title = sourceName.replace(/\.[^.]+$/, '') || '이미지 기반 템플릿'

  if (config.geminiApiKey) {
    return generateHtmlFromImageDesignWithGemini({
      image: params.image,
      title,
      apiKey: config.geminiApiKey,
      model: config.geminiImageToHtmlModel || 'gemini-2.5-flash'
    })
  }

  return {
    title,
    html: createDummyImageTemplateHtml(title),
    warnings: [
      'GEMINI_API_KEY가 설정되지 않아 더미 HTML을 반환했습니다.'
    ],
    meta: {
      sourceName,
      mode: 'dummy',
      generatedAt: new Date().toISOString()
    }
  }
}

async function generateHtmlFromImageDesignWithGemini(params: {
  image: ImageToHtmlSourceImage
  title: string
  apiKey: string
  model: string
}): Promise<ImageToHtmlResponse> {
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
      sourceName: params.image.fileName,
      mode: 'ai',
      generatedAt: new Date().toISOString()
    }
  }
}

async function requestGeminiWithFallback(params: {
  image: ImageToHtmlSourceImage
  title: string
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
  image: ImageToHtmlSourceImage
  title: string
  apiKey: string
  model: string
}): Promise<GeminiImageToHtmlJson> {
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
  image: ImageToHtmlSourceImage
  title: string
  apiKey: string
  model: string
}): Promise<GeminiImageToHtmlJson> {
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
              text: createImageToHtmlPrompt(params.title)
            },
            {
              inline_data: {
                mime_type: params.image.mimeType || 'application/octet-stream',
                data: createImageBase64(params.image)
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

  return parseGeminiImageToHtmlResponse(responseJson)
}

function createImageBase64(image: ImageToHtmlSourceImage) {
  return Buffer.from(image.data).toString('base64')
}

function createImageToHtmlPrompt(title: string) {
  return [
    '업로드된 디자인 시안 이미지를 분석해서 단일 HTML 문서로 변환해주세요.',
    '반환값은 JSON 객체 하나만 출력해주세요.',
    'JSON 스키마는 {"title": string, "html": string, "warnings": string[]} 입니다.',
    'html 값은 <!doctype html>로 시작하는 완전한 HTML 문서여야 합니다.',
    'CSS는 HTML 내부 <style> 태그에 포함해주세요.',
    '외부 이미지, 외부 CSS, 외부 JavaScript 의존성은 사용하지 마세요.',
    '이미지에 보이는 레이아웃, 색상, 간격, 타이포그래피를 최대한 반영해주세요.',
    '반응형 기본 처리를 포함해주세요.',
    '텍스트를 정확히 읽기 어려운 영역은 의미가 유지되는 한국어 대체 텍스트로 작성하고 warnings에 기록해주세요.',
    `문서 제목 후보: ${title}`
  ].join('\n')
}

function parseGeminiImageToHtmlResponse(responseJson: unknown): GeminiImageToHtmlJson {
  const outputText = getGeminiOutputText(responseJson)
  const jsonText = extractJsonText(outputText)

  try {
    return JSON.parse(jsonText) as GeminiImageToHtmlJson
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

function createDummyImageTemplateHtml(title: string) {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #f4f6fb;
        color: #151827;
        font-family: Arial, "Noto Sans KR", sans-serif;
      }

      .page {
        width: min(1080px, calc(100% - 48px));
        margin: 0 auto;
        padding: 72px 0;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
        gap: 32px;
        align-items: center;
        border-radius: 24px;
        background: #ffffff;
        padding: 48px;
        box-shadow: 0 24px 60px rgba(29, 37, 71, 0.12);
      }

      .eyebrow {
        margin: 0 0 14px;
        color: #6168ff;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: 44px;
        line-height: 1.15;
      }

      .summary {
        margin: 20px 0 0;
        color: #596070;
        font-size: 17px;
        line-height: 1.7;
      }

      .actions {
        display: flex;
        gap: 12px;
        margin-top: 30px;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        border-radius: 12px;
        padding: 0 18px;
        background: #6168ff;
        color: #ffffff;
        font-size: 15px;
        font-weight: 800;
        text-decoration: none;
      }

      .button.secondary {
        background: #eef0ff;
        color: #4f56d8;
      }

      .preview {
        min-height: 360px;
        display: grid;
        place-items: center;
        border-radius: 20px;
        background: linear-gradient(135deg, #6168ff, #8d55ff);
        color: #ffffff;
        text-align: center;
        padding: 32px;
      }

      .preview strong {
        display: block;
        font-size: 28px;
        line-height: 1.3;
      }

      .preview span {
        display: block;
        margin-top: 12px;
        opacity: 0.82;
        font-size: 15px;
        line-height: 1.6;
      }

      .cards {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px;
        margin-top: 24px;
      }

      .card {
        border-radius: 18px;
        background: #ffffff;
        padding: 24px;
        box-shadow: 0 18px 42px rgba(29, 37, 71, 0.08);
      }

      .card h2 {
        margin: 0;
        font-size: 20px;
      }

      .card p {
        margin: 12px 0 0;
        color: #626b7f;
        font-size: 14px;
        line-height: 1.6;
      }

      @media (max-width: 820px) {
        .hero,
        .cards {
          grid-template-columns: 1fr;
        }

        h1 {
          font-size: 34px;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div>
          <p class="eyebrow">Generated Draft</p>
          <h1>${escapeHtml(title)} 기반 HTML 초안</h1>
          <p class="summary">업로드한 디자인 시안을 HTML 템플릿으로 변환하기 위한 더미 결과입니다. 실제 이미지 분석 API가 연결되면 이 영역은 시안의 레이아웃과 스타일을 반영한 코드로 대체됩니다.</p>
          <div class="actions">
            <a class="button" href="#">주요 액션</a>
            <a class="button secondary" href="#">자세히 보기</a>
          </div>
        </div>
        <div class="preview">
          <strong>이미지 분석 결과 영역</strong>
          <span>현재는 파이프라인 검증용 더미 HTML입니다.</span>
        </div>
      </section>
      <section class="cards">
        <article class="card">
          <h2>레이아웃</h2>
          <p>시안의 주요 섹션과 콘텐츠 배치를 HTML 구조로 변환합니다.</p>
        </article>
        <article class="card">
          <h2>스타일</h2>
          <p>색상, 간격, 타이포그래피를 CSS 규칙으로 정리합니다.</p>
        </article>
        <article class="card">
          <h2>편집</h2>
          <p>생성된 HTML은 기존 편집기에서 텍스트와 이미지를 수정할 수 있습니다.</p>
        </article>
      </section>
    </main>
  </body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
