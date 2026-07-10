/**
 * 빌더 전역 상태 Pinia store
 * 화면, 업로드, HTML 편집 상태처럼 여러 화면에서 공유하는 상태만 관리
 */
import { useBuilderEditorState } from './builder/editor'
import { useBuilderViewState } from './builder/view'
import { useBuilderUploadState } from './builder/upload'

export type {
  BuilderDesignMethod,
  BuilderLayoutBlock,
  BuilderLayoutBlockType,
  BuilderView,
  BuilderUploadedFileSummary,
  BuilderUploadFileType,
  BuilderViewportMode
} from './builder/type/types'
export type {
  ParsedHtmlDocument,
  ParsedHtmlEditableElement,
  ParsedHtmlElementType,
  ParsedHtmlLayoutNode,
  ParsedHtmlMediaSource
} from '~/services/html/parseHtmlDocument'

/**
 * 빌더 Pinia store 구성
 * 화면, 업로드, 편집 상태 모듈 조립
 *
 * @returns 빌더 전역 상태와 상태 변경 API
 */
export const useBuilderStore = defineStore('builder', () => {
  const viewState = useBuilderViewState()
  const uploadState = useBuilderUploadState(viewState.currentView)
  const editorState = useBuilderEditorState()

  return {
    ...viewState,
    ...uploadState,
    ...editorState
  }
})
