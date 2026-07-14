import type { BuilderLayoutBlock } from '~/stores/builder/type/types'
import type { BuilderLayoutGenerateType, BuilderLayoutViewport } from '~/types/builder/layout-design'

type LayoutDesignPromptParams = {
  category: string
  purpose: string
  viewport: BuilderLayoutViewport
  outputType: BuilderLayoutGenerateType
  blocks: BuilderLayoutBlock[]
  hasPlanningFile: boolean
}

/**
 * 레이아웃 정보 기반 디자인 시안 HTML 생성 프롬프트 구성
 *
 * @param params 사용자 정보, 레이아웃 블록, 결과 유형
 * @returns Gemini 요청용 프롬프트
 */
export function createLayoutDesignPrompt(params: LayoutDesignPromptParams) {
  const viewportLabel = {
    pc: 'PC 데스크톱',
    mobile: '모바일',
    responsive: '반응형'
  }[params.viewport]
  const outputLabel = {
    html: 'HTML 편집',
    image: 'PNG 이미지 다운로드',
    pdf: 'PDF 문서 다운로드'
  }[params.outputType]

  return `당신은 기업용 웹 디자인 시안을 제작하는 전문 UI 디자이너이자 프론트엔드 개발자입니다.

아래 입력 정보와 레이아웃 블록을 바탕으로 완성도 높은 단일 HTML 문서를 생성하세요.

[제작 정보]
- 카테고리/브랜드: ${params.category}
- 목적: ${params.purpose}
- 화면 기준: ${viewportLabel}
- 최종 사용 방식: ${outputLabel}
- 기획안 PDF 첨부: ${params.hasPlanningFile ? '있음. 첨부 문서의 콘텐츠와 시각적 맥락을 참고' : '없음'}

[레이아웃 블록 JSON]
${JSON.stringify(params.blocks, null, 2)}

[제작 규칙]
1. 레이아웃 블록의 종류, 좌표, 크기, 계층, 라벨과 설명을 디자인 구조의 핵심 제약으로 사용
2. 블록이 없으면 제작 정보만으로 적절한 화면 구조를 직접 설계
3. 실제 서비스에 사용할 수 있는 자연스러운 한국어 카피와 시각적 계층 구성
4. 외부 JavaScript와 외부 CSS 없이 실행 가능한 완전한 HTML 문서 작성
5. 이미지가 필요하면 외부 URL 대신 CSS 그라데이션, 도형, inline SVG 또는 data URI 사용
6. ${viewportLabel} 기준에 맞춰 화면 구성. 반응형이면 모바일 media query 포함
7. 결과에는 편집 가능한 텍스트와 명확한 semantic HTML 사용

반드시 아래 JSON 형식만 반환하세요. Markdown 코드 펜스는 사용하지 마세요.
{
  "title": "생성된 시안 제목",
  "html": "<!doctype html>로 시작하는 전체 HTML 문서",
  "warnings": []
}`
}
