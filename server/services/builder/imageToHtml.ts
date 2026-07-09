import { generateHtmlFromDesignFile } from './geminiToHtml'
import { createImageToHtmlPrompt } from './prompts/imageToHtmlPrompt'
import type { DesignToHtmlSourceFile } from './geminiToHtml'
import type { DesignToHtmlResponse } from '~/types/builder/design-to-html'

type GenerateHtmlFromImageDesignParams = {
  image: DesignToHtmlSourceFile
}

/**
 * 이미지 디자인 파일 기반 HTML 생성
 *
 * @param params - 업로드 이미지 파일 파라미터
 * @returns 이미지 기반 HTML 생성 응답
 */
export async function generateHtmlFromImageDesign(
  params: GenerateHtmlFromImageDesignParams
): Promise<DesignToHtmlResponse> {
  const title = params.image.fileName.replace(/\.[^.]+$/, '') || '이미지 기반 템플릿'

  return generateHtmlFromDesignFile({
    sourceFile: params.image,
    fallbackTitle: title,
    prompt: createImageToHtmlPrompt(title),
    dummyHtml: createDummyImageTemplateHtml(title),
    dummyWarning: 'GEMINI_API_KEY가 설정되지 않아 이미지 기반 더미 HTML을 반환했습니다.'
  })
}

/**
 * Gemini API 키 미설정 시 사용할 이미지 더미 HTML 생성
 *
 * @param title - 더미 문서 제목
 * @returns 이미지 기반 더미 HTML 문자열
 */
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
