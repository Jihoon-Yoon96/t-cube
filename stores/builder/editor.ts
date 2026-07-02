/**
 * 편집 화면에서 사용하는 선택 요소, 변경 여부, 현재 문서 상태를 관리
 */


import type { ParsedHtmlDocument, ParsedHtmlEditableElement } from '~/services/html/parseHtmlDocument'

export function useBuilderEditorState() {
  const selectedElementId = ref<string | null>(null)
  const dirty = ref(false)
  const currentDocument = ref<ParsedHtmlDocument | null>(null)

  function selectElement(elementId: string | null) {
    selectedElementId.value = elementId
  }

  function markDirty(value = true) {
    dirty.value = value
  }

  function setCurrentDocument(document: ParsedHtmlDocument | null) {
    currentDocument.value = document
    selectedElementId.value = document?.elements[0]?.id || null
  }

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
