/**
 * 빌더 화면 이동 guard store action 모음
 * HTML 생성 중 화면 이탈 확인 및 이동 승인 흐름 관리
 */
import type { useBuilderDesignState } from '../design'
import type { useBuilderViewState } from '../view'
import type { useBuilderUploadState } from '../upload'
import type { BuilderDesignMethod, BuilderView, BuilderUploadFileType } from '../type/types'

type BuilderUploadState = ReturnType<typeof useBuilderUploadState>
type BuilderDesignState = ReturnType<typeof useBuilderDesignState>
type BuilderViewState = ReturnType<typeof useBuilderViewState>

type BuilderNavigationGuardActionParams = {
  uploadState: BuilderUploadState
  designState: BuilderDesignState
  viewState: BuilderViewState
  cancelDesignHtmlGeneration: () => void
}

/**
 * 빌더 이동 guard 액션 구성
 * 생성 중인 AI 요청이 있으면 사용자 확인 후 상태 변경
 *
 * @param params 이동 guard에서 공유할 업로드/디자인/화면 상태와 취소 함수
 * @returns 화면/업로드 유형/디자인 방식 선택 액션
 */
export function useBuilderNavigationGuardActions(params: BuilderNavigationGuardActionParams) {
  const { uploadState, designState, viewState, cancelDesignHtmlGeneration } = params

  /**
   * 빌더 화면 변경
   * HTML 생성 중이면 confirm 승인 후 이동
   *
   * @param nextView 이동할 다음 화면
   * @returns 이동 처리 여부
   */
  function setView(nextView: BuilderView) {
    if (nextView === viewState.currentView.value) return true
    if (!confirmDesignHtmlGenerationLeave()) return false

    viewState.setView(nextView)
    return true
  }

  /**
   * 업로드 파일 유형 선택
   * HTML 생성 중이면 confirm 승인 후 유형 변경
   *
   * @param fileType 선택할 업로드 파일 유형
   * @returns 선택 처리 여부
   */
  function selectUploadFileType(fileType: BuilderUploadFileType) {
    if (!confirmDesignHtmlGenerationLeave()) return false

    uploadState.selectUploadFileType(fileType)
    return true
  }

  /**
   * 디자인 시안 작성 방식 선택
   * HTML 생성 중이면 confirm 승인 후 방식 변경
   *
   * @param method 선택할 디자인 작성 방식
   * @returns 선택 처리 여부
   */
  function selectDesignMethod(method: BuilderDesignMethod) {
    if (!confirmDesignHtmlGenerationLeave()) return false

    designState.selectDesignMethod(method)
    return true
  }

  /**
   * HTML 생성 중 화면 이탈 여부 확인
   * 승인 시 진행 중인 HTML 생성 요청 취소
   *
   * @returns 이탈 가능 여부
   */
  function confirmDesignHtmlGenerationLeave() {
    if (uploadState.importStatus.value !== 'importing') return true
    if (import.meta.server) return true

    const confirmed = window.confirm('AI가 HTML을 생성 중입니다. 정말 나가시겠습니까?')

    if (confirmed) {
      cancelDesignHtmlGeneration()
    }

    return confirmed
  }

  return {
    setView,
    selectUploadFileType,
    selectDesignMethod
  }
}

