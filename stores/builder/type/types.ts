/**
 * 빌더 store와 관련 모듈에서 공유하는 타입을 정의
 */


export type BuilderStep =
  | 'start'
  | 'html-upload'
  | 'pdf-image-upload'
  | 'file-upload'
  | 'image-preview'
  | 'pdf-preview'
  | 'ai-design'
  | 'html-editor'
  | 'editor'
  | 'preview'

export type BuilderViewportMode = 'desktop' | 'tablet' | 'mobile'
export type BuilderUploadFileType = 'HTML' | '이미지' | 'PDF'
export type BuilderDesignMethod = 'layout' | 'ai-prompt'
export type BuilderUploadedFileSummary = {
  name: string
  size: number
  type: string
  extension: string
}
