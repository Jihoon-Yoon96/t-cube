/**
 * 빌더 화면/viewport 공개 composable
 * 컴포넌트에서 사용하는 화면 이동과 viewport 상태 API 제공
 */
import { storeToRefs } from 'pinia'
import { useBuilderNavigationGuard } from '~/composables/navigation/useBuilderNavigationGuard'
import { useBuilderStore } from '~/stores/builder'

/**
 * 빌더 화면 상태와 이동 API 구성
 *
 * @returns 화면/viewport 상태와 이동 API
 */
export function useBuilderView() {
  const builderStore = useBuilderStore()
  const builderStoreRefs = storeToRefs(builderStore)
  const navigationGuard = useBuilderNavigationGuard()

  return reactive({
    currentView: builderStoreRefs.currentView,
    activeViewport: builderStoreRefs.activeViewport,
    moveToView: navigationGuard.moveToView,
    setActiveViewport: builderStore.setActiveViewport
  })
}
