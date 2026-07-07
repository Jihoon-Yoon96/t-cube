/**
 * 편집 화면에서 사용하는 선택 요소, 변경 여부, 현재 문서 상태를 관리
 */


import type { ParsedHtmlDocument, ParsedHtmlEditableElement } from '~/services/html/parseHtmlDocument'

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

  return {
    selectedElementId,
    dirty,
    currentDocument,
    selectElement,
    markDirty,
    setCurrentDocument,
    updateCurrentDocumentElement
  }
}
