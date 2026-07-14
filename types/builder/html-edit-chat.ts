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

/** HTML 편집 채팅 API 응답 */
export type HtmlEditChatResponse = {
  outerHtml: string
  message: string
  warnings: string[]
  meta: {
    sourceName: string
    mode: 'dummy' | 'ai'
    generatedAt: string
  }
}
