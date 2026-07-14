import { editHtmlWithChat } from '~/server/services/builder/htmlEditChat'
import type {
  HtmlEditChatRequest,
  HtmlEditChatRequestMessage,
  HtmlEditChatResponse
} from '~/types/builder/html-edit-chat'

const MAX_MESSAGE_LENGTH = 4_000
const MAX_MESSAGE_COUNT = 20

/**
 * 대화 기반 HTML 수정 요청 처리
 *
 * @param event 선택 노드 outerHTML과 대화 이력이 포함된 POST 요청
 * @returns 수정된 노드 outerHTML과 AI 응답 메시지
 */
export default defineEventHandler(async (event): Promise<HtmlEditChatResponse> => {
  const requestBody = await readBody<unknown>(event)
  const request = parseHtmlEditChatRequest(requestBody)
  const abortController = new AbortController()

  /** 클라이언트 연결 종료 시 외부 AI 요청 취소 */
  const handleRequestAborted = () => {
    abortController.abort()
  }

  event.node.req.once('aborted', handleRequestAborted)

  try {
    return await editHtmlWithChat({
      ...request,
      signal: abortController.signal
    })
  } finally {
    event.node.req.off('aborted', handleRequestAborted)
  }
})

/**
 * HTML 수정 채팅 요청 검증 및 정규화
 *
 * @param value 검증할 요청 body
 * @returns 검증된 HTML 수정 요청
 */
function parseHtmlEditChatRequest(value: unknown): HtmlEditChatRequest {
  if (!value || typeof value !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'HTML 수정 요청 본문이 필요합니다.' })
  }

  const body = value as Partial<HtmlEditChatRequest>
  const outerHtml = typeof body.outerHtml === 'string' ? body.outerHtml.trim() : ''
  const targetLabel = typeof body.targetLabel === 'string' && body.targetLabel.trim()
    ? body.targetLabel.trim()
    : '선택 노드'
  const sourceName = typeof body.sourceName === 'string' && body.sourceName.trim()
    ? body.sourceName.trim()
    : 'edited-document.html'

  if (!outerHtml) {
    throw createError({ statusCode: 400, statusMessage: '수정할 노드의 outerHTML이 필요합니다.' })
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'HTML 수정 대화가 필요합니다.' })
  }

  const messages = body.messages.slice(-MAX_MESSAGE_COUNT).map(parseHtmlEditChatMessage)

  if (messages.at(-1)?.role !== 'user') {
    throw createError({ statusCode: 400, statusMessage: '마지막 대화는 사용자 요청이어야 합니다.' })
  }

  return { outerHtml, targetLabel, sourceName, messages }
}

/**
 * HTML 수정 채팅 메시지 검증
 *
 * @param value 검증할 메시지
 * @returns 검증된 채팅 메시지
 */
function parseHtmlEditChatMessage(value: unknown): HtmlEditChatRequestMessage {
  if (!value || typeof value !== 'object') {
    throw createError({ statusCode: 400, statusMessage: '올바르지 않은 채팅 메시지입니다.' })
  }

  const message = value as Partial<HtmlEditChatRequestMessage>
  const content = typeof message.content === 'string' ? message.content.trim() : ''

  if (message.role !== 'user' && message.role !== 'assistant') {
    throw createError({ statusCode: 400, statusMessage: '올바르지 않은 채팅 역할입니다.' })
  }

  if (!content || content.length > MAX_MESSAGE_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: '채팅 메시지는 1자 이상 4,000자 이하여야 합니다.' })
  }

  return { role: message.role, content }
}
