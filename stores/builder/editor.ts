/**
 * 편집 화면에서 사용하는 선택 요소, 변경 여부, 현재 문서 상태를 관리
 */


import type { ParsedHtmlDocument, ParsedHtmlEditableElement } from '~/services/html/parseHtmlDocument'
import { moveHtmlLayoutNode, parseHtmlDocument } from '~/services/html/parseHtmlDocument'

type EditorHistorySnapshot = {
  document: ParsedHtmlDocument
  selectedElementId: string | null
  dirty: boolean
}

const MAX_EDITOR_HISTORY_COUNT = 50

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
  const undoHistory = ref<EditorHistorySnapshot[]>([])
  const redoHistory = ref<EditorHistorySnapshot[]>([])

  /** 뒤돌릴 문서 이력 존재 여부 */
  const canUndo = computed(() => undoHistory.value.length > 0)

  /** 재실행할 문서 이력 존재 여부 */
  const canRedo = computed(() => redoHistory.value.length > 0)

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
    dirty.value = false
    undoHistory.value = []
    redoHistory.value = []
  }

  /**
   * AI 편집처럼 전체 문서가 변경되는 결과를 하나의 이력으로 적용
   *
   * @param document 편집 결과로 교체할 HTML 문서
   * @returns 없음
   */
  function applyCurrentDocumentEdit(document: ParsedHtmlDocument) {
    if (!currentDocument.value) return

    recordCurrentDocumentForUndo()
    currentDocument.value = document
    selectedElementId.value = document.elements[0]?.id || null
    dirty.value = true
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
    patch: Partial<Pick<ParsedHtmlEditableElement, 'content' | 'src' | 'alt' | 'href' | 'mediaSources'>>
  ) {
    if (!currentDocument.value) return

    let changed = false
    const nextElements = currentDocument.value.elements.map((element) => {
      if (element.id !== elementId) return element

      const nextElement = {
        ...element,
        ...patch
      }

      changed = Object.keys(patch).some((key) => {
        const property = key as keyof typeof nextElement

        return element[property] !== nextElement[property]
      })

      return nextElement
    })

    if (!changed) return

    recordCurrentDocumentForUndo()
    currentDocument.value = {
      ...currentDocument.value,
      elements: nextElements
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

    const moveResult = moveHtmlLayoutNode(currentDocument.value, sourceNodeId, targetNodeId, position)

    if (!moveResult) return null

    recordCurrentDocumentForUndo()
    const previousSourceName = currentDocument.value.sourceName
    currentDocument.value = parseHtmlDocument(moveResult.html, {
      sourceName: previousSourceName
    })
    selectedElementId.value = currentDocument.value.elements[0]?.id || null
    dirty.value = true

    return currentDocument.value.layoutNodes.find((node) => node.selector === moveResult.movedSelector)?.id || null
  }

  /** 이전 문서 스냅샷 복원 */
  function undoCurrentDocument() {
    const previousSnapshot = undoHistory.value.pop()
    const currentSnapshot = createCurrentDocumentSnapshot()

    if (!previousSnapshot || !currentSnapshot) return

    pushHistorySnapshot(redoHistory.value, currentSnapshot)
    restoreHistorySnapshot(previousSnapshot)
  }

  /** 뒤돌리기 이전 문서 스냅샷 재적용 */
  function redoCurrentDocument() {
    const nextSnapshot = redoHistory.value.pop()
    const currentSnapshot = createCurrentDocumentSnapshot()

    if (!nextSnapshot || !currentSnapshot) return

    pushHistorySnapshot(undoHistory.value, currentSnapshot)
    restoreHistorySnapshot(nextSnapshot)
  }

  /** 현재 문서를 undo 이력에 저장하고 redo 이력 초기화 */
  function recordCurrentDocumentForUndo() {
    const snapshot = createCurrentDocumentSnapshot()

    if (!snapshot) return

    pushHistorySnapshot(undoHistory.value, snapshot)
    redoHistory.value = []
  }

  /**
   * 현재 편집 상태의 이력 스냅샷 생성
   *
   * @returns 현재 문서가 있으면 이력 스냅샷, 없으면 null
   */
  function createCurrentDocumentSnapshot(): EditorHistorySnapshot | null {
    if (!currentDocument.value) return null

    return {
      document: currentDocument.value,
      selectedElementId: selectedElementId.value,
      dirty: dirty.value
    }
  }

  /**
   * 이력 배열에 스냅샷을 추가하고 최대 보관 개수 유지
   *
   * @param history 스냅샷을 추가할 undo 또는 redo 이력
   * @param snapshot 추가할 편집 상태 스냅샷
   * @returns 없음
   */
  function pushHistorySnapshot(history: EditorHistorySnapshot[], snapshot: EditorHistorySnapshot) {
    history.push(snapshot)

    if (history.length > MAX_EDITOR_HISTORY_COUNT) history.shift()
  }

  /**
   * 저장된 문서 이력 스냅샷 복원
   *
   * @param snapshot 복원할 편집 상태
   * @returns 없음
   */
  function restoreHistorySnapshot(snapshot: EditorHistorySnapshot) {
    currentDocument.value = snapshot.document
    selectedElementId.value = snapshot.selectedElementId
    dirty.value = snapshot.dirty
  }

  return {
    selectedElementId,
    dirty,
    currentDocument,
    canUndo,
    canRedo,
    selectElement,
    markDirty,
    setCurrentDocument,
    applyCurrentDocumentEdit,
    updateCurrentDocumentElement,
    moveCurrentDocumentLayoutNode,
    undoCurrentDocument,
    redoCurrentDocument
  }
}
