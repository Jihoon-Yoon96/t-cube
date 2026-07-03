/**
 * 빌더 전체 Pinia store를 조립하는 진입점입니다.
 * 각 도메인별 상태 모듈을 합쳐 외부 컴포넌트에는 단일 store API를 제공합니다.
 */
import { useBuilderDesignState } from './builder/design'
import { useBuilderEditorState } from './builder/editor'
import { useBuilderStepState } from './builder/step'
import { useBuilderUploadState } from './builder/upload'
import { parseHtmlDocument, parseHtmlFile } from '~/services/html/parseHtmlDocument'
import type { BuilderDesignMethod, BuilderStep, BuilderUploadFileType } from './builder/type/types'
import type { DesignToHtmlResponse } from '~/types/builder/design-to-html'

export type {
  BuilderDesignMethod,
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
  const designHtmlGenerationAbortController = shallowRef<AbortController | null>(null)

  async function startFileAnalysis() {
    if (!uploadState.startFileAnalysis()) return

    if (!uploadState.uploadedFile.value) return

    if (uploadState.selectedUploadFileType.value === '이미지') {
      uploadState.completeFileAnalysis()
      stepState.setStep('image-preview')
      return
    }

    if (uploadState.selectedUploadFileType.value === 'PDF') {
      uploadState.completeFileAnalysis()
      stepState.setStep('pdf-preview')
      return
    }

    if (uploadState.selectedUploadFileType.value !== 'HTML') {
      uploadState.failFileAnalysis('현재 편집 기능은 HTML 파일부터 지원합니다. 이미지/PDF 분석은 다음 단계에서 연결할 예정입니다.')
      return
    }

    try {
      const parsedDocument = await parseHtmlFile(uploadState.uploadedFile.value)

      editorState.setCurrentDocument(parsedDocument)
      editorState.markDirty(false)
      uploadState.completeFileAnalysis()
      stepState.setStep('html-editor')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'HTML 파일을 분석하는 중 문제가 발생했습니다.'

      uploadState.failFileAnalysis(message)
    }
  }

  async function generateHtmlFromUploadedImage() {
    if (!uploadState.uploadedFile.value) {
      uploadState.failFileAnalysis('HTML을 생성하려면 먼저 이미지 파일을 업로드해주세요.')
      return
    }

    cancelDesignHtmlGeneration()
    uploadState.startFileAnalysis()

    const abortController = new AbortController()
    designHtmlGenerationAbortController.value = abortController

    try {
      const formData = new FormData()
      formData.append('image', uploadState.uploadedFile.value)

      const response = await $fetch<DesignToHtmlResponse>('/api/builder/image-to-html', {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      })

      completeDesignHtmlGeneration(response)
    } catch (error) {
      if (isAbortError(error)) {
        uploadState.cancelFileAnalysis()
        return
      }

      const message = error instanceof Error
        ? error.message
        : '이미지 기반 HTML을 생성하는 중 문제가 발생했습니다.'

      uploadState.failFileAnalysis(message)
    } finally {
      if (designHtmlGenerationAbortController.value === abortController) {
        designHtmlGenerationAbortController.value = null
      }
    }
  }

  async function generateHtmlFromUploadedPdf() {
    if (!uploadState.uploadedFile.value) {
      uploadState.failFileAnalysis('HTML을 생성하려면 먼저 PDF 파일을 업로드해주세요.')
      return
    }

    cancelDesignHtmlGeneration()
    uploadState.startFileAnalysis()

    const abortController = new AbortController()
    designHtmlGenerationAbortController.value = abortController

    try {
      const formData = new FormData()
      formData.append('pdf', uploadState.uploadedFile.value)

      const response = await $fetch<DesignToHtmlResponse>('/api/builder/pdf-to-html', {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      })

      completeDesignHtmlGeneration(response)
    } catch (error) {
      if (isAbortError(error)) {
        uploadState.cancelFileAnalysis()
        return
      }

      const message = error instanceof Error
        ? error.message
        : 'PDF 기반 HTML을 생성하는 중 문제가 발생했습니다.'

      uploadState.failFileAnalysis(message)
    } finally {
      if (designHtmlGenerationAbortController.value === abortController) {
        designHtmlGenerationAbortController.value = null
      }
    }
  }

  function completeDesignHtmlGeneration(response: DesignToHtmlResponse) {
    const parsedDocument = parseHtmlDocument(response.html, {
      sourceName: response.title || `${uploadState.uploadedFile.value?.name || 'generated'}.html`
    })

    editorState.setCurrentDocument(parsedDocument)
    editorState.markDirty(false)
    uploadState.completeFileAnalysis()
    stepState.setStep('html-editor')
  }

  function cancelDesignHtmlGeneration() {
    if (!designHtmlGenerationAbortController.value) return

    designHtmlGenerationAbortController.value.abort()
    designHtmlGenerationAbortController.value = null
    uploadState.cancelFileAnalysis()
  }

  function cancelImageHtmlGeneration() {
    cancelDesignHtmlGeneration()
  }

  function cancelPdfHtmlGeneration() {
    cancelDesignHtmlGeneration()
  }

  function setStep(nextStep: BuilderStep) {
    if (nextStep === stepState.step.value) return true
    if (!confirmImageHtmlGenerationLeave()) return false

    stepState.setStep(nextStep)
    return true
  }

  function selectUploadFileType(fileType: BuilderUploadFileType) {
    if (!confirmImageHtmlGenerationLeave()) return false

    uploadState.selectUploadFileType(fileType)
    return true
  }

  function selectDesignMethod(method: BuilderDesignMethod) {
    if (!confirmImageHtmlGenerationLeave()) return false

    designState.selectDesignMethod(method)
    return true
  }

  function confirmImageHtmlGenerationLeave() {
    if (uploadState.importStatus.value !== 'importing') return true
    if (import.meta.server) return true

    const confirmed = window.confirm('AI가 HTML을 생성 중입니다. 정말 나가시겠습니까?')

    if (confirmed) {
      cancelDesignHtmlGeneration()
    }

    return confirmed
  }

  function isAbortError(error: unknown) {
    if (!error || typeof error !== 'object') return false

    const name = (error as { name?: unknown }).name
    const message = (error as { message?: unknown }).message

    return name === 'AbortError' || message === 'This operation was aborted'
  }

  return {
    ...stepState,
    ...uploadState,
    ...designState,
    ...editorState,
    setStep,
    selectUploadFileType,
    selectDesignMethod,
    startFileAnalysis,
    generateHtmlFromUploadedImage,
    generateHtmlFromUploadedPdf,
    cancelImageHtmlGeneration,
    cancelPdfHtmlGeneration
  }
})
