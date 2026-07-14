<template>
  <main class="html-editor-preview">
    <input
      ref="imageInput"
      class="html-image-input"
      type="file"
      :accept="selectedMediaInputType === 'video' ? 'video/*' : 'image/*'"
      @change="handleImageInputChange"
    >

    <div class="html-editor-preview-toolbar">
      <div class="html-editor-preview-title">
        <button
          class="html-editor-panel-toggle"
          type="button"
          :aria-label="showElementList ? '편집 요소 숨기기' : '편집 요소 보이기'"
          :aria-pressed="showElementList"
          :disabled="aiRequesting || showAiChat"
          @click="showElementList = !showElementList"
        >
          <TcubeIcon :icon="showElementList ? 'ri-side-bar-fill' : 'ri-side-bar-line'" />
        </button>
        <strong>HTML 수정</strong>
      </div>

      <div class="html-editor-preview-title html-editor-preview-title--ai">
        <strong>AI 수정</strong>
        <button
          class="html-editor-panel-toggle"
          type="button"
          :aria-label="showAiChat ? 'AI 수정 닫기' : 'AI 수정 열기'"
          :aria-pressed="showAiChat"
          :disabled="aiRequesting"
          @click="emit('toggle-ai-chat')"
        >
          <TcubeIcon icon="ri-sparkling-2-line" />
        </button>
      </div>
    </div>

    <div ref="previewWrap" class="html-browser-preview">
      <iframe
        ref="previewFrame"
        class="html-browser-frame"
        :style="{ width: previewFrameWidth }"
        title="HTML 미리보기"
        sandbox="allow-same-origin allow-popups allow-forms"
        :srcdoc="previewHtml"
        @load="handlePreviewLoad"
      />

      <HtmlElementEditPopover
        v-if="linkMenu.visible"
        :menu="linkMenu"
        @close="closeLinkMenu"
        @edit-href="openSelectedLinkHrefEdit"
        @edit-text="startSelectedLinkTextEdit"
        @edit-media="openSelectedMediaSrcEdit"
        @apply-href="applySelectedLinkHref"
        @apply-media="applySelectedMediaSources"
        @pick-media="openMediaSourcePicker"
        @update-href="linkMenu.href = $event"
        @update-media-source="updateLinkMenuMediaSource"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import type {
  ParsedHtmlDocument,
  ParsedHtmlLayoutNode
} from '~/stores/builder'
import type { HtmlInspectorMode, HtmlLayoutMovePosition } from '~/types/builder/html-document-editor'
import HtmlElementEditPopover from './HtmlElementEditPopover.vue'
import { useBuilderEditor } from '~/composables/editor/useBuilderEditor'
import { useHtmlElementEditing } from '~/composables/editor/useHtmlElementEditing'
import { renderEditableHtmlDocument } from '~/services/html/parseHtmlDocument'

type LayoutDropAxis = 'horizontal' | 'vertical'

const builderEditor = useBuilderEditor()
const props = defineProps<{
  document: ParsedHtmlDocument
  mode: HtmlInspectorMode
  showInspector: boolean
  selectedElementId: string | null
  selectedLayoutNodeId: string
  draggedLayoutNodeId: string
  hoveredElementId: string
  hoveredLayoutNodeId: string
  frameWidth: string
  showAiChat: boolean
  aiRequesting: boolean
}>()

const emit = defineEmits<{
  'update:show-inspector': [visible: boolean]
  'update:selected-layout-node-id': [layoutNodeId: string]
  'update:dragged-layout-node-id': [layoutNodeId: string]
  'toggle-ai-chat': []
}>()

const previewFrame = ref<HTMLIFrameElement | null>(null)
const previewWrap = ref<HTMLElement | null>(null)
const pendingLayoutFocusId = ref('')
let pendingPreviewScrollPosition: { left: number, top: number } | null = null
let suppressPreviewScrollClose = false
let hoveredPreviewElement: HTMLElement | null = null

/** 부모의 인스펙터 표시 상태와 토글 동작 연결 */
const showElementList = computed({
  get: () => props.showInspector,
  set: (visible: boolean) => emit('update:show-inspector', visible)
})

/** 부모의 인스펙터 모드 */
const inspectorMode = computed(() => props.mode)

const selectedLayoutNodeId = ref(props.selectedLayoutNodeId)
const draggedLayoutNodeId = ref(props.draggedLayoutNodeId)

/** 현재 편집 중인 HTML 문서 */
const currentDocument = computed(() => props.document)

/** 현재 편집값과 편집기 스타일이 반영된 iframe HTML */
const previewHtml = computed(() => renderEditableHtmlDocument(currentDocument.value))

/** 부모가 계산한 iframe 너비 */
const previewFrameWidth = computed(() => props.frameWidth)

const {
  imageInput,
  linkMenu,
  selectedMediaInputType,
  applySelectedLinkHref,
  applySelectedMediaSources,
  closeLinkMenu,
  focusEditableElement,
  getPreviewElement,
  handleCloseMenuKeydown,
  handleEditableElementClick,
  handleImageInputChange,
  handleOuterDocumentClick,
  handlePreviewDocumentClick: handlePreviewElementDocumentClick,
  handlePreviewImagePointerDown,
  openMediaSourcePicker,
  openSelectedLinkHrefEdit,
  openSelectedMediaSrcEdit,
  resetElementEditing,
  restorePendingImageMenu,
  startSelectedLinkTextEdit,
  updateLinkMenuMediaSource
} = useHtmlElementEditing({
  currentDocument,
  inspectorMode,
  previewFrame,
  previewWrap,
  scrollPreviewElementIntoView
})

/**
 * iframe 미리보기 로드가 끝난 뒤 편집 가능한 요소에 클릭/키보드 이벤트를 연결
 */
function handlePreviewLoad() {
  const frameDocument = previewFrame.value?.contentDocument

  if (!frameDocument) return

  frameDocument.addEventListener('click', handlePreviewLayoutClick, true)
  frameDocument.addEventListener('click', handlePreviewDocumentClick)
  frameDocument.addEventListener('pointerdown', handlePreviewImagePointerDown, true)
  frameDocument.addEventListener('pointermove', handlePreviewPointerMove)
  frameDocument.addEventListener('keydown', handleCloseMenuKeydown)
  frameDocument.addEventListener('scroll', handlePreviewScroll, true)
  frameDocument.addEventListener('dragstart', handlePreviewLayoutDragStart)
  frameDocument.addEventListener('dragover', handlePreviewLayoutDragOver)
  frameDocument.addEventListener('drop', handlePreviewLayoutDrop)
  frameDocument.addEventListener('dragend', handlePreviewLayoutDragEnd)
  frameDocument.documentElement.addEventListener('pointerleave', clearPreviewHover)
  frameDocument.documentElement.addEventListener('dragleave', handlePreviewLayoutDragLeave)

  frameDocument.querySelectorAll<HTMLElement>('[data-tcube-editable-id]').forEach((element) => {
    element.addEventListener('click', (event) => {
      const clickedElement = event.target instanceof HTMLElement ? event.target : element

      if (inspectorMode.value === 'layout') {
        event.preventDefault()
        event.stopPropagation()
        selectPreviewLayoutNode(clickedElement)
        return
      }

      handleEditableElementClick(element, event)
    })
  })

  hoveredPreviewElement = null
  syncPreviewInspectorMode()
  syncPreviewSelection()
  if (!restorePendingPreviewScrollPosition()) {
    focusSelectedLayoutNodeAfterPreviewRender()
  }
  restorePendingImageMenu()
}

/**
 * iframe 미리보기의 현재 스크롤 좌표 조회
 *
 * @returns 현재 가로/세로 스크롤 좌표 또는 조회 불가 시 null
 */
function getPreviewScrollPosition(): { left: number, top: number } | null {
  const frameDocument = previewFrame.value?.contentDocument
  const frameWindow = previewFrame.value?.contentWindow

  if (!frameDocument || !frameWindow) return null

  return {
    left: frameWindow.scrollX || frameDocument.documentElement.scrollLeft || frameDocument.body.scrollLeft || 0,
    top: frameWindow.scrollY || frameDocument.documentElement.scrollTop || frameDocument.body.scrollTop || 0
  }
}

/**
 * iframe 리렌더링 완료 후 저장된 미리보기 스크롤 좌표 복원
 *
 * @returns 복원할 좌표 존재 여부
 */
function restorePendingPreviewScrollPosition(): boolean {
  const frameWindow = previewFrame.value?.contentWindow
  const scrollPosition = pendingPreviewScrollPosition

  if (!frameWindow || !scrollPosition) return false

  pendingPreviewScrollPosition = null
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      frameWindow.scrollTo({
        left: scrollPosition.left,
        top: scrollPosition.top,
        behavior: 'auto'
      })
    })
  })

  return true
}

/** iframe 문서에 현재 인스펙터 모드를 표시해 모드별 강조 스타일 동기화 */
function syncPreviewInspectorMode() {
  const frameDocument = previewFrame.value?.contentDocument

  if (!frameDocument) return

  frameDocument.documentElement.dataset.tcubeInspectorMode = inspectorMode.value
  frameDocument.querySelectorAll<HTMLElement>('[data-tcube-layout-id]').forEach((layoutElement) => {
    const resolvedLayoutElement = resolvePreviewLayoutElement(layoutElement)

    layoutElement.draggable = inspectorMode.value === 'layout' && resolvedLayoutElement === layoutElement
  })

  if (inspectorMode.value !== 'layout') {
    draggedLayoutNodeId.value = ''
    clearPreviewLayoutDragState()
  }
}

/**
 * iframe 본문 hover 대상을 현재 인스펙터 모드에 맞춰 강조
 *
 * @param event iframe 문서에서 발생한 pointermove 이벤트
 * @returns 없음
 */
function handlePreviewPointerMove(event: PointerEvent) {
  const targetElement = event.target as HTMLElement | null
  const hoverElement = inspectorMode.value === 'elements'
    ? targetElement?.closest<HTMLElement>('[data-tcube-editable-id]') || null
    : resolvePreviewLayoutElement(targetElement)

  setPreviewHover(hoverElement)
}

/**
 * 링크 내부에서는 anchor를 우선하고 유일한 자식 구조는 형제가 생기는 상위 단위까지 승격
 *
 * @param targetElement iframe 내부 이벤트 대상 요소
 * @returns 구조 편집 대상으로 사용할 레이아웃 요소 또는 null
 */
function resolvePreviewLayoutElement(targetElement: HTMLElement | null) {
  if (!targetElement) return null

  let layoutElement = targetElement.closest<HTMLElement>('a[data-tcube-layout-id]')
    || targetElement.closest<HTMLElement>('[data-tcube-layout-id]')

  while (layoutElement) {
    const parentElement = layoutElement.parentElement

    if (!parentElement?.dataset.tcubeLayoutId || parentElement.children.length !== 1) break

    layoutElement = parentElement
  }

  return layoutElement
}

/**
 * 구조 모드의 iframe 레이아웃 드래그 시작 처리
 *
 * @param event iframe 문서에서 발생한 dragstart 이벤트
 * @returns 없음
 */
function handlePreviewLayoutDragStart(event: DragEvent) {
  if (inspectorMode.value !== 'layout') return

  const targetElement = event.target as HTMLElement | null
  const layoutElement = resolvePreviewLayoutElement(targetElement)
  const layoutNode = currentDocument.value?.layoutNodes.find((node) => {
    return node.id === layoutElement?.dataset.tcubeLayoutId
  })

  if (!layoutNode) {
    event.preventDefault()
    return
  }

  event.stopPropagation()
  event.dataTransfer?.setData('text/plain', layoutNode.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'

  handleLayoutDragStart(layoutNode)
}

/**
 * 구조 모드의 iframe 드롭 가능 대상 및 앞/뒤 위치 표시
 *
 * @param event iframe 문서에서 발생한 dragover 이벤트
 * @returns 없음
 */
function handlePreviewLayoutDragOver(event: DragEvent) {
  if (inspectorMode.value !== 'layout' || !draggedLayoutNodeId.value) return

  const dropTarget = findPreviewLayoutDropTarget(event.target as HTMLElement | null)

  clearPreviewLayoutDropPosition()
  if (!dropTarget) return

  event.preventDefault()
  event.stopPropagation()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'

  const dropAxis = getLayoutDropAxisByElement(dropTarget)

  dropTarget.dataset.tcubeLayoutDropAxis = dropAxis
  dropTarget.dataset.tcubeLayoutDropPosition = getLayoutDropPositionByElement(event, dropTarget, dropAxis)
}

/**
 * iframe 바깥으로 드래그 포인터가 나갈 때 현재 드롭 위치 강조 제거
 *
 * @param event iframe documentElement에서 발생한 dragleave 이벤트
 * @returns 없음
 */
function handlePreviewLayoutDragLeave(event: DragEvent) {
  const currentTarget = event.currentTarget as HTMLElement | null
  const relatedTarget = event.relatedTarget as Node | null

  if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) return

  clearPreviewLayoutDropPosition()
}

/**
 * 구조 모드의 iframe 레이아웃 드롭 처리
 *
 * @param event iframe 문서에서 발생한 drop 이벤트
 * @returns 없음
 */
function handlePreviewLayoutDrop(event: DragEvent) {
  if (inspectorMode.value !== 'layout' || !draggedLayoutNodeId.value) return

  const dropTarget = findPreviewLayoutDropTarget(event.target as HTMLElement | null)
  const targetNodeId = dropTarget?.dataset.tcubeLayoutId

  if (!dropTarget || !targetNodeId) return

  event.preventDefault()
  event.stopPropagation()
  moveDraggedLayoutNode(targetNodeId, getLayoutDropPositionByElement(event, dropTarget))
}

/** iframe 레이아웃 드래그 종료 시 공통 드래그 상태 초기화 */
function handlePreviewLayoutDragEnd() {
  handleLayoutDragEnd()
}

/**
 * 드래그 중인 노드와 같은 부모를 가진 가장 가까운 iframe 드롭 대상 조회
 *
 * @param targetElement dragover/drop 이벤트가 발생한 요소
 * @returns 드롭 가능한 레이아웃 요소 또는 null
 */
function findPreviewLayoutDropTarget(targetElement: HTMLElement | null) {
  let layoutElement = resolvePreviewLayoutElement(targetElement)

  while (layoutElement) {
    const layoutNode = currentDocument.value?.layoutNodes.find((node) => {
      return node.id === layoutElement?.dataset.tcubeLayoutId
    })

    if (layoutNode && canDropLayoutNode(layoutNode)) return layoutElement

    layoutElement = layoutElement.parentElement?.closest<HTMLElement>('[data-tcube-layout-id]') || null
  }

  return null
}

/** 드래그 중 이동 가능한 형제 레이아웃 범위와 원본 노드 강조 */
function showPreviewLayoutDropRange() {
  const frameDocument = previewFrame.value?.contentDocument
  const draggedNode = currentDocument.value?.layoutNodes.find((node) => node.id === draggedLayoutNodeId.value)

  if (!frameDocument || !draggedNode) return

  clearPreviewLayoutDragState()

  frameDocument.querySelectorAll<HTMLElement>('[data-tcube-layout-id]').forEach((layoutElement) => {
    const layoutNode = currentDocument.value?.layoutNodes.find((node) => {
      return node.id === layoutElement.dataset.tcubeLayoutId
    })

    if (!layoutNode) return

    if (layoutNode.id === draggedNode.id) {
      layoutElement.dataset.tcubeLayoutDragging = 'true'
    } else if (layoutNode.parentSelector === draggedNode.parentSelector) {
      layoutElement.dataset.tcubeLayoutDropAllowed = 'true'
    }
  })
}

/** 현재 iframe 드롭 위치 강조만 제거 */
function clearPreviewLayoutDropPosition() {
  previewFrame.value?.contentDocument
    ?.querySelectorAll<HTMLElement>('[data-tcube-layout-drop-position]')
    .forEach((layoutElement) => {
      delete layoutElement.dataset.tcubeLayoutDropAxis
      delete layoutElement.dataset.tcubeLayoutDropPosition
    })
}

/** iframe의 레이아웃 드래그 관련 강조 상태 전체 제거 */
function clearPreviewLayoutDragState() {
  const frameDocument = previewFrame.value?.contentDocument

  if (!frameDocument) return

  frameDocument.querySelectorAll<HTMLElement>(
    '[data-tcube-layout-dragging], [data-tcube-layout-drop-allowed], [data-tcube-layout-drop-position], [data-tcube-layout-drop-axis]'
  ).forEach((layoutElement) => {
    delete layoutElement.dataset.tcubeLayoutDragging
    delete layoutElement.dataset.tcubeLayoutDropAllowed
    delete layoutElement.dataset.tcubeLayoutDropAxis
    delete layoutElement.dataset.tcubeLayoutDropPosition
  })
}

/**
 * 사용자 스크롤에서는 팝업을 닫고 이미지 복원용 스크롤은 유지
 *
 * @returns 없음
 */
function handlePreviewScroll() {
  if (suppressPreviewScrollClose) return

  closeLinkMenu()
}

/**
 * 미리보기 요소를 화면 중앙으로 이동하고 스크롤 이벤트 정리 후 후속 작업 실행
 *
 * @param previewElement 이동할 iframe 내부 요소
 * @param onScrolled 스크롤 완료 후 실행할 작업
 * @returns 없음
 */
function scrollPreviewElementIntoView(previewElement: HTMLElement, onScrolled: () => void) {
  suppressPreviewScrollClose = true
  previewElement.scrollIntoView({ block: 'center', inline: 'center' })

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      suppressPreviewScrollClose = false
      onScrolled()
    })
  })
}

/**
 * 구조 모드 클릭을 편집 요소의 bubble 이벤트보다 먼저 처리
 *
 * @param event iframe 문서에서 발생한 click 이벤트
 * @returns 없음
 */
function handlePreviewLayoutClick(event: MouseEvent) {
  if (inspectorMode.value !== 'layout') return

  const layoutElement = resolvePreviewLayoutElement(event.target as HTMLElement | null)

  event.preventDefault()
  event.stopImmediatePropagation()
  selectPreviewLayoutNode(layoutElement)
}

/**
 * iframe 문서의 빈 영역 또는 편집 요소 클릭을 처리
 * 개별 요소 이벤트가 누락되는 경우에도 이미지/링크 툴바를 열 수 있도록 보정
 *
 * @param event iframe 문서에서 발생한 click 이벤트
 */
function handlePreviewDocumentClick(event: MouseEvent) {
  const clickedElement = event.target as HTMLElement | null

  if (inspectorMode.value === 'layout') {
    event.preventDefault()
    event.stopPropagation()
    selectPreviewLayoutNode(clickedElement)
    return
  }

  handlePreviewElementDocumentClick(event)
}

/**
 * 구조 모드에서 클릭한 미리보기 위치의 레이아웃 노드만 선택
 *
 * @param clickedElement iframe 내부에서 클릭된 요소
 * @returns 없음
 */
function selectPreviewLayoutNode(clickedElement: HTMLElement | null) {
  resetElementEditing()
  builderEditor.selectElement(null)

  const layoutElement = resolvePreviewLayoutElement(clickedElement)

  if (!layoutElement?.dataset.tcubeLayoutId) return

  selectedLayoutNodeId.value = layoutElement.dataset.tcubeLayoutId
  syncPreviewSelection()
}

/**
 * store의 선택 요소 상태를 iframe 미리보기의 data 속성으로 동기화
 */
function syncPreviewSelection() {
  const frameDocument = previewFrame.value?.contentDocument

  if (!frameDocument) return

  frameDocument.querySelectorAll<HTMLElement>('[data-tcube-selected]').forEach((element) => {
    delete element.dataset.tcubeSelected
  })

  frameDocument.querySelectorAll<HTMLElement>('[data-tcube-layout-selected]').forEach((element) => {
    delete element.dataset.tcubeLayoutSelected
  })

  frameDocument.querySelectorAll<HTMLElement>('[data-tcube-layout-hierarchy]').forEach((element) => {
    delete element.dataset.tcubeLayoutHierarchy
    element.style.removeProperty('--tcube-layout-hierarchy-color')
  })

  if (inspectorMode.value === 'layout') {
    if (!selectedLayoutNodeId.value) return

    const selectedLayoutElement = frameDocument.querySelector<HTMLElement>(
      `[data-tcube-layout-id="${selectedLayoutNodeId.value}"]`
    )

    if (selectedLayoutElement) {
      selectedLayoutElement.dataset.tcubeLayoutSelected = 'true'
    }

    return
  }

  if (!props.selectedElementId) return

  const selectedPreviewElement = frameDocument.querySelector<HTMLElement>(
    `[data-tcube-editable-id="${props.selectedElementId}"]`
  )

  if (selectedPreviewElement) {
    selectedPreviewElement.dataset.tcubeSelected = 'true'
  }
}

/**
 * iframe 렌더링이 끝난 뒤 선택된 레이아웃 노드 위치로 포커싱
 */
function focusSelectedLayoutNodeAfterPreviewRender() {
  const focusId = pendingLayoutFocusId.value || selectedLayoutNodeId.value

  if (!focusId) return

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const frameDocument = previewFrame.value?.contentDocument
      const frameWindow = previewFrame.value?.contentWindow
      const selectedLayoutElement = frameDocument?.querySelector<HTMLElement>(
        `[data-tcube-layout-id="${focusId}"]`
      )

      if (!selectedLayoutElement) return

      selectedLayoutElement.dataset.tcubeLayoutSelected = 'true'
      selectedLayoutElement.scrollIntoView({ block: 'start', inline: 'nearest' })

      const elementRect = selectedLayoutElement.getBoundingClientRect()
      const currentScrollY = frameWindow?.scrollY || frameDocument?.documentElement.scrollTop || 0
      const targetScrollY = currentScrollY + elementRect.top

      frameWindow?.scrollTo({
        top: Math.max(0, targetScrollY),
        behavior: 'auto'
      })
      previewFrame.value?.scrollIntoView({ block: 'nearest', inline: 'center' })
      pendingLayoutFocusId.value = ''
    })
  })
}

/**
 * iframe 미리보기 hover 강조 제거
 *
 * @returns 없음
 */
function clearPreviewHover() {
  setPreviewHover(null)
}

/**
 * iframe 미리보기 요소 hover 강조 상태 동기화
 *
 * @param previewElement 강조할 미리보기 요소 또는 null
 * @returns 없음
 */
function setPreviewHover(previewElement: HTMLElement | null) {
  const frameDocument = previewFrame.value?.contentDocument

  if (!frameDocument) return
  if (hoveredPreviewElement === previewElement) return

  frameDocument.querySelectorAll<HTMLElement>('[data-tcube-hovered]').forEach((element) => {
    delete element.dataset.tcubeHovered
  })

  hoveredPreviewElement = previewElement

  if (previewElement) {
    previewElement.dataset.tcubeHovered = 'true'
  }
}

/**
 * HTML 구조 목록에서 레이아웃 노드 선택 및 미리보기 위치 이동
 *
 * @param layoutNode 선택할 레이아웃 노드
 */
function handleLayoutNodeClick(layoutNode: ParsedHtmlLayoutNode) {
  if (inspectorMode.value !== 'layout') return

  selectedLayoutNodeId.value = layoutNode.id
  builderEditor.selectElement(null)
  closeLinkMenu()
  clearPreviewHover()
  syncPreviewSelection()
  scrollPreviewLayoutNodeIntoView(layoutNode.id)
}

/**
 * 구조 목록에서 선택한 레이아웃 노드를 iframe 미리보기 세로 중앙으로 이동
 *
 * @param layoutNodeId 이동할 레이아웃 노드 id
 * @returns 없음
 */
function scrollPreviewLayoutNodeIntoView(layoutNodeId: string) {
  const frameDocument = previewFrame.value?.contentDocument
  const frameWindow = previewFrame.value?.contentWindow
  const layoutElement = frameDocument?.querySelector<HTMLElement>(
    `[data-tcube-layout-id="${layoutNodeId}"]`
  )

  if (!frameDocument || !frameWindow || !layoutElement) return

  const elementRect = layoutElement.getBoundingClientRect()
  const currentScrollTop = frameWindow.scrollY || frameDocument.documentElement.scrollTop || 0
  const targetScrollTop = currentScrollTop
    + elementRect.top
    + (elementRect.height / 2)
    - (frameWindow.innerHeight / 2)

  frameWindow.scrollTo({
    top: Math.max(0, targetScrollTop),
    left: frameWindow.scrollX,
    behavior: 'smooth'
  })
}

/**
 * 레이아웃 노드 드래그 시작 상태 저장
 *
 * @param layoutNode 드래그를 시작한 레이아웃 노드
 */
function handleLayoutDragStart(layoutNode: ParsedHtmlLayoutNode) {
  if (inspectorMode.value !== 'layout') return

  draggedLayoutNodeId.value = layoutNode.id
  selectedLayoutNodeId.value = layoutNode.id
  closeLinkMenu()
  clearPreviewHover()
  showPreviewLayoutDropRange()
}

/**
 * 레이아웃 노드 드래그 종료 상태 초기화
 */
function handleLayoutDragEnd() {
  draggedLayoutNodeId.value = ''
  clearPreviewLayoutDragState()
}

/**
 * 현재 드래그 노드를 지정한 구조 노드 앞 또는 뒤로 이동
 *
 * @param targetNodeId 드롭 기준 구조 노드 id
 * @param position 기준 구조 노드 앞 또는 뒤
 * @returns 없음
 */
function moveDraggedLayoutNode(targetNodeId: string, position: HtmlLayoutMovePosition) {
  const targetNode = currentDocument.value?.layoutNodes.find((node) => node.id === targetNodeId)

  if (!draggedLayoutNodeId.value || !targetNode || !canDropLayoutNode(targetNode)) return

  pendingPreviewScrollPosition = getPreviewScrollPosition()
  const movedLayoutNodeId = builderEditor.moveCurrentDocumentLayoutNode(
    draggedLayoutNodeId.value,
    targetNodeId,
    position
  )

  handleLayoutDragEnd()

  if (movedLayoutNodeId) {
    selectedLayoutNodeId.value = movedLayoutNodeId
    closeLinkMenu()
    nextTick(() => {
      syncPreviewSelection()
    })
    return
  }

  pendingPreviewScrollPosition = null
}

/**
 * 레이아웃 노드 드롭 가능 여부 확인
 *
 * @param layoutNode 드롭 대상 레이아웃 노드
 * @returns 같은 부모의 다른 노드이면 true
 */
function canDropLayoutNode(layoutNode: ParsedHtmlLayoutNode) {
  if (!draggedLayoutNodeId.value) return false
  if (draggedLayoutNodeId.value === layoutNode.id) return false

  const draggedNode = currentDocument.value?.layoutNodes.find((node) => node.id === draggedLayoutNodeId.value)

  return Boolean(draggedNode && draggedNode.parentSelector === layoutNode.parentSelector)
}

/**
 * 지정한 레이아웃 요소의 배치 축과 중앙을 기준으로 드롭 앞/뒤 위치 계산
 *
 * @param event 드롭 이벤트
 * @param targetElement 드롭 기준 레이아웃 요소
 * @param dropAxis 드롭 위치 계산 축
 * @returns 기준 노드 앞 또는 뒤 위치
 */
function getLayoutDropPositionByElement(
  event: DragEvent,
  targetElement: HTMLElement,
  dropAxis: LayoutDropAxis = getLayoutDropAxisByElement(targetElement)
): 'before' | 'after' {
  const rect = targetElement.getBoundingClientRect()

  if (dropAxis === 'horizontal') {
    return event.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
  }

  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

/**
 * 부모의 CSS 배치 방식과 형제 위치를 기준으로 드롭 표시 축 판별
 *
 * @param targetElement 드롭 기준 레이아웃 요소
 * @returns 좌우 배치이면 horizontal, 상하 배치이면 vertical
 */
function getLayoutDropAxisByElement(targetElement: HTMLElement): LayoutDropAxis {
  const parentElement = targetElement.parentElement
  const frameWindow = targetElement.ownerDocument.defaultView

  if (!parentElement || !frameWindow) return 'vertical'

  const parentStyle = frameWindow.getComputedStyle(parentElement)

  if (parentStyle.display === 'flex' || parentStyle.display === 'inline-flex') {
    return parentStyle.flexDirection.startsWith('row') ? 'horizontal' : 'vertical'
  }

  if (parentStyle.display === 'grid' || parentStyle.display === 'inline-grid') {
    const targetRect = targetElement.getBoundingClientRect()
    const hasSiblingOnSameRow = Array.from(parentElement.children).some((childElement) => {
      if (!(childElement instanceof frameWindow.HTMLElement) || childElement === targetElement) return false

      const siblingRect = childElement.getBoundingClientRect()
      const verticalOverlap = Math.min(targetRect.bottom, siblingRect.bottom)
        - Math.max(targetRect.top, siblingRect.top)

      return verticalOverlap > Math.min(targetRect.height, siblingRect.height) / 2
    })

    return hasSiblingOnSameRow ? 'horizontal' : 'vertical'
  }

  return 'vertical'
}

defineExpose({
  focusEditableElement,
  focusLayoutNode: handleLayoutNodeClick,
  moveDraggedLayoutNode
})

/** 부모의 선택 레이아웃 변경을 iframe 로컬 상태에 반영 */
watch(
  () => props.selectedLayoutNodeId,
  (layoutNodeId) => {
    selectedLayoutNodeId.value = layoutNodeId
    syncPreviewSelection()
  }
)

/** iframe의 선택 레이아웃 변경을 부모에 전달 */
watch(selectedLayoutNodeId, (layoutNodeId) => {
  if (layoutNodeId !== props.selectedLayoutNodeId) {
    emit('update:selected-layout-node-id', layoutNodeId)
  }
})

/** 부모의 드래그 레이아웃 변경을 iframe 강조 상태에 반영 */
watch(
  () => props.draggedLayoutNodeId,
  (layoutNodeId) => {
    draggedLayoutNodeId.value = layoutNodeId

    if (layoutNodeId) {
      closeLinkMenu()
      clearPreviewHover()
      showPreviewLayoutDropRange()
      return
    }

    clearPreviewLayoutDragState()
  }
)

/** iframe의 드래그 레이아웃 변경을 부모에 전달 */
watch(draggedLayoutNodeId, (layoutNodeId) => {
  if (layoutNodeId !== props.draggedLayoutNodeId) {
    emit('update:dragged-layout-node-id', layoutNodeId)
  }
})

/** 인스펙터 hover 대상을 iframe 요소 강조 상태로 반영 */
watch(
  [
    () => props.hoveredElementId,
    () => props.hoveredLayoutNodeId
  ],
  ([elementId, layoutNodeId]) => {
    if (elementId && inspectorMode.value === 'elements') {
      setPreviewHover(getPreviewElement(elementId))
      return
    }

    if (layoutNodeId && inspectorMode.value === 'layout') {
      const layoutElement = previewFrame.value?.contentDocument?.querySelector<HTMLElement>(
        `[data-tcube-layout-id="${layoutNodeId}"]`
      ) || null

      setPreviewHover(layoutElement)
      return
    }

    clearPreviewHover()
  }
)

/** 인스펙터 탭 전환 시 반대 모드의 선택 및 편집 상태 초기화 */
watch(inspectorMode, (mode) => {
  resetElementEditing()
  syncPreviewInspectorMode()
  clearPreviewHover()

  if (mode === 'layout') {
    builderEditor.selectElement(null)
  } else {
    selectedLayoutNodeId.value = ''
  }

  syncPreviewSelection()
})

/** iframe HTML 변경 시 이전 문서 기준 편집 팝오버 닫기 */
watch(previewHtml, () => {
  closeLinkMenu()
})

/** 부모의 선택 요소 변경을 iframe 선택 강조 상태에 반영 */
watch(
  () => props.selectedElementId,
  () => {
    syncPreviewSelection()
  }
)

/** 상위 document의 팝오버 닫기 이벤트 연결 */
onMounted(() => {
  document.addEventListener('click', handleOuterDocumentClick)
  document.addEventListener('keydown', handleCloseMenuKeydown)
})

/** 상위 document에 연결한 팝오버 닫기 이벤트 해제 */
onBeforeUnmount(() => {
  document.removeEventListener('click', handleOuterDocumentClick)
  document.removeEventListener('keydown', handleCloseMenuKeydown)
})
</script>
