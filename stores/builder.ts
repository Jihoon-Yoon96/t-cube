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
import { useBuilderStepState } from './builder/step'
import { useBuilderUploadState } from './builder/upload'

export type {
  BuilderDesignMethod,
  BuilderLayoutBlock,
  BuilderLayoutBlockType,
  BuilderStep,
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
  const stepState = useBuilderStepState()
  const uploadState = useBuilderUploadState(stepState.step)
  const designState = useBuilderDesignState(stepState.step)
  const editorState = useBuilderEditorState()
  const designToHtmlActions = useBuilderDesignToHtmlActions({
    uploadState,
    editorState,
    stepState
  })
  const fileAnalysisActions = useBuilderFileAnalysisActions({
    uploadState,
    editorState,
    stepState
  })
  const layoutDesignActions = useBuilderLayoutDesignActions({
    designState,
    uploadState,
    editorState,
    stepState
  })
  const navigationGuardActions = useBuilderNavigationGuardActions({
    uploadState,
    designState,
    stepState,
    cancelDesignHtmlGeneration: designToHtmlActions.cancelDesignHtmlGeneration
  })

  return {
    ...stepState,
    ...uploadState,
    ...designState,
    ...editorState,
    setStep: navigationGuardActions.setStep,
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
