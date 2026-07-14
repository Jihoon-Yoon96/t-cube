import type { ShallowRef } from 'vue'
import { useBuilderEditor } from '~/composables/editor/useBuilderEditor'
import {
  getHtmlLayoutNodeOuterHtml,
  parseHtmlDocument,
  replaceHtmlLayoutNodeOuterHtml
} from '~/services/html/parseHtmlDocument'
import type { ParsedHtmlLayoutNode } from '~/services/html/parseHtmlDocument'
import type {
  HtmlEditChatMessage,
  HtmlEditChatRequest,
  HtmlEditChatResponse
} from '~/types/builder/html-edit-chat'

type HtmlEditChatNuxtApp = ReturnType<typeof useNuxtApp> & {
  _tcubeHtmlEditChatAbortController?: ShallowRef<AbortController | null>
}

/**
 * HTML 편집 채팅 상태와 API 요청 구성
 *
 * @returns 채팅 메시지, 요청 상태, 전송·취소·초기화 API
 */
export function useHtmlEditChat() {
  const builderEditor = useBuilderEditor()
  const nuxtApp = useNuxtApp() as HtmlEditChatNuxtApp
  const messages = useState<HtmlEditChatMessage[]>('tcube-html-edit-chat-messages', () => [])
  const isRequesting = useState<boolean>('tcube-html-edit-chat-requesting', () => false)
  const requestError = useState<string>('tcube-html-edit-chat-error', () => '')

  if (!nuxtApp._tcubeHtmlEditChatAbortController) {
    nuxtApp._tcubeHtmlEditChatAbortController = shallowRef<AbortController | null>(null)
  }

  const abortController = nuxtApp._tcubeHtmlEditChatAbortController

  /**
   * 사용자 요청과 선택 노드 outerHTML을 AI 편집 API에 전달
   *
   * @param content 사용자 HTML 수정 요청
   * @param layoutNode 수정할 레이아웃 노드
   * @returns 적용 후 다시 선택할 레이아웃 노드 id, 미적용 시 null
   */
  async function sendMessage(content: string, layoutNode: ParsedHtmlLayoutNode) {
    const userContent = content.trim()
    const currentDocument = builderEditor.currentDocument

    if (!userContent || !currentDocument || isRequesting.value) return null

    const sourceOuterHtml = getHtmlLayoutNodeOuterHtml(currentDocument, layoutNode.id)

    if (!sourceOuterHtml) {
      requestError.value = '선택한 HTML 구조를 현재 문서에서 찾을 수 없습니다.'
      return null
    }

    const userMessage: HtmlEditChatMessage = {
      id: createMessageId('user'),
      role: 'user',
      content: userContent,
      targetLabel: layoutNode.label,
      targetSelector: layoutNode.selector
    }
    messages.value = [...messages.value, userMessage]
    requestError.value = ''
    isRequesting.value = true

    const requestAbortController = new AbortController()
    abortController.value = requestAbortController

    try {
      const request: HtmlEditChatRequest = {
        outerHtml: sourceOuterHtml,
        targetLabel: layoutNode.label,
        sourceName: currentDocument.sourceName,
        messages: messages.value
          .filter((message) => message.targetSelector === layoutNode.selector)
          .map(({ role, content: messageContent }) => ({
            role,
            content: messageContent
          }))
      }
      const response = await $fetch<HtmlEditChatResponse>('/api/builder/html-edit-chat', {
        method: 'POST',
        body: request,
        signal: requestAbortController.signal
      })

      const appliedLayoutNodeId = applyHtmlEditResponse(
        response,
        sourceOuterHtml,
        currentDocument.sourceName,
        layoutNode.id
      )
      messages.value = [
        ...messages.value,
        {
          id: createMessageId('assistant'),
          role: 'assistant',
          content: createAssistantMessage(response),
          targetLabel: layoutNode.label,
          targetSelector: layoutNode.selector
        }
      ]

      return appliedLayoutNodeId
    } catch (error) {
      if (isAbortError(error)) {
        messages.value = [
          ...messages.value,
          {
            id: createMessageId('assistant'),
            role: 'assistant',
            content: '요청을 중지했습니다.',
            targetLabel: layoutNode.label,
            targetSelector: layoutNode.selector
          }
        ]
        return null
      }

      requestError.value = error instanceof Error
        ? error.message
        : 'HTML 수정 요청을 처리하는 중 문제가 발생했습니다.'
      return null
    } finally {
      if (abortController.value === requestAbortController) {
        abortController.value = null
        isRequesting.value = false
      }
    }
  }

  /** 진행 중인 HTML 편집 AI 요청 취소 */
  function cancelRequest() {
    if (!abortController.value) return

    const currentAbortController = abortController.value

    abortController.value = null
    isRequesting.value = false
    currentAbortController.abort()
  }

  /** 채팅 대화와 오류 상태 초기화 */
  function resetConversation() {
    cancelRequest()
    messages.value = []
    requestError.value = ''
  }

  /**
   * AI가 반환한 outerHTML을 선택 노드에 반영
   *
   * @param response HTML 편집 채팅 응답
   * @param previousOuterHtml 요청 전 선택 노드 outerHTML
   * @param sourceName 현재 문서 출처 이름
   * @param targetNodeId 교체할 레이아웃 노드 id
   * @returns 적용 후 다시 선택할 레이아웃 노드 id, 미적용 시 기존 id, 실패 시 null
   */
  function applyHtmlEditResponse(
    response: HtmlEditChatResponse,
    previousOuterHtml: string,
    sourceName: string,
    targetNodeId: string
  ) {
    if (response.outerHtml.trim() === previousOuterHtml.trim()) return targetNodeId

    const currentDocument = builderEditor.currentDocument

    if (!currentDocument) return null

    const replacement = replaceHtmlLayoutNodeOuterHtml(
      currentDocument,
      targetNodeId,
      response.outerHtml
    )

    if (!replacement) {
      throw new TypeError('AI 응답에서 하나의 올바른 HTML 노드를 확인할 수 없습니다.')
    }

    const parsedDocument = parseHtmlDocument(replacement.html, { sourceName })
    const appliedLayoutNodeId = parsedDocument.layoutNodes.find((node) => (
      node.selector === replacement.replacedSelector
    ))?.id || null

    builderEditor.applyCurrentDocumentEdit(parsedDocument)

    return appliedLayoutNodeId
  }

  /**
   * AI 설명과 경고 목록을 하나의 채팅 메시지로 구성
   *
   * @param response HTML 편집 채팅 응답
   * @returns 채팅에 표시할 AI 메시지
   */
  function createAssistantMessage(response: HtmlEditChatResponse) {
    if (response.warnings.length === 0) return response.message

    return `${response.message}\n\n${response.warnings.join('\n')}`
  }

  /**
   * 채팅 메시지 식별자 생성
   *
   * @param role 메시지 역할
   * @returns 역할, 시간, 난수를 조합한 식별자
   */
  function createMessageId(role: HtmlEditChatMessage['role']) {
    return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  /**
   * 요청 취소로 발생한 오류인지 확인
   *
   * @param error 확인할 오류
   * @returns 요청 취소 오류이면 true
   */
  function isAbortError(error: unknown) {
    if (!error || typeof error !== 'object') return false

    const name = (error as { name?: unknown }).name
    const message = (error as { message?: unknown }).message

    return name === 'AbortError'
      || (typeof message === 'string' && message.toLowerCase().includes('aborted'))
  }

  return {
    messages,
    isRequesting,
    requestError,
    sendMessage,
    cancelRequest,
    resetConversation
  }
}
