/**
 * 업로드 파일 분석 composable
 * 파일 유형별 preview 전환 및 HTML 파일 파싱 결과의 편집기 반영 흐름 관리
 */
import { parseHtmlFile } from '~/services/html/parseHtmlDocument'
import { useBuilderStore } from '~/stores/builder'

/**
 * 업로드 파일 분석 흐름 구성
 * HTML은 즉시 파싱하고, 이미지/PDF는 확인 화면으로 전환
 *
 * @returns 업로드 파일 분석 API
 */
export function useFileAnalysis() {
  const builderStore = useBuilderStore()

  /**
   * 업로드 파일 분석 시작
   * 선택된 파일 유형에 따라 HTML 편집기 또는 preview 화면으로 전환
   *
   * @returns 파일 분석 처리 완료 Promise
   */
  async function startFileAnalysis() {
    if (!builderStore.startFileAnalysis()) return

    if (!builderStore.uploadedFile) return

    if (builderStore.selectedUploadFileType === '이미지') {
      builderStore.completeFileAnalysis()
      builderStore.setView('image-preview')
      return
    }

    if (builderStore.selectedUploadFileType === 'PDF') {
      builderStore.completeFileAnalysis()
      builderStore.setView('pdf-preview')
      return
    }

    if (builderStore.selectedUploadFileType !== 'HTML') {
      builderStore.failFileAnalysis('현재 편집 기능은 HTML 파일부터 지원합니다. 이미지/PDF 분석은 다음 단계에서 연결할 예정입니다.')
      return
    }

    try {
      const parsedDocument = await parseHtmlFile(builderStore.uploadedFile)

      builderStore.setCurrentDocument(parsedDocument)
      builderStore.markDirty(false)
      builderStore.completeFileAnalysis()
      builderStore.setView('html-editor')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'HTML 파일을 분석하는 중 문제가 발생했습니다.'

      builderStore.failFileAnalysis(message)
    }
  }

  return {
    startFileAnalysis
  }
}
