/**
 * 이미지/PDF 디자인 시안의 HTML 변환 store action 모음
 * API 호출, 요청 취소, 변환 결과의 편집기 반영 흐름 관리
 */
import { parseHtmlDocument } from '~/services/html/parseHtmlDocument'
import type { useBuilderEditorState } from '../editor'
import type { useBuilderViewState } from '../view'
import type { useBuilderUploadState } from '../upload'
import type { DesignToHtmlResponse } from '~/types/builder/design-to-html'

type BuilderUploadState = ReturnType<typeof useBuilderUploadState>
type BuilderEditorState = ReturnType<typeof useBuilderEditorState>
type BuilderViewState = ReturnType<typeof useBuilderViewState>

type BuilderDesignToHtmlActionParams = {
  uploadState: BuilderUploadState
  editorState: BuilderEditorState
  viewState: BuilderViewState
}

/**
 * 이미지/PDF 디자인 시안의 HTML 변환 액션 구성
 * API 호출, 취소, 응답 파싱, HTML 편집 화면 전환 흐름 관리
 *
 * @param params 변환 액션에서 공유할 업로드/편집기/화면 상태
 * @returns 이미지/PDF HTML 변환 및 취소 액션
 */
export function useBuilderDesignToHtmlActions(params: BuilderDesignToHtmlActionParams) {
  const { uploadState, editorState, viewState } = params
  const designHtmlGenerationAbortController = shallowRef<AbortController | null>(null)

  /**
   * 업로드된 이미지 파일을 기반으로 HTML 생성 요청
   * 변환 성공 시 HTML 편집 화면으로 전환
   */
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

  /**
   * 업로드된 PDF 파일을 기반으로 HTML 생성 요청
   * 변환 성공 시 HTML 편집 화면으로 전환
   */
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

  /**
   * 디자인 시안 HTML 생성 완료 처리
   * 응답 HTML 파싱 및 편집기 상태 초기화
   *
   * @param response 디자인 시안 HTML 생성 API 응답
   */
  function completeDesignHtmlGeneration(response: DesignToHtmlResponse) {
    const parsedDocument = parseHtmlDocument(response.html, {
      sourceName: response.title || `${uploadState.uploadedFile.value?.name || 'generated'}.html`
    })

    editorState.setCurrentDocument(parsedDocument)
    editorState.markDirty(false)
    uploadState.completeFileAnalysis()
    viewState.setView('html-editor')
  }

  /**
   * 진행 중인 디자인 시안 HTML 생성 요청 취소
   * AbortController 정리 및 업로드 분석 상태 취소 처리
   */
  function cancelDesignHtmlGeneration() {
    if (!designHtmlGenerationAbortController.value) return

    designHtmlGenerationAbortController.value.abort()
    designHtmlGenerationAbortController.value = null
    uploadState.cancelFileAnalysis()
  }

  /**
   * 이미지 기반 HTML 생성 요청 취소
   */
  function cancelImageHtmlGeneration() {
    cancelDesignHtmlGeneration()
  }

  /**
   * PDF 기반 HTML 생성 요청 취소
   */
  function cancelPdfHtmlGeneration() {
    cancelDesignHtmlGeneration()
  }

  /**
   * 요청 취소로 발생한 에러인지 확인
   *
   * @param error 확인할 에러 객체
   * @returns 요청 취소 에러이면 true
   */
  function isAbortError(error: unknown) {
    if (!error || typeof error !== 'object') return false

    const name = (error as { name?: unknown }).name
    const message = (error as { message?: unknown }).message

    return name === 'AbortError' || message === 'This operation was aborted'
  }

  return {
    generateHtmlFromUploadedImage,
    generateHtmlFromUploadedPdf,
    cancelDesignHtmlGeneration,
    cancelImageHtmlGeneration,
    cancelPdfHtmlGeneration
  }
}

