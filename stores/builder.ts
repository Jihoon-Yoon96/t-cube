/**
 * 빌더 전체 Pinia store를 조립하는 진입점입니다.
 * 각 도메인별 상태 모듈을 합쳐 외부 컴포넌트에는 단일 store API를 제공합니다.
 */
import { useBuilderDesignState } from './builder/design'
import { useBuilderEditorState } from './builder/editor'
import { useBuilderStepState } from './builder/step'
import { useBuilderUploadState } from './builder/upload'
import { parseHtmlDocument, parseHtmlFile } from '~/services/html/parseHtmlDocument'
import type { ImageToHtmlResponse } from '~/types/builder/image-to-html'

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

    uploadState.startFileAnalysis()

    try {
      const formData = new FormData()
      formData.append('image', uploadState.uploadedFile.value)

      const response = await $fetch<ImageToHtmlResponse>('/api/builder/image-to-html', {
        method: 'POST',
        body: formData
      })

      const parsedDocument = parseHtmlDocument(response.html, {
        sourceName: response.title || `${uploadState.uploadedFile.value.name}.html`
      })

      editorState.setCurrentDocument(parsedDocument)
      editorState.markDirty(false)
      uploadState.completeFileAnalysis()
      stepState.setStep('html-editor')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : '이미지 기반 HTML을 생성하는 중 문제가 발생했습니다.'

      uploadState.failFileAnalysis(message)
    }
  }

  return {
    ...stepState,
    ...uploadState,
    ...designState,
    ...editorState,
    startFileAnalysis,
    generateHtmlFromUploadedImage
  }
})
