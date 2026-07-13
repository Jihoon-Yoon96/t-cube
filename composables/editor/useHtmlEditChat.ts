import type { ShallowRef } from 'vue'
import { useBuilderEditor } from '~/composables/editor/useBuilderEditor'
import {
  parseHtmlDocument,
  renderFinalHtmlDocument
} from '~/services/html/parseHtmlDocument'
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
   * 사용자 요청과 현재 HTML을 AI 편집 API에 전달
   *
   * @param content 사용자 HTML 수정 요청
   * @returns 요청 처리 완료 Promise
   */
  async function sendMessage(content: string) {
    const userContent = content.trim()
    const currentDocument = builderEditor.currentDocument

    if (!userContent || !currentDocument || isRequesting.value) return

    const userMessage: HtmlEditChatMessage = {
      id: createMessageId('user'),
      role: 'user',
      content: userContent
    }
    const sourceHtml = renderFinalHtmlDocument(currentDocument)

    messages.value = [...messages.value, userMessage]
    requestError.value = ''
    isRequesting.value = true

    const requestAbortController = new AbortController()
    abortController.value = requestAbortController

    try {
      const request: HtmlEditChatRequest = {
        html: sourceHtml,
        sourceName: currentDocument.sourceName,
        messages: messages.value.map(({ role, content: messageContent }) => ({
          role,
          content: messageContent
        }))
      }
      const response = await $fetch<HtmlEditChatResponse>('/api/builder/html-edit-chat', {
        method: 'POST',
        body: request,
        signal: requestAbortController.signal
      })

      applyHtmlEditResponse(response, sourceHtml, currentDocument.sourceName)
      messages.value = [
        ...messages.value,
        {
          id: createMessageId('assistant'),
          role: 'assistant',
          content: createAssistantMessage(response)
        }
      ]
    } catch (error) {
      if (isAbortError(error)) {
        messages.value = [
          ...messages.value,
          {
            id: createMessageId('assistant'),
            role: 'assistant',
            content: '요청을 중지했습니다.'
          }
        ]
        return
      }

      requestError.value = error instanceof Error
        ? error.message
        : 'HTML 수정 요청을 처리하는 중 문제가 발생했습니다.'
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
   * AI가 반환한 HTML을 현재 편집 문서에 반영
   *
   * @param response HTML 편집 채팅 응답
   * @param previousHtml 요청 전 HTML
   * @param sourceName 현재 문서 출처 이름
   * @returns 없음
   */
  function applyHtmlEditResponse(response: HtmlEditChatResponse, previousHtml: string, sourceName: string) {
    if (response.html.trim() === previousHtml.trim()) return
    if (!isHtmlDocumentResponse(response.html)) {
      throw new TypeError('AI 응답에서 올바른 HTML 문서를 확인할 수 없습니다.')
    }

    const parsedDocument = parseHtmlDocument(response.html, { sourceName })

    builderEditor.setCurrentDocument(parsedDocument)
    builderEditor.markDirty(true)
  }

  /**
   * API 응답 원문이나 JSON 문자열이 문서로 주입되지 않도록 HTML 형태 확인
   *
   * @param value 검사할 API 응답 HTML
   * @returns HTML 문서 형태이면 true
   */
  function isHtmlDocumentResponse(value: string) {
    const trimmed = value.trim()

    if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) return false

    return /<!doctype\s+html\b|<html\b|<body\b|<[a-z][a-z0-9-]*(?:\s[^<>]*?)?>/i.test(trimmed)
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
