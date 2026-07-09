# Gemini API 호출 데이터 구조

## 1. 목적

이 문서는 이미지/PDF 디자인 파일을 HTML로 변환할 때 Gemini API 호출에 필요한 데이터 구조를 정의한다.

현재 구현은 `server/services/builder/geminiToHtml.ts`를 중심으로 동작한다. Gemini 3.5 Flash와 Gemini 2.5 Flash는 같은 `generateContent` API 구조를 사용할 수 있으므로, 모델을 바꾸더라도 요청/응답 데이터 모델은 동일하게 유지한다.

참고 문서:

- [Gemini generateContent API](https://ai.google.dev/api/generate-content)
- [Gemini 3.5 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash)

## 2. 전체 호출 흐름

```txt
이미지/PDF 업로드
-> server/api/builder/image-to-html.post.ts 또는 pdf-to-html.post.ts
-> generateHtmlFromImageDesign() 또는 generateHtmlFromPdfDesign()
-> generateHtmlFromDesignFile()
-> requestGeminiWithFallback()
-> requestGeminiWithRetry()
-> requestGemini()
-> parseGeminiToHtmlResponse()
-> DesignToHtmlResponse 반환
```

Gemini API는 서버에서만 호출한다. API key와 원본 파일 binary는 클라이언트에 노출하지 않는다.

## 3. 프로젝트 내부 입력 구조

Gemini 호출 직전의 원본 파일 구조는 `DesignToHtmlSourceFile`이다.

```ts
export type DesignToHtmlSourceFile = {
  fileName: string
  mimeType: string
  data: Uint8Array
}
```

필드 의미:

| 필드 | 설명 |
| --- | --- |
| `fileName` | 업로드된 원본 파일명 |
| `mimeType` | Gemini `inline_data.mime_type`에 전달할 MIME type |
| `data` | 업로드 파일의 binary 데이터 |

Gemini 요청에 들어갈 때 `data`는 base64 문자열로 변환한다.

```ts
Buffer.from(sourceFile.data).toString('base64')
```

## 4. 모델 설정 구조

현재 기본 모델은 `gemini-3.5-flash`이다.

```ts
const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash'
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash'
```

실제 모델 선택 우선순위:

```txt
GEMINI_IMAGE_TO_HTML_MODEL 환경변수
-> config/app.{env}.config.json의 GEMINI.MODEL
-> GEMINI_DEFAULT_MODEL
```

2.5 Flash로 전환하려면 `.env` 또는 환경별 config의 모델명만 바꾼다.

```env
GEMINI_IMAGE_TO_HTML_MODEL=gemini-2.5-flash
```

## 5. Gemini HTTP 요청 구조

요청 endpoint:

```txt
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

요청 header:

```http
x-goog-api-key: {GEMINI_API_KEY}
Content-Type: application/json
```

요청 body:

```ts
type GeminiGenerateContentRequest = {
  contents: Array<{
    role: 'user'
    parts: Array<
      | {
          text: string
        }
      | {
          inline_data: {
            mime_type: string
            data: string
          }
        }
    >
  }>
}
```

현재 프로젝트에서 전송하는 실제 형태:

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "{imageToHtmlPrompt 또는 pdfToHtmlPrompt 결과}"
        },
        {
          "inline_data": {
            "mime_type": "image/png",
            "data": "{base64 encoded file}"
          }
        }
      ]
    }
  ]
}
```

PDF도 같은 구조를 사용한다. 차이는 `mime_type`이 `application/pdf` 계열이 된다는 점뿐이다.

## 6. Gemini 원본 응답 구조

Gemini `generateContent` 응답에서 프로젝트가 사용하는 핵심 필드는 `candidates[].content.parts[].text`이다.

```ts
type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}
```

현재 구현은 모든 candidate의 text part를 모아서 하나의 문자열로 병합한다.

```txt
candidates[]
-> content.parts[]
-> text
-> '\n'으로 병합
```

## 7. Gemini 출력 텍스트 내부 계약

Gemini가 반환해야 하는 텍스트는 가능한 한 JSON 문자열이어야 한다.

```ts
type GeminiToHtmlJson = {
  title?: string
  html?: string
  warnings?: string[]
}
```

권장 응답 예시:

```json
{
  "title": "Landing Page Draft",
  "html": "<!doctype html><html>...</html>",
  "warnings": [
    "원본 이미지의 일부 작은 텍스트는 추정하여 구성"
  ]
}
```

Gemini가 Markdown code fence로 JSON을 감싸도 허용한다.

```txt
```json
{
  "title": "Landing Page Draft",
  "html": "<!doctype html><html>...</html>",
  "warnings": []
}
```
```

`extractJsonText()`는 code fence가 있으면 내부 JSON만 추출한다.

## 8. 파싱 규칙

응답 파싱 순서:

```txt
Gemini 원본 응답
-> getGeminiOutputText()
-> extractJsonText()
-> JSON.parse()
-> GeminiToHtmlJson
```

JSON 파싱에 성공하면 `title`, `html`, `warnings`를 사용한다.

JSON 파싱에 실패하면 Gemini 출력 전체를 HTML로 간주한다.

```ts
{
  title: '',
  html: outputText,
  warnings: [
    'AI 응답이 JSON 형식이 아니어서 전체 응답을 HTML로 처리'
  ]
}
```

최종적으로 `html`이 비어 있으면 `502` 오류를 발생시킨다.

## 9. 프로젝트 최종 응답 구조

클라이언트로 반환되는 구조는 `DesignToHtmlResponse`이다.

```ts
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
```

Gemini 응답과 프로젝트 응답의 매핑:

| Gemini 출력 | 프로젝트 응답 |
| --- | --- |
| `title` | `title`, 없으면 fallback title |
| `html` | `html`, 필수 |
| `warnings` | `warnings`에 병합 |
| 원본 파일명 | `meta.sourceName` |
| AI 사용 여부 | `meta.mode = 'ai'` |
| 생성 시각 | `meta.generatedAt` |

## 10. 오류 응답 구조

Gemini 호출 실패 시 오류 메시지는 `error.message`에서 추출한다.

```ts
type GeminiErrorResponse = {
  error?: {
    message?: string
  }
}
```

재시도 대상 HTTP status:

```txt
429, 500, 502, 503, 504
```

재시도 흐름:

```txt
같은 모델로 최대 3회 재시도
-> 계속 실패하면 fallback 모델로 재시도
-> fallback도 실패하면 마지막 오류 전달
```

현재 fallback 모델은 `gemini-2.5-flash`이다.

## 11. 모델별 구조 변경 판단

Gemini 3.5 Flash와 2.5 Flash는 현재 요구사항에서 같은 `generateContent` 요청/응답 구조를 사용한다.

따라서 모델 변경 시 바꾸지 않는 것:

- `contents[].parts[]` 요청 구조
- `inline_data.mime_type`, `inline_data.data` 파일 전달 구조
- `candidates[].content.parts[].text` 응답 파싱 구조
- `GeminiToHtmlJson` 내부 출력 계약
- `DesignToHtmlResponse` 클라이언트 응답 구조

모델 변경 시 바꾸는 것:

- 모델명
- 필요 시 fallback 모델명
- 필요 시 prompt 문구 또는 generation config

향후 Gemini가 아닌 다른 벤더 모델을 추가할 경우에는 이 문서의 Gemini 구조를 그대로 확장하지 말고 provider adapter를 분리한다.

```txt
DesignToHtmlSourceFile
-> Gemini adapter 또는 OtherModel adapter
-> 공통 GeminiToHtmlJson과 유사한 내부 결과
-> DesignToHtmlResponse
```

