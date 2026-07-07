/**
 * 업로드 파일 분석 store action 모음
 * 파일 유형별 preview 전환 및 HTML 파일 파싱 결과의 편집기 반영 흐름 관리
 */
import { parseHtmlFile } from '~/services/html/parseHtmlDocument'
import type { useBuilderEditorState } from '../editor'
import type { useBuilderStepState } from '../step'
import type { useBuilderUploadState } from '../upload'

type BuilderUploadState = ReturnType<typeof useBuilderUploadState>
type BuilderEditorState = ReturnType<typeof useBuilderEditorState>
type BuilderStepState = ReturnType<typeof useBuilderStepState>

type BuilderFileAnalysisActionParams = {
  uploadState: BuilderUploadState
  editorState: BuilderEditorState
  stepState: BuilderStepState
}

/**
 * 업로드 파일 분석 액션 구성
 * HTML은 즉시 파싱하고, 이미지/PDF는 확인 화면으로 전환
 *
 * @param params 파일 분석 액션에서 공유할 업로드/편집기/단계 상태
 * @returns 업로드 파일 분석 액션
 */
export function useBuilderFileAnalysisActions(params: BuilderFileAnalysisActionParams) {
  const { uploadState, editorState, stepState } = params

  /**
   * 업로드 파일 분석 시작
   * 선택된 파일 유형에 따라 HTML 편집기 또는 preview 화면으로 전환
   */
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

  return {
    startFileAnalysis
  }
}
