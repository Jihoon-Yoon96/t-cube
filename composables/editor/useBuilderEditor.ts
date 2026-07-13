/**
 * 빌더 HTML 편집 공개 composable
 * 컴포넌트에서 사용하는 편집 문서 상태와 문서 조작 API 제공
 */
import { storeToRefs } from 'pinia'
import { useBuilderStore } from '~/stores/builder'

/**
 * 빌더 편집 상태와 조작 API 구성
 *
 * @returns 편집 문서 상태와 문서 조작 API
 */
export function useBuilderEditor() {
  const builderStore = useBuilderStore()
  const builderStoreRefs = storeToRefs(builderStore)

  return reactive({
    selectedElementId: builderStoreRefs.selectedElementId,
    dirty: builderStoreRefs.dirty,
    currentDocument: builderStoreRefs.currentDocument,
    canUndo: builderStoreRefs.canUndo,
    canRedo: builderStoreRefs.canRedo,
    selectElement: builderStore.selectElement,
    markDirty: builderStore.markDirty,
    setCurrentDocument: builderStore.setCurrentDocument,
    applyCurrentDocumentEdit: builderStore.applyCurrentDocumentEdit,
    updateCurrentDocumentElement: builderStore.updateCurrentDocumentElement,
    moveCurrentDocumentLayoutNode: builderStore.moveCurrentDocumentLayoutNode,
    undoCurrentDocument: builderStore.undoCurrentDocument,
    redoCurrentDocument: builderStore.redoCurrentDocument
  })
}
