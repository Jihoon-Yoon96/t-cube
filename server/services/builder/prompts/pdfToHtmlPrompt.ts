/**
 * PDF 디자인 분석용 Gemini 프롬프트 생성
 *
 * @param title - 문서 제목 후보
 * @returns PDF 기반 HTML 생성을 요청하는 프롬프트
 */
export function createPdfToHtmlPrompt(title: string) {
  return [
    '업로드된 PDF 디자인 시안을 분석해서 단일 HTML 문서로 변환해주세요.',
    '반환값은 JSON 객체 하나만 출력해주세요.',
    'JSON 스키마는 {"title": string, "html": string, "warnings": string[]} 입니다.',
    'html 값은 <!doctype html>로 시작하는 완전한 HTML 문서여야 합니다.',
    'CSS는 HTML 내부 <style> 태그에 포함해주세요.',
    '외부 이미지, 외부 CSS, 외부 JavaScript 의존성은 사용하지 마세요.',
    'PDF의 페이지 구조, 섹션 흐름, 표, 버튼, 이미지 배치, 색상, 간격, 타이포그래피를 최대한 반영해주세요.',
    '여러 페이지가 있다면 각 페이지를 자연스럽게 이어지는 section으로 구성해주세요.',
    '결과물은 header, main, section, article, nav, footer 등 의미에 맞는 시멘틱 HTML 구조로 작성해주세요.',
    '아이콘 또는 이미지로 유추되는 영역은 img 태그를 사용하고, src는 빈 문자열로 두며, alt에는 짧은 설명글을 넣어주세요.',
    '반응형 기본 처리를 포함해주세요.',
    '텍스트를 정확히 읽기 어려운 영역은 의미가 유지되는 한국어 대체 텍스트로 작성하고 warnings에 기록해주세요.',
    `문서 제목 후보: ${title}`
  ].join('\n')
}
