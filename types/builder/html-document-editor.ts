import type { ParsedHtmlMediaSource } from '~/services/html/parseHtmlDocument'

/** HTML 문서 편집기 인스펙터 표시 모드 */
export type HtmlInspectorMode = 'elements' | 'layout'

/** HTML 구조 노드 이동 기준 위치 */
export type HtmlLayoutMovePosition = 'before' | 'after'

/** HTML 요소 편집 팝오버 화면 모드 */
export type HtmlElementEditPopoverMode = 'menu' | 'href' | 'media-src'

/** HTML 요소 편집 팝오버 대상 유형 */
export type HtmlElementEditTargetType = 'link' | 'text' | 'image' | 'picture' | 'video'

/** HTML 요소 편집 팝오버 상태 */
export type HtmlElementEditPopoverState = {
  visible: boolean
  mode: HtmlElementEditPopoverMode
  targetType: HtmlElementEditTargetType
  hasLink: boolean
  elementId: string
  href: string
  mediaSources: ParsedHtmlMediaSource[]
  x: number
  y: number
}
