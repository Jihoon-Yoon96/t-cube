/**
 * 레이아웃 작성 기반 HTML 생성 store action 모음
 * 레이아웃 블록 변환 결과의 편집기 반영 및 단계 전환 흐름 관리
 */
import { createLayoutDesignHtml } from '~/services/builder/layoutDesignToHtml'
import { parseHtmlDocument } from '~/services/html/parseHtmlDocument'
import type { useBuilderDesignState } from '../design'
import type { useBuilderEditorState } from '../editor'
import type { useBuilderStepState } from '../step'
import type { useBuilderUploadState } from '../upload'

type BuilderDesignState = ReturnType<typeof useBuilderDesignState>
type BuilderUploadState = ReturnType<typeof useBuilderUploadState>
type BuilderEditorState = ReturnType<typeof useBuilderEditorState>
type BuilderStepState = ReturnType<typeof useBuilderStepState>

type BuilderLayoutDesignActionParams = {
  designState: BuilderDesignState
  uploadState: BuilderUploadState
  editorState: BuilderEditorState
  stepState: BuilderStepState
}

/**
 * 레이아웃 작성 기반 HTML 생성 액션 구성
 * 캔버스 블록을 HTML 문서로 변환한 뒤 편집기 상태로 반영
 *
 * @param params 레이아웃 HTML 생성 액션에서 공유할 디자인/업로드/편집기/단계 상태
 * @returns 레이아웃 기반 HTML 생성 액션
 */
export function useBuilderLayoutDesignActions(params: BuilderLayoutDesignActionParams) {
  const { designState, uploadState, editorState, stepState } = params

  /**
   * 레이아웃 블록 기반 HTML 생성
   * 생성된 HTML 파싱 및 HTML 편집 화면 전환
   */
  function generateHtmlFromLayoutDesign() {
    if (!designState.layoutBlocks.value.length) {
      uploadState.failFileAnalysis('HTML을 생성하려면 먼저 캔버스에 레이아웃 블록을 추가해주세요.')
      return
    }

    const html = createLayoutDesignHtml(designState.layoutBlocks.value)
    const parsedDocument = parseHtmlDocument(html, {
      sourceName: 'layout-design.html'
    })

    editorState.setCurrentDocument(parsedDocument)
    editorState.markDirty(false)
    uploadState.completeFileAnalysis()
    stepState.setStep('html-editor')
  }

  return {
    generateHtmlFromLayoutDesign
  }
}
