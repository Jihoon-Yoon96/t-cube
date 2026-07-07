/**
 * 빌더 store와 관련 모듈에서 공유하는 타입을 정의
 */


export type BuilderView =
  | 'start' // 템플릿 생성 시작 방식 선택 화면
  | 'pdf-image-upload' // 디자인 시안 파일 유형 선택 화면
  | 'file-upload' // 선택한 파일 유형 업로드 화면
  | 'image-preview' // 업로드한 이미지 시안 확인 화면
  | 'pdf-preview' // 업로드한 PDF 시안 확인 화면
  | 'design-method' // 디자인 시안 작성 방식 선택 화면
  | 'layout-design' // 레이아웃 직접 작성 화면
  | 'ai-prompt-design' // AI 프롬프트 작성 화면
  | 'html-editor' // HTML 파싱/변환 결과 편집 화면
  | 'editor' // 기존 템플릿 수정 화면
  | 'preview' // 최종 미리보기 화면

export type BuilderViewportMode = 'desktop' | 'tablet' | 'mobile'
export type BuilderUploadFileType = 'HTML' | '이미지' | 'PDF'
export type BuilderDesignMethod = 'layout' | 'ai-prompt'
export type BuilderLayoutBlockType =
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'line'
  | 'header'
  | 'text'
  | 'image'
  | 'button'
  | 'card'
  | 'banner'
export type BuilderLayoutBlock = {
  id: string
  type: BuilderLayoutBlockType
  label: string
  description: string
  backgroundColor: string
  x: number
  y: number
  zIndex: number
  width: number
  height: number
}
export type BuilderUploadedFileSummary = {
  name: string
  size: number
  type: string
  extension: string
}
