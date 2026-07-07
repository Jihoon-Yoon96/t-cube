/**
 * 빌더 전체 Pinia store를 조립하는 진입점
 * 상태 모듈과 composable 흐름을 합쳐 외부 컴포넌트에는 단일 store API를 제공
 */
import { useBuilderFileAnalysis } from '~/composables/file/useBuilderFileAnalysis'
import { useBuilderDesignToHtml } from '~/composables/html/useBuilderDesignToHtml'
import { useBuilderLayoutDesign } from '~/composables/layout/useBuilderLayoutDesign'
import { useBuilderNavigationGuard } from '~/composables/navigation/useBuilderNavigationGuard'
import { useBuilderDesignState } from './builder/design'
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
  ParsedHtmlElementType
} from '~/services/html/parseHtmlDocument'

/**
 * 빌더 Pinia store 구성
 * 도메인 상태와 composable 흐름을 단일 store API로 조립
 *
 * @returns 빌더 화면에서 사용하는 상태와 기능 API
 */
export const useBuilderStore = defineStore('builder', () => {
  const viewState = useBuilderViewState()
  const uploadState = useBuilderUploadState(viewState.currentView)
  const designState = useBuilderDesignState(viewState.currentView)
  const editorState = useBuilderEditorState()
  const designToHtmlFlow = useBuilderDesignToHtml({
    uploadState,
    editorState,
    viewState
  })
  const fileAnalysisFlow = useBuilderFileAnalysis({
    uploadState,
    editorState,
    viewState
  })
  const layoutDesignFlow = useBuilderLayoutDesign({
    designState,
    uploadState,
    editorState,
    viewState
  })
  const navigationGuardFlow = useBuilderNavigationGuard({
    uploadState,
    designState,
    viewState,
    cancelDesignHtmlGeneration: designToHtmlFlow.cancelDesignHtmlGeneration
  })

  return {
    ...viewState,
    ...uploadState,
    ...designState,
    ...editorState,
    setView: navigationGuardFlow.setView,
    selectUploadFileType: navigationGuardFlow.selectUploadFileType,
    selectDesignMethod: navigationGuardFlow.selectDesignMethod,
    startFileAnalysis: fileAnalysisFlow.startFileAnalysis,
    generateHtmlFromUploadedImage: designToHtmlFlow.generateHtmlFromUploadedImage,
    generateHtmlFromUploadedPdf: designToHtmlFlow.generateHtmlFromUploadedPdf,
    generateHtmlFromLayoutDesign: layoutDesignFlow.generateHtmlFromLayoutDesign,
    cancelImageHtmlGeneration: designToHtmlFlow.cancelImageHtmlGeneration,
    cancelPdfHtmlGeneration: designToHtmlFlow.cancelPdfHtmlGeneration
  }
})

