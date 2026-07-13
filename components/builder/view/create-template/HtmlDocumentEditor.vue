<template>
  <section class="html-editor-screen">
    <div
      v-if="currentDocument"
      class="html-editor-layout"
      :class="{ 'show-element-list': showElementList }"
    >
      <HtmlEditorInspector
        v-if="showElementList"
        v-model:mode="inspectorMode"
        :document="currentDocument"
        :selected-element-id="builderEditor.selectedElementId"
        :selected-layout-node-id="selectedLayoutNodeId"
        :dragged-layout-node-id="draggedLayoutNodeId"
        @select-element="handleElementListClick"
        @select-layout="handleLayoutNodeClick"
        @hover-element="handleElementListHover"
        @hover-layout="handleLayoutNodeHover"
        @clear-hover="clearInspectorHover"
        @layout-drag-start="handleLayoutDragStart"
        @layout-drag-end="handleLayoutDragEnd"
        @move-layout="moveDraggedLayoutNode"
      />

      <HtmlEditorPreview
        ref="preview"
        v-model:show-inspector="showElementList"
        v-model:selected-layout-node-id="selectedLayoutNodeId"
        v-model:dragged-layout-node-id="draggedLayoutNodeId"
        :document="currentDocument"
        :mode="inspectorMode"
        :selected-element-id="builderEditor.selectedElementId"
        :hovered-element-id="hoveredElementId"
        :hovered-layout-node-id="hoveredLayoutNodeId"
        :frame-width="previewFrameWidth"
      />
    </div>

    <div v-else class="body-placeholder">
      <span class="section-title">HTML EDITOR</span>
      <h1>편집할 HTML 문서가 없습니다</h1>
      <p>HTML 파일을 업로드하고 분석을 시작해주세요.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ParsedHtmlEditableElement, ParsedHtmlLayoutNode } from '~/stores/builder'
import type { HtmlInspectorMode, HtmlLayoutMovePosition } from '~/types/builder/html-document-editor'
import HtmlEditorInspector from './html-document-editor/HtmlEditorInspector.vue'
import HtmlEditorPreview from './html-document-editor/HtmlEditorPreview.vue'
import { useBuilderEditor } from '~/composables/editor/useBuilderEditor'
import { useBuilderView } from '~/composables/view/useBuilderView'

type HtmlEditorPreviewExposed = {
  focusEditableElement: (element: ParsedHtmlEditableElement) => void
  focusLayoutNode: (layoutNode: ParsedHtmlLayoutNode) => void
  moveDraggedLayoutNode: (targetNodeId: string, position: HtmlLayoutMovePosition) => void
}

const builderEditor = useBuilderEditor()
const builderView = useBuilderView()
const preview = ref<HtmlEditorPreviewExposed | null>(null)
const showElementList = ref(true)
const inspectorMode = ref<HtmlInspectorMode>('elements')
const selectedLayoutNodeId = ref('')
const draggedLayoutNodeId = ref('')
const hoveredElementId = ref('')
const hoveredLayoutNodeId = ref('')

/** 현재 편집 중인 HTML 문서 */
const currentDocument = computed(() => builderEditor.currentDocument)

/** 선택한 빌더 viewport에 대응하는 iframe 너비 */
const previewFrameWidth = computed(() => {
  if (builderView.activeViewport === 'tablet') return '768px'
  if (builderView.activeViewport === 'mobile') return '390px'

  return '100%'
})

/**
 * 요소 목록 선택을 iframe 편집 동작으로 전달
 *
 * @param element 선택한 편집 요소
 * @returns 없음
 */
function handleElementListClick(element: ParsedHtmlEditableElement) {
  selectedLayoutNodeId.value = ''
  preview.value?.focusEditableElement(element)
}

/**
 * 구조 목록 선택을 iframe 포커스 동작으로 전달
 *
 * @param layoutNode 선택한 레이아웃 노드
 * @returns 없음
 */
function handleLayoutNodeClick(layoutNode: ParsedHtmlLayoutNode) {
  preview.value?.focusLayoutNode(layoutNode)
}

/**
 * 요소 목록 hover 대상을 미리보기로 전달
 *
 * @param element hover 중인 편집 요소
 * @returns 없음
 */
function handleElementListHover(element: ParsedHtmlEditableElement) {
  hoveredLayoutNodeId.value = ''
  hoveredElementId.value = element.id
}

/**
 * 구조 목록 hover 대상을 미리보기로 전달
 *
 * @param layoutNode hover 중인 레이아웃 노드
 * @returns 없음
 */
function handleLayoutNodeHover(layoutNode: ParsedHtmlLayoutNode) {
  hoveredElementId.value = ''
  hoveredLayoutNodeId.value = layoutNode.id
}

/** 인스펙터 hover 상태 초기화 */
function clearInspectorHover() {
  hoveredElementId.value = ''
  hoveredLayoutNodeId.value = ''
}

/**
 * 인스펙터 구조 드래그 시작 상태 저장
 *
 * @param layoutNode 드래그를 시작한 레이아웃 노드
 * @returns 없음
 */
function handleLayoutDragStart(layoutNode: ParsedHtmlLayoutNode) {
  selectedLayoutNodeId.value = layoutNode.id
  draggedLayoutNodeId.value = layoutNode.id
}

/** 인스펙터 구조 드래그 상태 초기화 */
function handleLayoutDragEnd() {
  draggedLayoutNodeId.value = ''
}

/**
 * 인스펙터 구조 이동을 iframe 편집 흐름으로 전달
 *
 * @param targetNodeId 드롭 기준 구조 노드 id
 * @param position 기준 구조 노드 앞 또는 뒤
 * @returns 없음
 */
function moveDraggedLayoutNode(targetNodeId: string, position: HtmlLayoutMovePosition) {
  preview.value?.moveDraggedLayoutNode(targetNodeId, position)
}
</script>

<style src="./html-document-editor/html-document-editor.css"></style>
