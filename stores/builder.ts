/**
 * 빌더 전체 Pinia store를 조립하는 진입점
 * 각 도메인별 상태 모듈을 합쳐 외부 컴포넌트에는 단일 store API를 제공
 */
import { useBuilderDesignToHtmlActions } from './builder/actions/designToHtml'
import { useBuilderFileAnalysisActions } from './builder/actions/fileAnalysis'
import { useBuilderLayoutDesignActions } from './builder/actions/layoutDesign'
import { useBuilderNavigationGuardActions } from './builder/actions/navigationGuard'
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

export const useBuilderStore = defineStore('builder', () => {
  const viewState = useBuilderViewState()
  const uploadState = useBuilderUploadState(viewState.currentView)
  const designState = useBuilderDesignState(viewState.currentView)
  const editorState = useBuilderEditorState()
  const designToHtmlActions = useBuilderDesignToHtmlActions({
    uploadState,
    editorState,
    viewState
  })
  const fileAnalysisActions = useBuilderFileAnalysisActions({
    uploadState,
    editorState,
    viewState
  })
  const layoutDesignActions = useBuilderLayoutDesignActions({
    designState,
    uploadState,
    editorState,
    viewState
  })
  const navigationGuardActions = useBuilderNavigationGuardActions({
    uploadState,
    designState,
    viewState,
    cancelDesignHtmlGeneration: designToHtmlActions.cancelDesignHtmlGeneration
  })

  return {
    ...viewState,
    ...uploadState,
    ...designState,
    ...editorState,
    setView: navigationGuardActions.setView,
    selectUploadFileType: navigationGuardActions.selectUploadFileType,
    selectDesignMethod: navigationGuardActions.selectDesignMethod,
    startFileAnalysis: fileAnalysisActions.startFileAnalysis,
    generateHtmlFromUploadedImage: designToHtmlActions.generateHtmlFromUploadedImage,
    generateHtmlFromUploadedPdf: designToHtmlActions.generateHtmlFromUploadedPdf,
    generateHtmlFromLayoutDesign: layoutDesignActions.generateHtmlFromLayoutDesign,
    cancelImageHtmlGeneration: designToHtmlActions.cancelImageHtmlGeneration,
    cancelPdfHtmlGeneration: designToHtmlActions.cancelPdfHtmlGeneration
  }
})

