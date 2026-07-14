/**
 * 레이아웃 작성 기반 HTML 생성 composable
 * 레이아웃 블록 변환 결과의 편집기 반영 및 화면 전환 흐름 관리
 */
import { useBuilderLayoutCanvas } from '~/composables/layout/useBuilderLayoutCanvas'
import { createLayoutDesignHtml } from '~/services/builder/layoutDesignToHtml'
import { parseHtmlDocument } from '~/services/html/parseHtmlDocument'
import { useBuilderStore } from '~/stores/builder'

/**
 * 레이아웃 작성 기반 HTML 생성 흐름 구성
 * 캔버스 블록을 HTML 문서로 변환한 뒤 편집기 상태로 반영
 *
 * @returns 레이아웃 기반 HTML 생성 API
 */
export function useBuilderLayoutDesignToHtml() {
  const builderStore = useBuilderStore()
  const layoutCanvas = useBuilderLayoutCanvas()

  /**
   * 레이아웃 블록 기반 HTML 생성
  * 생성된 HTML 파싱 및 HTML 편집 화면 전환
  */
  function generateHtmlFromLayoutDesign() {
    const html = createLayoutDesignHtml(layoutCanvas.layoutBlocks)
    const parsedDocument = parseHtmlDocument(html, {
      sourceName: 'layout-design.html'
    })

    builderStore.setCurrentDocument(parsedDocument)
    builderStore.markDirty(false)
    builderStore.completeFileAnalysis()
    builderStore.setView('html-editor')
  }

  return {
    generateHtmlFromLayoutDesign
  }
}
