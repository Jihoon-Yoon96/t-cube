<template>
  <section class="html-editor-screen">
    <div
      v-if="currentDocument"
      class="html-editor-layout"
      :class="{
        'show-element-list': showElementList,
        'show-ai-chat': showAiChat,
        'is-ai-loading': isAiRequesting
      }"
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
        :show-ai-chat="showAiChat"
        :ai-requesting="isAiRequesting"
        @toggle-ai-chat="toggleAiChat"
      />

      <HtmlEditorAiChat v-if="showAiChat" @close="closeAiChat" />

      <div v-if="isAiRequesting" class="html-editor-ai-loading" role="status" aria-live="polite">
        <div>
          <TcubeIcon class="html-editor-ai-loading-icon" icon="ri-loader-4-line" />
          <strong>AI가 HTML 소스를 수정하고 있습니다</strong>
          <span>채팅 패널의 정지 버튼으로 요청을 취소할 수 있습니다.</span>
        </div>
      </div>
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
import HtmlEditorAiChat from './html-document-editor/HtmlEditorAiChat.vue'
import HtmlEditorInspector from './html-document-editor/HtmlEditorInspector.vue'
import HtmlEditorPreview from './html-document-editor/HtmlEditorPreview.vue'
import { useBuilderEditor } from '~/composables/editor/useBuilderEditor'
import { useHtmlEditChat } from '~/composables/editor/useHtmlEditChat'
import { useBuilderView } from '~/composables/view/useBuilderView'

type HtmlEditorPreviewExposed = {
  focusEditableElement: (element: ParsedHtmlEditableElement) => void
  focusLayoutNode: (layoutNode: ParsedHtmlLayoutNode) => void
  moveDraggedLayoutNode: (targetNodeId: string, position: HtmlLayoutMovePosition) => void
}

const builderEditor = useBuilderEditor()
const builderView = useBuilderView()
const htmlEditChat = useHtmlEditChat()
const preview = ref<HtmlEditorPreviewExposed | null>(null)
const showElementList = ref(true)
const showAiChat = ref(false)
const inspectorMode = ref<HtmlInspectorMode>('elements')
const selectedLayoutNodeId = ref('')
const draggedLayoutNodeId = ref('')
const hoveredElementId = ref('')
const hoveredLayoutNodeId = ref('')

/** HTML 편집 AI 요청 진행 여부 */
const isAiRequesting = computed(() => htmlEditChat.isRequesting.value)

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

/** 우측 AI 채팅 패널 열기 또는 닫기 */
function toggleAiChat() {
  if (isAiRequesting.value) return

  showAiChat.value = !showAiChat.value
  if (showAiChat.value) showElementList.value = false
}

/** AI 요청이 없을 때 우측 채팅 패널 닫기 */
function closeAiChat() {
  if (isAiRequesting.value) return

  showAiChat.value = false
}

/**
 * 브라우저 새로고침 또는 탭 종료 시 진행 중인 AI 요청 이탈 확인 표시
 *
 * @param event 브라우저 이탈 직전 이벤트
 * @returns 없음
 */
function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!isAiRequesting.value) return

  event.preventDefault()
  event.returnValue = ''
}

/** 좌측 Inspector가 열리면 우측 AI 채팅 패널 닫기 */
watch(showElementList, (visible) => {
  if (visible) showAiChat.value = false
})

/** 우측 AI 채팅 패널이 열리면 좌측 Inspector 닫기 */
watch(showAiChat, (visible) => {
  if (visible) showElementList.value = false
})

/** 편집기 진입 시 이전 채팅 세션 초기화 및 브라우저 이탈 guard 연결 */
onMounted(() => {
  htmlEditChat.resetConversation()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

/** 편집기 종료 시 진행 중인 요청과 브라우저 이탈 guard 정리 */
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  htmlEditChat.cancelRequest()
})
</script>

<style src="~/assets/styles/html-document-editor.css"></style>
