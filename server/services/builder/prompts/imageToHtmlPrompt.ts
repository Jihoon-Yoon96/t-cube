export function createImageToHtmlPrompt(title: string) {
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
