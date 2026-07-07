/**
 * 업로드 파일 분석 composable
 * 파일 유형별 preview 전환 및 HTML 파일 파싱 결과의 편집기 반영 흐름 관리
 */
import { parseHtmlFile } from '~/services/html/parseHtmlDocument'
import type { useBuilderEditorState } from '~/stores/builder/editor'
import type { useBuilderViewState } from '~/stores/builder/view'
import type { useBuilderUploadState } from '~/stores/builder/upload'

type BuilderUploadState = ReturnType<typeof useBuilderUploadState>
type BuilderEditorState = ReturnType<typeof useBuilderEditorState>
type BuilderViewState = ReturnType<typeof useBuilderViewState>

type BuilderFileAnalysisParams = {
  uploadState: BuilderUploadState
  editorState: BuilderEditorState
  viewState: BuilderViewState
}

/**
 * 업로드 파일 분석 흐름 구성
 * HTML은 즉시 파싱하고, 이미지/PDF는 확인 화면으로 전환
 *
 * @param params 파일 분석 흐름에서 공유할 업로드/편집기/화면 상태
 * @returns 업로드 파일 분석 API
 */
export function useBuilderFileAnalysis(params: BuilderFileAnalysisParams) {
  const { uploadState, editorState, viewState } = params

  /**
   * 업로드 파일 분석 시작
   * 선택된 파일 유형에 따라 HTML 편집기 또는 preview 화면으로 전환
   *
   * @returns 파일 분석 처리 완료 Promise
   */
  async function startFileAnalysis() {
    if (!uploadState.startFileAnalysis()) return

    if (!uploadState.uploadedFile.value) return

    if (uploadState.selectedUploadFileType.value === '이미지') {
      uploadState.completeFileAnalysis()
      viewState.setView('image-preview')
      return
    }

    if (uploadState.selectedUploadFileType.value === 'PDF') {
      uploadState.completeFileAnalysis()
      viewState.setView('pdf-preview')
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
      viewState.setView('html-editor')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'HTML 파일을 분석하는 중 문제가 발생했습니다.'

      uploadState.failFileAnalysis(message)
    }
  }

  return {
    startFileAnalysis
  }
}
