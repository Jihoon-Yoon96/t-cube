/**
 * 편집 화면에서 사용하는 선택 요소, 변경 여부, 현재 문서 상태를 관리
 */


export function useBuilderEditorState() {
  const selectedElementId = ref<string | null>('headline')
  const dirty = ref(false)
  const currentDocument = ref<Record<string, unknown> | null>(null)

  function selectElement(elementId: string | null) {
    selectedElementId.value = elementId
  }

  function markDirty(value = true) {
    dirty.value = value
  }

  function setCurrentDocument(document: Record<string, unknown> | null) {
    currentDocument.value = document
  }

  return {
    selectedElementId,
    dirty,
    currentDocument,
    selectElement,
    markDirty,
    setCurrentDocument
  }
}
