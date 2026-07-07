/**
 * 빌더의 현재 화면 위치와 미리보기 viewport 상태를 관리
 */


import type { BuilderView, BuilderViewportMode } from './type/types'

export function useBuilderViewState() {
  const currentView = ref<BuilderView>('start')
  const activeViewport = ref<BuilderViewportMode>('desktop')

  function setView(nextView: BuilderView) {
    currentView.value = nextView
  }

  function setActiveViewport(nextViewport: BuilderViewportMode) {
    activeViewport.value = nextViewport
  }

  function startEditor() {
    currentView.value = 'editor'
  }

  return {
    currentView,
    activeViewport,
    setView,
    setActiveViewport,
    startEditor
  }
}
