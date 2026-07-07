/**
 * 레이아웃 작성 기반 HTML 생성 composable
 * 레이아웃 블록 변환 결과의 편집기 반영 및 화면 전환 흐름 관리
 */
import { createLayoutDesignHtml } from '~/services/builder/layoutDesignToHtml'
import { parseHtmlDocument } from '~/services/html/parseHtmlDocument'
import type { useBuilderLayoutCanvas } from '~/composables/layout/useBuilderLayoutCanvas'
import type { useBuilderEditorState } from '~/stores/builder/editor'
import type { useBuilderViewState } from '~/stores/builder/view'
import type { useBuilderUploadState } from '~/stores/builder/upload'

type BuilderLayoutCanvasState = ReturnType<typeof useBuilderLayoutCanvas>
type BuilderUploadState = ReturnType<typeof useBuilderUploadState>
type BuilderEditorState = ReturnType<typeof useBuilderEditorState>
type BuilderViewState = ReturnType<typeof useBuilderViewState>

type BuilderLayoutDesignParams = {
  layoutCanvas: BuilderLayoutCanvasState
  uploadState: BuilderUploadState
  editorState: BuilderEditorState
  viewState: BuilderViewState
}

/**
 * 레이아웃 작성 기반 HTML 생성 흐름 구성
 * 캔버스 블록을 HTML 문서로 변환한 뒤 편집기 상태로 반영
 *
 * @param params 레이아웃 HTML 생성 흐름에서 공유할 디자인/업로드/편집기/화면 상태
 * @returns 레이아웃 기반 HTML 생성 API
 */
export function useBuilderLayoutDesign(params: BuilderLayoutDesignParams) {
  const { layoutCanvas, uploadState, editorState, viewState } = params

  /**
   * 레이아웃 블록 기반 HTML 생성
   * 생성된 HTML 파싱 및 HTML 편집 화면 전환
   */
  function generateHtmlFromLayoutDesign() {
    if (!layoutCanvas.layoutBlocks.value.length) {
      uploadState.failFileAnalysis('HTML을 생성하려면 먼저 캔버스에 레이아웃 블록을 추가해주세요.')
      return
    }

    const html = createLayoutDesignHtml(layoutCanvas.layoutBlocks.value)
    const parsedDocument = parseHtmlDocument(html, {
      sourceName: 'layout-design.html'
    })

    editorState.setCurrentDocument(parsedDocument)
    editorState.markDirty(false)
    uploadState.completeFileAnalysis()
    viewState.setView('html-editor')
  }

  return {
    generateHtmlFromLayoutDesign
  }
}

