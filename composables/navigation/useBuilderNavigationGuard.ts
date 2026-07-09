/**
 * 빌더 화면 이동 guard composable
 * HTML 생성 중 화면 이탈 확인 및 이동 승인 흐름 관리
 */
import { useBuilderHtmlGeneration } from '~/composables/html/useBuilderHtmlGeneration'
import { useBuilderStore } from '~/stores/builder'
import type { BuilderDesignMethod, BuilderUploadFileType, BuilderView } from '~/stores/builder/type/types'

/**
 * 빌더 이동 guard 구성
 * 생성 중인 AI 요청이 있으면 사용자 확인 후 상태 변경
 *
 * @returns 화면/업로드 유형/디자인 방식 선택 API
 */
export function useBuilderNavigationGuard() {
  const builderStore = useBuilderStore()
  const { cancelDesignHtmlGeneration } = useBuilderHtmlGeneration()

  /**
   * 빌더 화면 변경
   * HTML 생성 중이면 confirm 승인 후 이동
   *
   * @param nextView 이동할 다음 화면
   * @returns 이동 처리 여부
   */
  function setView(nextView: BuilderView) {
    if (nextView === builderStore.currentView) return true
    if (!confirmDesignHtmlGenerationLeave()) return false

    builderStore.setView(nextView)
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

    builderStore.selectUploadFileType(fileType)
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

    builderStore.setView(method === 'layout' ? 'layout-design' : 'ai-prompt-design')
    return true
  }

  /**
   * HTML 생성 중 화면 이탈 여부 확인
   * 승인 시 진행 중인 HTML 생성 요청 취소
   *
   * @returns 이탈 가능 여부
   */
  function confirmDesignHtmlGenerationLeave() {
    if (builderStore.importStatus !== 'importing') return true
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
