/**
 * 편집 화면에서 사용하는 선택 요소, 변경 여부, 현재 문서 상태를 관리
 */


import type { ParsedHtmlDocument, ParsedHtmlEditableElement } from '~/services/html/parseHtmlDocument'
import { moveHtmlLayoutNode, parseHtmlDocument } from '~/services/html/parseHtmlDocument'

/**
 * HTML 편집기 상태 구성
 * 선택 요소, dirty 여부, 현재 문서 상태 관리
 *
 * @returns HTML 편집기 상태와 문서 변경 API
 */
export function useBuilderEditorState() {
  const selectedElementId = ref<string | null>(null)
  const dirty = ref(false)
  const currentDocument = ref<ParsedHtmlDocument | null>(null)

  /**
   * 편집 대상 요소 선택
   *
   * @param elementId 선택할 요소 id, 선택 해제 시 null
   */
  function selectElement(elementId: string | null) {
    selectedElementId.value = elementId
  }

  /**
   * 문서 변경 여부 설정
   *
   * @param value dirty 상태값
   */
  function markDirty(value = true) {
    dirty.value = value
  }

  /**
   * 현재 편집 문서 설정
   * 첫 번째 편집 가능 요소를 기본 선택
   *
   * @param document 편집 대상으로 설정할 HTML 문서, 초기화 시 null
   */
  function setCurrentDocument(document: ParsedHtmlDocument | null) {
    currentDocument.value = document
    selectedElementId.value = document?.elements[0]?.id || null
  }

  /**
   * 현재 문서의 편집 가능 요소 갱신
   * content/src/alt/href 속성 일부 변경
   *
   * @param elementId 변경할 요소 id
   * @param patch 요소에 반영할 변경 값
   */
  function updateCurrentDocumentElement(
    elementId: string,
    patch: Partial<Pick<ParsedHtmlEditableElement, 'content' | 'src' | 'alt' | 'href'>>
  ) {
    if (!currentDocument.value) return

    currentDocument.value = {
      ...currentDocument.value,
      elements: currentDocument.value.elements.map((element) => {
        if (element.id !== elementId) return element

        return {
          ...element,
          ...patch
        }
      })
    }

    dirty.value = true
  }

  /**
   * HTML 레이아웃 노드 순서 변경
   *
   * @param sourceNodeId 이동할 레이아웃 노드 id
   * @param targetNodeId 기준 레이아웃 노드 id
   * @param position 기준 노드 앞 또는 뒤 위치
   * @returns 이동 후 다시 선택할 레이아웃 노드 id, 실패 시 null
   */
  function moveCurrentDocumentLayoutNode(
    sourceNodeId: string,
    targetNodeId: string,
    position: 'before' | 'after'
  ) {
    if (!currentDocument.value) return null

    const sourceNode = currentDocument.value.layoutNodes.find((node) => node.id === sourceNodeId)
    const nextHtml = moveHtmlLayoutNode(currentDocument.value, sourceNodeId, targetNodeId, position)

    if (!nextHtml) return null

    const previousSourceName = currentDocument.value.sourceName
    currentDocument.value = parseHtmlDocument(nextHtml, {
      sourceName: previousSourceName
    })
    selectedElementId.value = currentDocument.value.elements[0]?.id || null
    dirty.value = true

    return currentDocument.value.layoutNodes.find((node) => node.signature === sourceNode?.signature)?.id || null
  }

  return {
    selectedElementId,
    dirty,
    currentDocument,
    selectElement,
    markDirty,
    setCurrentDocument,
    updateCurrentDocumentElement,
    moveCurrentDocumentLayoutNode
  }
}
