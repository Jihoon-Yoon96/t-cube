/**
 * 이미지/PDF 디자인 시안의 HTML 변환 composable
 * API 호출, 요청 취소, 변환 결과의 편집기 반영 흐름 관리
 */
import { parseHtmlDocument } from '~/services/html/parseHtmlDocument'
import { useBuilderStore } from '~/stores/builder'
import type { DesignToHtmlResponse } from '~/types/builder/design-to-html'
import type { ShallowRef } from 'vue'

type DesignToHtmlNuxtApp = ReturnType<typeof useNuxtApp> & {
  _tcubeDesignHtmlGenerationAbortController?: ShallowRef<AbortController | null>
}

/**
 * 이미지/PDF 디자인 시안의 HTML 변환 흐름 구성
 * API 호출, 취소, 응답 파싱, HTML 편집 화면 전환 흐름 관리
 *
 * @returns 이미지/PDF HTML 변환 및 취소 API
 */
export function useDesignToHtml() {
  const builderStore = useBuilderStore()
  const nuxtApp = useNuxtApp() as DesignToHtmlNuxtApp

  if (!nuxtApp._tcubeDesignHtmlGenerationAbortController) {
    nuxtApp._tcubeDesignHtmlGenerationAbortController = shallowRef<AbortController | null>(null)
  }

  const designHtmlGenerationAbortController = nuxtApp._tcubeDesignHtmlGenerationAbortController

  /**
   * 업로드된 이미지 파일을 기반으로 HTML 생성 요청
   * 변환 성공 시 HTML 편집 화면으로 전환
   *
   * @returns 이미지 HTML 생성 처리 완료 Promise
   */
  async function generateHtmlFromUploadedImage() {
    if (!builderStore.uploadedFile) {
      builderStore.failFileAnalysis('HTML을 생성하려면 먼저 이미지 파일을 업로드해주세요.')
      return
    }

    cancelDesignHtmlGeneration()
    builderStore.startFileAnalysis()

    const abortController = new AbortController()
    designHtmlGenerationAbortController.value = abortController

    try {
      const formData = new FormData()
      formData.append('image', builderStore.uploadedFile)

      const response = await $fetch<DesignToHtmlResponse>('/api/builder/image-to-html', {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      })

      completeDesignHtmlGeneration(response)
    } catch (error) {
      if (isAbortError(error)) {
        builderStore.cancelFileAnalysis()
        return
      }

      const message = error instanceof Error
        ? error.message
        : '이미지 기반 HTML을 생성하는 중 문제가 발생했습니다.'

      builderStore.failFileAnalysis(message)
    } finally {
      if (designHtmlGenerationAbortController.value === abortController) {
        designHtmlGenerationAbortController.value = null
      }
    }
  }

  /**
   * 업로드된 PDF 파일을 기반으로 HTML 생성 요청
   * 변환 성공 시 HTML 편집 화면으로 전환
   *
   * @returns PDF HTML 생성 처리 완료 Promise
   */
  async function generateHtmlFromUploadedPdf() {
    if (!builderStore.uploadedFile) {
      builderStore.failFileAnalysis('HTML을 생성하려면 먼저 PDF 파일을 업로드해주세요.')
      return
    }

    cancelDesignHtmlGeneration()
    builderStore.startFileAnalysis()

    const abortController = new AbortController()
    designHtmlGenerationAbortController.value = abortController

    try {
      const formData = new FormData()
      formData.append('pdf', builderStore.uploadedFile)

      const response = await $fetch<DesignToHtmlResponse>('/api/builder/pdf-to-html', {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      })

      completeDesignHtmlGeneration(response)
    } catch (error) {
      if (isAbortError(error)) {
        builderStore.cancelFileAnalysis()
        return
      }

      const message = error instanceof Error
        ? error.message
        : 'PDF 기반 HTML을 생성하는 중 문제가 발생했습니다.'

      builderStore.failFileAnalysis(message)
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
      sourceName: response.title || `${builderStore.uploadedFile?.name || 'generated'}.html`
    })

    builderStore.setCurrentDocument(parsedDocument)
    builderStore.markDirty(false)
    builderStore.completeFileAnalysis()
    builderStore.setView('html-editor')
  }

  /**
   * 진행 중인 디자인 시안 HTML 생성 요청 취소
   * AbortController 정리 및 업로드 분석 상태 취소 처리
   */
  function cancelDesignHtmlGeneration() {
    if (!designHtmlGenerationAbortController.value) return

    designHtmlGenerationAbortController.value.abort()
    designHtmlGenerationAbortController.value = null
    builderStore.cancelFileAnalysis()
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
