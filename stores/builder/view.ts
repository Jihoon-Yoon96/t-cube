/**
 * 빌더의 현재 화면 위치와 미리보기 viewport 상태를 관리
 */


import type { BuilderView, BuilderViewportMode } from './type/types'

/**
 * 빌더 화면 상태 구성
 * 현재 화면과 미리보기 viewport 상태 제공
 *
 * @returns 화면 위치와 viewport 변경 API
 */
export function useBuilderViewState() {
  const currentView = ref<BuilderView>('start')
  const activeViewport = ref<BuilderViewportMode>('desktop')

  /**
   * 현재 빌더 화면 변경
   *
   * @param nextView 이동할 빌더 화면
   */
  function setView(nextView: BuilderView) {
    currentView.value = nextView
  }

  /**
   * 미리보기 viewport 변경
   *
   * @param nextViewport 적용할 viewport 모드
   */
  function setActiveViewport(nextViewport: BuilderViewportMode) {
    activeViewport.value = nextViewport
  }

  return {
    currentView,
    activeViewport,
    setView,
    setActiveViewport
  }
}
