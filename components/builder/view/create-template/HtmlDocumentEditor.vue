<template>
  <section class="html-editor-screen">
    <div
      v-if="currentDocument"
      ref="editorLayout"
      class="html-editor-layout"
      :class="{
        'show-element-list': showElementList,
        'show-ai-chat': showAiChat,
        'is-ai-loading': isAiRequesting
      }"
      :style="panelGridStyle"
    >
      <HtmlEditorInspector
        v-if="showElementList"
        v-model:mode="inspectorMode"
        :document="currentDocument"
        :layout-only="showAiChat"
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

      <div
        v-if="showElementList"
        class="html-editor-resize-handle is-start"
        :class="{ 'is-active': activePanelResize === 'start' }"
        role="separator"
        aria-label="왼쪽 패널 너비 조절"
        aria-orientation="vertical"
        tabindex="0"
        @pointerdown="startPanelResize('start', $event)"
        @keydown.left.prevent="resizePanelWithKeyboard('start', -1)"
        @keydown.right.prevent="resizePanelWithKeyboard('start', 1)"
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

      <div
        v-if="showAiChat"
        class="html-editor-resize-handle is-end"
        :class="{ 'is-active': activePanelResize === 'end' }"
        role="separator"
        aria-label="AI 수정 패널 너비 조절"
        aria-orientation="vertical"
        tabindex="0"
        @pointerdown="startPanelResize('end', $event)"
        @keydown.left.prevent="resizePanelWithKeyboard('end', -1)"
        @keydown.right.prevent="resizePanelWithKeyboard('end', 1)"
      />

      <HtmlEditorAiChat
        v-if="showAiChat"
        :selected-layout-node="selectedLayoutNode"
        :selected-outer-html-length="selectedLayoutNodeOuterHtml.length"
        @close="closeAiChat"
        @applied="handleAiLayoutNodeApplied"
      />

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
import { getHtmlLayoutNodeOuterHtml } from '~/services/html/parseHtmlDocument'

type HtmlEditorPreviewExposed = {
  focusEditableElement: (element: ParsedHtmlEditableElement) => void
  focusLayoutNode: (layoutNode: ParsedHtmlLayoutNode) => void
  moveDraggedLayoutNode: (targetNodeId: string, position: HtmlLayoutMovePosition) => void
}

type HtmlEditorPanelSide = 'start' | 'end'

const PANEL_RESIZE_LIMITS = {
  start: { default: 340, min: 280, max: 520 },
  end: { default: 380, min: 320, max: 560 }
} as const
const PANEL_RESIZE_HANDLE_WIDTH = 8
const PANEL_RESIZE_STEP = 16
const PREVIEW_MIN_WIDTH = 480

const builderEditor = useBuilderEditor()
const builderView = useBuilderView()
const htmlEditChat = useHtmlEditChat()
const preview = ref<HtmlEditorPreviewExposed | null>(null)
const editorLayout = ref<HTMLElement | null>(null)
const showElementList = ref(true)
const showAiChat = ref(false)
const inspectorPanelWidth = ref<number | null>(null)
const aiChatPanelWidth = ref<number | null>(null)
const activePanelResize = ref<HtmlEditorPanelSide | null>(null)
const inspectorMode = ref<HtmlInspectorMode>('elements')
const inspectorModeBeforeAi = ref<HtmlInspectorMode>('elements')
const selectedLayoutNodeId = ref('')
const draggedLayoutNodeId = ref('')
const hoveredElementId = ref('')
const hoveredLayoutNodeId = ref('')
let resizeStartX = 0
let resizeStartWidth = 0
let resizePointerId: number | null = null
let resizeHandleElement: HTMLElement | null = null

/** HTML 편집 AI 요청 진행 여부 */
const isAiRequesting = computed(() => htmlEditChat.isRequesting.value)

/** 현재 편집 중인 HTML 문서 */
const currentDocument = computed(() => builderEditor.currentDocument)

/** AI 편집 대상으로 선택된 구조 노드 */
const selectedLayoutNode = computed(() => (
  currentDocument.value?.layoutNodes.find((node) => node.id === selectedLayoutNodeId.value) || null
))

/** AI 요청과 노드 크기 안내에 사용할 선택 노드 outerHTML */
const selectedLayoutNodeOuterHtml = computed(() => {
  if (!currentDocument.value || !selectedLayoutNode.value) return ''

  return getHtmlLayoutNodeOuterHtml(currentDocument.value, selectedLayoutNode.value.id) || ''
})

/** 사용자가 조절한 좌우 패널 너비를 CSS grid 변수로 전달 */
const panelGridStyle = computed(() => ({
  '--html-editor-inspector-width': inspectorPanelWidth.value === null
    ? undefined
    : `${inspectorPanelWidth.value}px`,
  '--html-editor-chat-width': aiChatPanelWidth.value === null
    ? undefined
    : `${aiChatPanelWidth.value}px`
}))

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

/**
 * 조절 대상 패널의 현재 렌더링 너비 조회
 *
 * @param side 조절할 패널 방향
 * @returns 현재 패널 너비
 */
function getPanelWidth(side: HtmlEditorPanelSide) {
  const selector = side === 'start' ? '.element-list-panel' : '.html-editor-chat-panel'
  const panel = editorLayout.value?.querySelector<HTMLElement>(selector)

  return panel?.getBoundingClientRect().width ?? PANEL_RESIZE_LIMITS[side].default
}

/**
 * 중앙 HTML 편집 영역의 최소 너비를 보장하는 패널 최대 너비 계산
 *
 * @param side 조절할 패널 방향
 * @returns 현재 화면에서 허용되는 최대 패널 너비
 */
function getPanelMaximumWidth(side: HtmlEditorPanelSide) {
  const limits = PANEL_RESIZE_LIMITS[side]
  const layoutWidth = editorLayout.value?.getBoundingClientRect().width

  if (!layoutWidth) return limits.max

  const isBothPanelsVisible = showElementList.value && showAiChat.value
  const oppositeSide: HtmlEditorPanelSide = side === 'start' ? 'end' : 'start'
  const oppositePanelWidth = isBothPanelsVisible ? getPanelWidth(oppositeSide) : 0
  const handleWidth = isBothPanelsVisible
    ? PANEL_RESIZE_HANDLE_WIDTH * 2
    : PANEL_RESIZE_HANDLE_WIDTH
  const availableWidth = layoutWidth - PREVIEW_MIN_WIDTH - oppositePanelWidth - handleWidth

  return Math.min(limits.max, Math.max(limits.min, availableWidth))
}

/**
 * 패널 너비를 방향별 최소·최대 범위 안에서 반영
 *
 * @param side 조절할 패널 방향
 * @param width 반영할 패널 너비
 * @returns 없음
 */
function setPanelWidth(side: HtmlEditorPanelSide, width: number) {
  const minimumWidth = PANEL_RESIZE_LIMITS[side].min
  const maximumWidth = getPanelMaximumWidth(side)
  const nextWidth = Math.min(maximumWidth, Math.max(minimumWidth, width))

  if (side === 'start') {
    inspectorPanelWidth.value = nextWidth
    return
  }

  aiChatPanelWidth.value = nextWidth
}

/**
 * 패널 구분선 pointer 이동에 따른 너비 갱신
 *
 * @param event pointer 이동 이벤트
 * @returns 없음
 */
function handlePanelResize(event: PointerEvent) {
  if (!activePanelResize.value) return

  const pointerDelta = event.clientX - resizeStartX
  const widthDelta = activePanelResize.value === 'start' ? pointerDelta : -pointerDelta

  setPanelWidth(activePanelResize.value, resizeStartWidth + widthDelta)
}

/** 패널 드래그 리사이즈 종료 및 전역 이벤트 정리 */
function stopPanelResize() {
  if (resizeHandleElement && resizePointerId !== null && resizeHandleElement.hasPointerCapture(resizePointerId)) {
    resizeHandleElement.releasePointerCapture(resizePointerId)
  }

  activePanelResize.value = null
  resizePointerId = null
  resizeHandleElement = null
  document.body.classList.remove('html-editor-is-resizing')
  window.removeEventListener('pointermove', handlePanelResize)
  window.removeEventListener('pointerup', stopPanelResize)
  window.removeEventListener('pointercancel', stopPanelResize)
}

/**
 * 패널 구분선 pointer 드래그 시작
 *
 * @param side 조절할 패널 방향
 * @param event pointer 시작 이벤트
 * @returns 없음
 */
function startPanelResize(side: HtmlEditorPanelSide, event: PointerEvent) {
  if (window.innerWidth <= 760 || !(event.currentTarget instanceof HTMLElement)) return

  event.preventDefault()
  stopPanelResize()

  activePanelResize.value = side
  resizeStartX = event.clientX
  resizeStartWidth = getPanelWidth(side)
  resizePointerId = event.pointerId
  resizeHandleElement = event.currentTarget
  resizeHandleElement.setPointerCapture(event.pointerId)
  document.body.classList.add('html-editor-is-resizing')
  window.addEventListener('pointermove', handlePanelResize)
  window.addEventListener('pointerup', stopPanelResize)
  window.addEventListener('pointercancel', stopPanelResize)
}

/**
 * 키보드 방향키로 패널 너비 조절
 *
 * @param side 조절할 패널 방향
 * @param direction 화면 기준 이동 방향
 * @returns 없음
 */
function resizePanelWithKeyboard(side: HtmlEditorPanelSide, direction: -1 | 1) {
  const widthDelta = side === 'start'
    ? direction * PANEL_RESIZE_STEP
    : direction * -PANEL_RESIZE_STEP

  setPanelWidth(side, getPanelWidth(side) + widthDelta)
}

/** 우측 AI 채팅 패널 열기 또는 닫기 및 구조 전용 Inspector 상태 구성 */
function toggleAiChat() {
  if (isAiRequesting.value) return

  if (showAiChat.value) {
    closeAiChat()
    return
  }

  inspectorModeBeforeAi.value = inspectorMode.value
  inspectorMode.value = 'layout'
  showElementList.value = true
  showAiChat.value = true
}

/** AI 요청이 없을 때 우측 채팅 패널 닫기 */
function closeAiChat() {
  if (isAiRequesting.value) return

  showAiChat.value = false
  inspectorMode.value = inspectorModeBeforeAi.value
}

/**
 * AI 교체 후 새로 생성된 구조 노드를 다시 선택하고 미리보기로 이동
 *
 * @param layoutNodeId 적용 후 레이아웃 노드 id
 * @returns 없음
 */
function handleAiLayoutNodeApplied(layoutNodeId: string) {
  const layoutNode = currentDocument.value?.layoutNodes.find((node) => node.id === layoutNodeId)

  if (!layoutNode) {
    selectedLayoutNodeId.value = ''
    return
  }

  selectedLayoutNodeId.value = layoutNode.id
  nextTick(() => preview.value?.focusLayoutNode(layoutNode))
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

/** AI 채팅 중 좌측 구조 Inspector가 닫히지 않도록 표시 상태 유지 */
watch(showElementList, (visible) => {
  if (showAiChat.value && !visible) showElementList.value = true
})

/** 편집기 진입 시 이전 채팅 세션 초기화 및 브라우저 이탈 guard 연결 */
onMounted(() => {
  htmlEditChat.resetConversation()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

/** 편집기 종료 시 진행 중인 요청과 브라우저 이탈 guard 정리 */
onBeforeUnmount(() => {
  stopPanelResize()
  window.removeEventListener('beforeunload', handleBeforeUnload)
  htmlEditChat.cancelRequest()
})
</script>

<style src="~/assets/styles/html-document-editor.css"></style>
