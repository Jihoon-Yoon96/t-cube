import { generateHtmlFromDesignFile } from './geminiToHtml'
import { createPdfToHtmlPrompt } from './prompts/pdfToHtmlPrompt'
import type { DesignToHtmlSourceFile } from './geminiToHtml'
import type { DesignToHtmlResponse } from '~/types/builder/design-to-html'

type GenerateHtmlFromPdfDesignParams = {
  pdf: DesignToHtmlSourceFile
}

/**
 * PDF 디자인 파일 기반 HTML 생성
 *
 * @param params - 업로드 PDF 파일 파라미터
 * @returns PDF 기반 HTML 생성 응답
 */
export async function generateHtmlFromPdfDesign(
  params: GenerateHtmlFromPdfDesignParams
): Promise<DesignToHtmlResponse> {
  const title = params.pdf.fileName.replace(/\.[^.]+$/, '') || 'PDF 기반 템플릿'

  return generateHtmlFromDesignFile({
    sourceFile: params.pdf,
    fallbackTitle: title,
    prompt: createPdfToHtmlPrompt(title),
    dummyHtml: createDummyPdfTemplateHtml(title),
    dummyWarning: 'GEMINI_API_KEY가 설정되지 않아 PDF 기반 더미 HTML을 반환했습니다.'
  })
}

/**
 * Gemini API 키 미설정 시 사용할 PDF 더미 HTML 생성
 *
 * @param title - 더미 문서 제목
 * @returns PDF 기반 더미 HTML 문자열
 */
function createDummyPdfTemplateHtml(title: string) {
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
        background: #f5f6fb;
        color: #171a2a;
        font-family: Arial, "Noto Sans KR", sans-serif;
      }

      .document {
        width: min(960px, calc(100% - 40px));
        margin: 0 auto;
        padding: 64px 0;
      }

      .page {
        border-radius: 20px;
        background: #ffffff;
        padding: 48px;
        box-shadow: 0 24px 60px rgba(29, 37, 71, 0.12);
      }

      .eyebrow {
        margin: 0 0 12px;
        color: #6168ff;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: 40px;
        line-height: 1.2;
      }

      .summary {
        margin: 18px 0 0;
        color: #5d6475;
        font-size: 16px;
        line-height: 1.7;
      }

      .sections {
        display: grid;
        gap: 18px;
        margin-top: 32px;
      }

      .section {
        border: 1px solid #e5e8f4;
        border-radius: 16px;
        padding: 24px;
      }

      .section h2 {
        margin: 0;
        font-size: 20px;
      }

      .section p {
        margin: 10px 0 0;
        color: #626b7f;
        font-size: 14px;
        line-height: 1.7;
      }
    </style>
  </head>
  <body>
    <main class="document">
      <article class="page">
        <p class="eyebrow">Generated PDF Draft</p>
        <h1>${escapeHtml(title)} 기반 HTML 초안</h1>
        <p class="summary">업로드한 PDF 시안을 HTML 템플릿으로 변환하기 위한 더미 결과입니다. 실제 PDF 분석 API가 연결되면 페이지 구조와 문서 스타일을 반영한 코드로 대체됩니다.</p>
        <div class="sections">
          <section class="section">
            <h2>페이지 구조</h2>
            <p>PDF의 페이지와 섹션 흐름을 HTML section 구조로 변환합니다.</p>
          </section>
          <section class="section">
            <h2>콘텐츠</h2>
            <p>문서 안의 제목, 본문, 표, 이미지 배치를 편집 가능한 HTML로 정리합니다.</p>
          </section>
          <section class="section">
            <h2>스타일</h2>
            <p>간격, 색상, 타이포그래피를 CSS 규칙으로 재구성합니다.</p>
          </section>
        </div>
      </article>
    </main>
  </body>
</html>`
}

/**
 * HTML 템플릿 삽입용 문자열 이스케이프
 *
 * @param value - 이스케이프 대상 문자열
 * @returns HTML 엔티티로 치환된 문자열
 */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
