/** HTML 편집 채팅 메시지 역할 */
export type HtmlEditChatRole = 'user' | 'assistant'

/** HTML 편집 채팅 화면 메시지 */
export type HtmlEditChatMessage = {
  id: string
  role: HtmlEditChatRole
  content: string
  targetLabel?: string
  targetSelector?: string
}

/** HTML 편집 채팅 API에 전달할 대화 메시지 */
export type HtmlEditChatRequestMessage = Pick<HtmlEditChatMessage, 'role' | 'content'>

/** HTML 편집 채팅 API 요청 */
export type HtmlEditChatRequest = {
  outerHtml: string
  targetLabel: string
  sourceName: string
  messages: HtmlEditChatRequestMessage[]
}

/** 선택 노드를 기준으로 적용할 HTML 편집 작업 */
export type HtmlEditOperationType = 'replace' | 'insertBefore' | 'insertAfter'

/** AI가 반환하는 단일 HTML 노드 편집 작업 */
export type HtmlEditOperation = {
  operation: HtmlEditOperationType
  outerHtml: string
}

/** HTML 편집 채팅 API 응답 */
export type HtmlEditChatResponse = {
  operations: HtmlEditOperation[]
  message: string
  warnings: string[]
  meta: {
    sourceName: string
    mode: 'dummy' | 'ai'
    generatedAt: string
  }
}
