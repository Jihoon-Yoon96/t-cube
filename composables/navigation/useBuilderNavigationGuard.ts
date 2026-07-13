/**
 * 빌더 화면 이동 guard composable
 * AI 요청 중 화면 이탈 확인 및 이동 승인 흐름 관리
 */
import { useBuilderHtmlGeneration } from '~/composables/html/useBuilderHtmlGeneration'
import { useHtmlEditChat } from '~/composables/editor/useHtmlEditChat'
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
  const htmlEditChat = useHtmlEditChat()

  /**
   * 빌더 화면 변경
   * AI 요청 중이면 confirm 승인 후 이동
   *
   * @param nextView 이동할 다음 화면
   * @returns 이동 처리 여부
   */
  function moveToView(nextView: BuilderView) {
    if (nextView === builderStore.currentView) return true
    if (!confirmAiRequestLeave()) return false

    builderStore.setView(nextView)
    return true
  }

  /**
   * 업로드 파일 유형 선택
   * AI 요청 중이면 confirm 승인 후 유형 변경
   *
   * @param fileType 선택할 업로드 파일 유형
   * @returns 선택 처리 여부
   */
  function selectUploadFileType(fileType: BuilderUploadFileType) {
    if (!confirmAiRequestLeave()) return false

    builderStore.selectUploadFileType(fileType)
    return true
  }

  /**
   * 디자인 시안 작성 방식 선택
   * AI 요청 중이면 confirm 승인 후 방식 변경
   *
   * @param method 선택할 디자인 작성 방식
   * @returns 선택 처리 여부
   */
  function selectDesignMethod(method: BuilderDesignMethod) {
    if (!confirmAiRequestLeave()) return false

    builderStore.setView(method === 'layout' ? 'layout-design' : 'ai-prompt-design')
    return true
  }

  /**
   * AI 요청 중 화면 이탈 여부 확인
   * 승인 시 진행 중인 디자인 생성 또는 HTML 편집 요청 취소
   *
   * @returns 이탈 가능 여부
   */
  function confirmAiRequestLeave() {
    const isDesignGenerationActive = builderStore.importStatus === 'importing'
    const isHtmlEditActive = htmlEditChat.isRequesting.value

    if (!isDesignGenerationActive && !isHtmlEditActive) return true
    if (import.meta.server) return true

    const confirmed = window.confirm(
      isHtmlEditActive
        ? 'AI가 HTML 소스를 수정 중입니다. 요청을 취소하고 이동하시겠습니까?'
        : 'AI가 HTML을 생성 중입니다. 정말 나가시겠습니까?'
    )

    if (confirmed) {
      if (isHtmlEditActive) htmlEditChat.cancelRequest()
      if (isDesignGenerationActive) cancelDesignHtmlGeneration()
    }

    return confirmed
  }

  return {
    moveToView,
    selectUploadFileType,
    selectDesignMethod
  }
}
