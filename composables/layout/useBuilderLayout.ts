/**
 * 빌더 레이아웃 작성 공개 composable
 * 컴포넌트에서 사용하는 레이아웃 캔버스 상태와 HTML 생성 API 제공
 */
import { useLayoutCanvas } from '~/composables/layout/useLayoutCanvas'
import { useLayoutDesignToHtml } from '~/composables/layout/useLayoutDesignToHtml'

/**
 * 빌더 레이아웃 상태와 조작 API 구성
 *
 * @returns 레이아웃 캔버스 상태, 조작 API, HTML 생성 API
 */
export function useBuilderLayout() {
  const layoutCanvas = useLayoutCanvas()
  const layoutDesignToHtml = useLayoutDesignToHtml()

  return reactive({
    ...layoutCanvas,
    generateHtmlFromLayoutDesign: layoutDesignToHtml.generateHtmlFromLayoutDesign
  })
}
