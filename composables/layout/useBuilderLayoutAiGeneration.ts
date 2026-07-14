import { downloadGeneratedDesignImage, downloadGeneratedDesignPdf } from '~/services/browser/downloadGeneratedDesign'
import { parseHtmlDocument } from '~/services/html/parseHtmlDocument'
import { useBuilderStore } from '~/stores/builder'
import type { BuilderLayoutBlock } from '~/stores/builder/type/types'
import type { DesignToHtmlResponse } from '~/types/builder/design-to-html'
import type { BuilderLayoutDesignBrief, BuilderLayoutGenerateType } from '~/types/builder/layout-design'

/**
 * 레이아웃 정보 기반 AI 결과 생성 및 유형별 후처리 구성
 *
 * @returns 생성 상태와 HTML/PNG/PDF 생성 API
 */
export function useBuilderLayoutAiGeneration() {
  const builderStore = useBuilderStore()
  const isGenerating = ref(false)
  const generationError = ref('')
  let generationAbortController: AbortController | null = null

  /**
   * 입력 정보와 레이아웃을 서버 AI 생성 API로 전달 후 결과 유형별 처리
   *
   * @param brief 1단계 디자인 정보
   * @param blocks 2단계 레이아웃 블록
   * @param outputType 선택 결과 유형
   * @returns 생성 및 후처리 완료 Promise
   */
  async function generateLayoutDesign(
    brief: BuilderLayoutDesignBrief,
    blocks: BuilderLayoutBlock[],
    outputType: BuilderLayoutGenerateType
  ) {
    if (isGenerating.value) return

    isGenerating.value = true
    generationError.value = ''
    const abortController = new AbortController()

    generationAbortController = abortController

    try {
      const formData = new FormData()

      formData.append('brief', JSON.stringify({
        category: brief.category,
        purpose: brief.purpose,
        viewport: brief.viewport
      }))
      formData.append('blocks', JSON.stringify(blocks))
      formData.append('outputType', outputType)
      if (brief.planningFile) formData.append('planningFile', brief.planningFile)

      const response = await $fetch<DesignToHtmlResponse>('/api/builder/layout-design-generate', {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      })

      if (outputType === 'html') {
        applyGeneratedHtmlToEditor(response)
        return
      }

      if (outputType === 'image') {
        await downloadGeneratedDesignImage(response.html, response.title, brief.viewport)
        return
      }

      await downloadGeneratedDesignPdf(response.html, response.title, brief.viewport)
    } catch (error) {
      if (abortController.signal.aborted) return

      generationError.value = getGenerationErrorMessage(error)
    } finally {
      if (generationAbortController === abortController) {
        generationAbortController = null
        isGenerating.value = false
      }
    }
  }

  /** 진행 중인 AI 디자인 생성 요청 취소 */
  function cancelLayoutDesignGeneration() {
    if (!generationAbortController) return

    const abortController = generationAbortController

    generationAbortController = null
    generationError.value = ''
    isGenerating.value = false
    abortController.abort()
  }

  /**
   * 생성 HTML 파싱 후 편집기 상태 반영 및 화면 이동
   *
   * @param response AI HTML 생성 응답
   */
  function applyGeneratedHtmlToEditor(response: DesignToHtmlResponse) {
    const parsedDocument = parseHtmlDocument(response.html, {
      sourceName: `${response.title || 'generated-layout'}.html`
    })

    builderStore.setCurrentDocument(parsedDocument)
    builderStore.markDirty(false)
    builderStore.completeFileAnalysis()
    builderStore.setView('html-editor')
  }

  /**
   * 생성 요청 오류에서 사용자 표시 메시지 추출
   *
   * @param error 생성 요청 오류
   * @returns 사용자 표시 오류 메시지
   */
  function getGenerationErrorMessage(error: unknown) {
    if (!error || typeof error !== 'object') return '디자인 시안 생성에 실패했습니다.'

    const data = (error as { data?: { statusMessage?: unknown, message?: unknown } }).data

    if (typeof data?.statusMessage === 'string') return data.statusMessage
    if (typeof data?.message === 'string') return data.message

    return '디자인 시안 생성에 실패했습니다. 잠시 후 다시 시도해주세요.'
  }

  return {
    isGenerating: readonly(isGenerating),
    generationError: readonly(generationError),
    generateLayoutDesign,
    cancelLayoutDesignGeneration
  }
}
