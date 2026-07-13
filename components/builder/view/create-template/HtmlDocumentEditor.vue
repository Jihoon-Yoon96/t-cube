<template>
  <section class="html-editor-screen">
    <div
      v-if="currentDocument"
      class="html-editor-layout"
      :class="{ 'show-element-list': showElementList }"
    >
      <input
        ref="imageInput"
        class="html-image-input"
        type="file"
        :accept="selectedMediaInputType === 'video' ? 'video/*' : 'image/*'"
        @change="handleImageInputChange"
      >

      <aside v-if="showElementList" class="html-editor-panel element-list-panel">
        <div class="html-editor-panel-title">
          <strong>{{ inspectorMode === 'elements' ? '편집 요소' : 'HTML 구조' }}</strong>
          <div class="html-inspector-title-actions">
            <button
              v-if="inspectorMode === 'layout'"
              class="html-inspector-collapse-button"
              type="button"
              :aria-label="areAllLayoutNodesCollapsed ? '하위 요소 전체 펼치기' : '하위 요소 전체 접기'"
              :title="areAllLayoutNodesCollapsed ? '하위 요소 전체 펼치기' : '하위 요소 전체 접기'"
              @click="toggleAllLayoutNodes"
            >
              <TcubeIcon :icon="areAllLayoutNodesCollapsed ? 'ri-expand-diagonal-2-line' : 'ri-collapse-diagonal-2-line'" />
            </button>
            <span>{{ inspectorMode === 'elements' ? currentDocument.elements.length : currentDocument.layoutNodes.length }}개</span>
          </div>
        </div>

        <div class="html-inspector-tabs" role="tablist" aria-label="HTML inspector mode">
          <button
            class="html-inspector-tab"
            :class="{ active: inspectorMode === 'elements' }"
            type="button"
            @click="inspectorMode = 'elements'"
          >
            <TcubeIcon icon="ri-edit-box-line" />
            <span>요소</span>
          </button>
          <button
            class="html-inspector-tab"
            :class="{ active: inspectorMode === 'layout' }"
            type="button"
            @click="inspectorMode = 'layout'"
          >
            <TcubeIcon icon="ri-node-tree" />
            <span>구조</span>
          </button>
        </div>

        <div ref="elementInspectorList" v-show="inspectorMode === 'elements'" class="html-inspector-list element-node-list">
          <button
            v-for="element in currentDocument.elements"
            :key="element.id"
            class="element-list-item"
            :class="{ active: builderEditor.selectedElementId === element.id }"
            type="button"
            @click.stop="handleElementListClick(element)"
            @mouseenter="handleElementListHover(element)"
            @mouseleave="clearPreviewHover"
          >
            <TcubeIcon :icon="getElementIcon(element)" />
            <span>
              <strong>{{ element.label }}</strong>
              <small>{{ getElementPreview(element) }}</small>
            </span>
          </button>
        </div>

        <div ref="layoutInspectorList" v-if="inspectorMode === 'layout'" class="html-inspector-list layout-node-list">
          <div
            v-for="layoutNode in visibleLayoutNodes"
            :key="layoutNode.id"
            class="layout-node-item"
            :class="{
              active: selectedLayoutNodeId === layoutNode.id,
              dragging: draggedLayoutNodeId === layoutNode.id,
              droppable: canDropLayoutNode(layoutNode)
            }"
            :style="{ paddingLeft: `${10 + layoutNode.depth * 14}px` }"
            draggable="true"
            role="button"
            tabindex="0"
            @click.stop="handleLayoutNodeClick(layoutNode)"
            @dragstart="handleLayoutDragStart(layoutNode)"
            @dragend="handleLayoutDragEnd"
            @dragover.prevent="handleLayoutDragOver(layoutNode)"
            @drop.prevent="handleLayoutDrop(layoutNode, $event)"
            @mouseenter="handleLayoutNodeHover(layoutNode)"
            @mouseleave="clearPreviewHover"
            @keydown.enter.prevent="handleLayoutNodeClick(layoutNode)"
            @keydown.space.prevent="handleLayoutNodeClick(layoutNode)"
          >
            <button
              v-if="hasLayoutChildren(layoutNode)"
              class="layout-node-toggle"
              type="button"
              :aria-label="isLayoutNodeCollapsed(layoutNode) ? '하위 구조 펼치기' : '하위 구조 접기'"
              :aria-expanded="!isLayoutNodeCollapsed(layoutNode)"
              @click.stop="toggleLayoutNode(layoutNode)"
            >
              <TcubeIcon :icon="isLayoutNodeCollapsed(layoutNode) ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line'" />
            </button>
            <span v-else class="layout-node-toggle-spacer" />
            <button
              v-if="hasLayoutChildren(layoutNode)"
              class="layout-node-branch-toggle"
              type="button"
              :aria-label="areLayoutDescendantsCollapsed(layoutNode) ? '하위 구조 전체 펼치기' : '하위 구조 전체 접기'"
              :title="areLayoutDescendantsCollapsed(layoutNode) ? '하위 구조 전체 펼치기' : '하위 구조 전체 접기'"
              @click.stop="toggleLayoutDescendants(layoutNode)"
            >
              <TcubeIcon :icon="areLayoutDescendantsCollapsed(layoutNode) ? 'ri-expand-diagonal-2-line' : 'ri-collapse-diagonal-2-line'" />
            </button>
            <span class="layout-node-drag-icon" aria-hidden="true">
              <TcubeIcon icon="ri-drag-move-2-line" />
            </span>
            <span class="layout-node-summary">
              <strong>{{ layoutNode.label }}</strong>
              <small>{{ getLayoutNodePreview(layoutNode) }}</small>
            </span>
          </div>
        </div>
      </aside>

      <main class="html-editor-preview">
        <div class="html-editor-preview-toolbar">
          <div class="html-editor-preview-title">
            <button
              class="html-editor-panel-toggle"
              type="button"
              :aria-label="showElementList ? '편집 요소 숨기기' : '편집 요소 보이기'"
              :aria-pressed="showElementList"
              @click="showElementList = !showElementList"
            >
              <TcubeIcon :icon="showElementList ? 'ri-side-bar-fill' : 'ri-side-bar-line'" />
            </button>
            <strong>미리보기</strong>
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

          <div
            v-if="linkMenu.visible"
            class="html-link-edit-popover"
            :style="{ left: `${linkMenu.x}px`, top: `${linkMenu.y}px` }"
            @click.stop
            @keydown.esc.stop.prevent="closeLinkMenu"
          >
            <template v-if="linkMenu.mode === 'menu'">
              <button v-if="linkMenu.targetType === 'link' || linkMenu.targetType === 'text' || linkMenu.hasLink" type="button" @click.stop="openSelectedLinkHrefEdit">
                <TcubeIcon icon="ri-link" />
                <span>링크 수정</span>
              </button>
              <button v-if="linkMenu.targetType === 'text'" type="button" @click.stop="startSelectedLinkTextEdit">
                <TcubeIcon icon="ri-text" />
                <span>텍스트 수정</span>
              </button>
              <button v-if="linkMenu.targetType === 'image' || linkMenu.targetType === 'picture' || linkMenu.targetType === 'video'" type="button" @click.stop="openSelectedMediaSrcEdit">
                <TcubeIcon icon="ri-edit-box-line" />
                <span>{{ linkMenu.targetType === 'video' ? '비디오 수정' : '이미지 수정' }}</span>
              </button>
            </template>

            <template v-else-if="linkMenu.mode === 'href'">
              <label>
                <span>링크 주소</span>
                <input
                  v-model="linkMenu.href"
                  type="text"
                  placeholder="https://..."
                  @keydown.enter.prevent="applySelectedLinkHref"
                  @keydown.esc.prevent="closeLinkMenu"
                >
              </label>
              <div class="html-link-edit-actions">
                <button type="button" @click.stop="closeLinkMenu">취소</button>
                <button type="button" @click.stop="applySelectedLinkHref">적용</button>
              </div>
            </template>

            <template v-else-if="linkMenu.mode === 'media-src'">
              <div v-for="mediaSource in linkMenu.mediaSources" :key="mediaSource.selector" class="html-media-source-field">
                <label>
                  <span>{{ mediaSource.label }}<template v-if="mediaSource.media"> · {{ mediaSource.media }}</template><template v-else-if="mediaSource.mimeType"> · {{ mediaSource.mimeType }}</template></span>
                  <input
                    v-model="mediaSource.src"
                    class="html-media-source-input"
                    type="text"
                    placeholder="https://..."
                    @keydown.enter.prevent="applySelectedMediaSources"
                    @keydown.esc.prevent="closeLinkMenu"
                  >
                </label>
                <button
                  type="button"
                  :aria-label="linkMenu.targetType === 'video' ? '비디오 업로드' : '이미지 업로드'"
                  :title="linkMenu.targetType === 'video' ? '비디오 업로드' : '이미지 업로드'"
                  @click.stop="openMediaSourcePicker(mediaSource.selector)"
                >
                  <TcubeIcon icon="ri-upload-cloud-2-line" />
                  <span>{{ linkMenu.targetType === 'video' ? '비디오 업로드' : '이미지 업로드' }}</span>
                </button>
              </div>
              <div class="html-link-edit-actions">
                <button type="button" @click.stop="closeLinkMenu">취소</button>
                <button type="button" @click.stop="applySelectedMediaSources">적용</button>
              </div>
            </template>

          </div>
        </div>
      </main>
    </div>

    <div v-else class="body-placeholder">
      <span class="section-title">HTML EDITOR</span>
      <h1>편집할 HTML 문서가 없습니다</h1>
      <p>HTML 파일을 업로드하고 분석을 시작해주세요.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ParsedHtmlEditableElement, ParsedHtmlLayoutNode, ParsedHtmlMediaSource } from '~/stores/builder'
import { useBuilderEditor } from '~/composables/editor/useBuilderEditor'
import { useBuilderView } from '~/composables/view/useBuilderView'
import { renderEditableHtmlDocument } from '~/services/html/parseHtmlDocument'

const builderEditor = useBuilderEditor()
const builderView = useBuilderView()
const previewFrame = ref<HTMLIFrameElement | null>(null)
const previewWrap = ref<HTMLElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const elementInspectorList = ref<HTMLElement | null>(null)
const layoutInspectorList = ref<HTMLElement | null>(null)
const showElementList = ref(false)
const inspectorMode = ref<'elements' | 'layout'>('elements')
const selectedLayoutNodeId = ref('')
const draggedLayoutNodeId = ref('')
const pendingLayoutFocusId = ref('')
const collapsedLayoutNodeIds = ref<string[]>([])
const selectedImageElementId = ref('')
const selectedMediaSourceSelector = ref('')
const selectedMediaInputType = ref<'image' | 'video'>('image')
let pendingImageMenuElementId = ''
let suppressPreviewScrollClose = false
let hoveredPreviewElement: HTMLElement | null = null
const linkMenu = reactive({
  visible: false,
  mode: 'menu' as 'menu' | 'href' | 'media-src',
  targetType: 'link' as 'link' | 'text' | 'image' | 'picture' | 'video',
  hasLink: false,
  elementId: '',
  href: '',
  mediaSources: [] as ParsedHtmlMediaSource[],
  x: 0,
  y: 0
})

const currentDocument = computed(() => builderEditor.currentDocument)
const previewHtml = computed(() => currentDocument.value ? renderEditableHtmlDocument(currentDocument.value) : '')
const visibleLayoutNodes = computed(() => {
  if (!currentDocument.value) return []

  const collapsedIds = new Set(collapsedLayoutNodeIds.value)
  const nodeBySelector = new Map(currentDocument.value.layoutNodes.map((node) => [node.selector, node]))

  return currentDocument.value.layoutNodes.filter((node) => !hasCollapsedLayoutAncestor(node, collapsedIds, nodeBySelector))
})
/** 전체 접기 대상 레이아웃이 모두 접힌 상태 여부 */
const areAllLayoutNodesCollapsed = computed(() => {
  const collapsibleLayoutNodeIds = getCollapsibleLayoutNodeIds()

  return collapsibleLayoutNodeIds.length > 0
    && collapsibleLayoutNodeIds.every((nodeId) => collapsedLayoutNodeIds.value.includes(nodeId))
})
const previewFrameWidth = computed(() => {
  if (builderView.activeViewport === 'tablet') return '768px'
  if (builderView.activeViewport === 'mobile') return '390px'

  return '100%'
})

/**
 * 하위 구조를 가진 레이아웃 노드 전체 접기 또는 펼치기
 *
 * @returns 없음
 */
function toggleAllLayoutNodes() {
  if (areAllLayoutNodesCollapsed.value) {
    collapsedLayoutNodeIds.value = []
    return
  }

  collapsedLayoutNodeIds.value = getCollapsibleLayoutNodeIds()
}

/**
 * iframe 미리보기 로드가 끝난 뒤 편집 가능한 요소에 클릭/키보드 이벤트를 연결
 */
function handlePreviewLoad() {
  const frameDocument = previewFrame.value?.contentDocument

  if (!frameDocument) return

  frameDocument.addEventListener('click', handlePreviewDocumentClick)
  frameDocument.addEventListener('pointerdown', handlePreviewImagePointerDown, true)
  frameDocument.addEventListener('pointermove', handlePreviewPointerMove)
  frameDocument.addEventListener('keydown', handleCloseMenuKeydown)
  frameDocument.addEventListener('scroll', handlePreviewScroll, true)
  frameDocument.documentElement.addEventListener('pointerleave', clearPreviewHover)

  frameDocument.querySelectorAll<HTMLElement>('[data-tcube-editable-id]').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()

      const clickedElement = event.target instanceof HTMLElement ? event.target : element

      if (inspectorMode.value === 'layout') {
        selectPreviewLayoutNode(clickedElement)
        return
      }

      const clickedLink = clickedElement.closest<HTMLAnchorElement>('a')
      const elementId = element.dataset.tcubeEditableId

      if (clickedLink) {
        openAnchorToolbar(clickedLink, clickedElement, event)
        return
      }

      if (elementId) {
        selectPreviewEditableElement(elementId)
      }

      if (element.dataset.tcubeEditableType === 'text') {
        startTextEdit(element)
        return
      }

      if (element.dataset.tcubeEditableType === 'image') {
        if (isImageElement(element)) {
          openImageMenu(element, event)
          return
        }

        closeLinkMenu()
        return
      }

      if (isMediaElement(element)) {
        openMediaMenu(element, event)
        return
      }

      closeLinkMenu()
    })
  })

  hoveredPreviewElement = null
  syncPreviewInspectorMode()
  syncPreviewSelection()
  focusSelectedLayoutNodeAfterPreviewRender()
  restorePendingImageMenu()
}

/** iframe 문서에 현재 인스펙터 모드를 표시해 모드별 강조 스타일 동기화 */
function syncPreviewInspectorMode() {
  const frameDocument = previewFrame.value?.contentDocument

  if (!frameDocument) return

  frameDocument.documentElement.dataset.tcubeInspectorMode = inspectorMode.value
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
    : targetElement?.closest<HTMLElement>('[data-tcube-layout-id]') || null

  setPreviewHover(hoverElement)
}

/**
 * blur 저장으로 iframe이 교체되기 전에 클릭 대상 이미지 id를 보관
 *
 * @param event iframe 문서에서 발생한 pointerdown 이벤트
 * @returns 없음
 */
function handlePreviewImagePointerDown(event: PointerEvent) {
  if (inspectorMode.value !== 'elements') {
    pendingImageMenuElementId = ''
    return
  }

  const clickedElement = event.target as HTMLElement | null
  const imageElement = clickedElement?.closest<HTMLImageElement>(
    'img[data-tcube-editable-id][data-tcube-editable-type="image"]'
  )

  pendingImageMenuElementId = imageElement?.dataset.tcubeEditableId || ''
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
 * iframe 재로드로 소실된 이미지 클릭을 새 미리보기 요소 기준으로 복원
 *
 * @returns 없음
 */
function restorePendingImageMenu() {
  const elementId = pendingImageMenuElementId
  pendingImageMenuElementId = ''

  if (!elementId || inspectorMode.value !== 'elements') return

  const previewElement = getPreviewElement(elementId)

  if (!isImageElement(previewElement)) return

  selectPreviewEditableElement(elementId)
  scrollPreviewElementIntoView(previewElement, () => {
    if (inspectorMode.value !== 'elements') return

    const restoredPreviewElement = getPreviewElement(elementId)

    if (isImageElement(restoredPreviewElement)) {
      openImageMenuAtElement(restoredPreviewElement)
    }
  })
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

  const editableElement = clickedElement?.closest<HTMLElement>('[data-tcube-editable-id]')
  const clickedLink = clickedElement?.closest<HTMLAnchorElement>('a')

  if (isMediaElement(editableElement)) {
    event.preventDefault()
    event.stopPropagation()
    if (editableElement.dataset.tcubeEditableId) {
      selectPreviewEditableElement(editableElement.dataset.tcubeEditableId)
    }
    openMediaMenu(editableElement, event)
    return
  }

  if (clickedLink && clickedElement) {
    event.preventDefault()
    event.stopPropagation()
    openAnchorToolbar(clickedLink, clickedElement, event)
    return
  }

  if (editableElement?.dataset.tcubeEditableType === 'image' && isImageElement(editableElement)) {
    event.preventDefault()
    event.stopPropagation()
    if (editableElement.dataset.tcubeEditableId) {
      selectPreviewEditableElement(editableElement.dataset.tcubeEditableId)
    }
    openImageMenu(editableElement, event)
    return
  }

  closeLinkMenu()
}

/**
 * 구조 모드에서 클릭한 미리보기 위치의 레이아웃 노드만 선택
 *
 * @param clickedElement iframe 내부에서 클릭된 요소
 * @returns 없음
 */
function selectPreviewLayoutNode(clickedElement: HTMLElement | null) {
  pendingImageMenuElementId = ''
  closeLinkMenu()
  builderEditor.selectElement(null)

  const layoutElement = clickedElement?.closest<HTMLElement>('[data-tcube-layout-id]')

  if (!layoutElement?.dataset.tcubeLayoutId) return

  expandLayoutNodeAncestors(layoutElement.dataset.tcubeLayoutId)
  selectedLayoutNodeId.value = layoutElement.dataset.tcubeLayoutId
  syncPreviewSelection()
  scrollActiveInspectorItemIntoView('layout')
}

/**
 * 본문에서 클릭한 편집 요소를 선택하고 요소 목록의 활성 항목으로 이동
 *
 * @param elementId 선택할 편집 요소 id
 * @returns 없음
 */
function selectPreviewEditableElement(elementId: string) {
  builderEditor.selectElement(elementId)
  scrollActiveInspectorItemIntoView('elements')
}

/**
 * 선택한 구조 노드가 목록에 나타나도록 접힌 조상 노드 펼침
 *
 * @param layoutNodeId 표시할 구조 노드 id
 * @returns 없음
 */
function expandLayoutNodeAncestors(layoutNodeId: string) {
  const layoutNodes = currentDocument.value?.layoutNodes || []
  const selectedNode = layoutNodes.find((layoutNode) => layoutNode.id === layoutNodeId)

  if (!selectedNode) return

  const nodeBySelector = new Map(layoutNodes.map((layoutNode) => [layoutNode.selector, layoutNode]))
  const ancestorIds = new Set<string>()
  let parentNode = nodeBySelector.get(selectedNode.parentSelector)

  while (parentNode && !ancestorIds.has(parentNode.id)) {
    ancestorIds.add(parentNode.id)
    parentNode = nodeBySelector.get(parentNode.parentSelector)
  }

  collapsedLayoutNodeIds.value = collapsedLayoutNodeIds.value.filter((nodeId) => !ancestorIds.has(nodeId))
}

/**
 * 현재 활성 인스펙터 항목이 목록 가시 영역 안에 오도록 내부 스크롤 조정
 *
 * @param mode 스크롤할 인스펙터 모드
 * @returns 없음
 */
function scrollActiveInspectorItemIntoView(mode: 'elements' | 'layout') {
  nextTick(() => {
    const inspectorList = mode === 'elements' ? elementInspectorList.value : layoutInspectorList.value
    const activeSelector = mode === 'elements' ? '.element-list-item.active' : '.layout-node-item.active'
    const activeItem = inspectorList?.querySelector<HTMLElement>(activeSelector)

    if (!inspectorList || !activeItem) return

    const listRect = inspectorList.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()
    const topBoundary = listRect.top + 10
    const bottomBoundary = listRect.bottom - 10

    if (itemRect.top < topBoundary) {
      inspectorList.scrollBy({ top: itemRect.top - topBoundary, behavior: 'smooth' })
    } else if (itemRect.bottom > bottomBoundary) {
      inspectorList.scrollBy({ top: itemRect.bottom - bottomBoundary, behavior: 'smooth' })
    }
  })
}

/**
 * 미리보기 바깥 영역을 클릭했을 때 열려있는 툴바를 닫음
 *
 * @param event 상위 document에서 발생한 click 이벤트
 */
function handleOuterDocumentClick(event: MouseEvent) {
  if (!linkMenu.visible) return

  const target = event.target

  if (target instanceof Node && previewWrap.value?.contains(target)) return

  closeLinkMenu()
}

/**
 * ESC 키 입력 시 열려있는 툴바 또는 편집 상태를 종료
 *
 * @param event document 또는 iframe 문서에서 발생한 keydown 이벤트
 */
function handleCloseMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeLinkMenu()
  }
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

  if (inspectorMode.value === 'layout') {
    if (!selectedLayoutNodeId.value) return

    const selectedLayoutElement = frameDocument.querySelector<HTMLElement>(
      `[data-tcube-layout-id="${selectedLayoutNodeId.value}"]`
    )

    if (selectedLayoutElement) {
      selectedLayoutElement.dataset.tcubeLayoutSelected = 'true'
      selectedLayoutElement.scrollIntoView({ block: 'start', inline: 'nearest' })
    }

    return
  }

  if (!builderEditor.selectedElementId) return

  const selectedPreviewElement = frameDocument.querySelector<HTMLElement>(
    `[data-tcube-editable-id="${builderEditor.selectedElementId}"]`
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
 * 텍스트 요소를 contenteditable 상태로 전환하고 blur 시 수정 내용을 저장
 *
 * @param element 텍스트 수정 대상으로 선택된 미리보기 HTMLElement
 */
function startTextEdit(element: HTMLElement) {
  closeLinkMenu()

  const initialContent = element.textContent || ''

  element.contentEditable = 'true'
  element.dataset.tcubeEditing = 'true'
  element.focus()
  placeCaretAtEnd(element)

  /**
   * 텍스트 편집 종료 시 현재 내용을 store에 저장하고 임시 이벤트를 해제
   */
  const commitEdit = () => {
    const elementId = element.dataset.tcubeEditableId
    const nextContent = element.textContent || ''

    element.contentEditable = 'false'
    delete element.dataset.tcubeEditing

    if (elementId && nextContent !== initialContent) {
      builderEditor.updateCurrentDocumentElement(elementId, {
        content: nextContent
      })
    }

    element.removeEventListener('blur', commitEdit)
    element.removeEventListener('keydown', handleKeydown)
  }

  /**
   * ESC 입력 시 텍스트 편집을 blur로 종료
   *
   * @param event 편집 중인 요소에서 발생한 keydown 이벤트
   */
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      element.blur()
    }
  }

  element.addEventListener('blur', commitEdit)
  element.addEventListener('keydown', handleKeydown)
}

/**
 * 요소 목록 항목 hover 시 iframe 미리보기 요소 강조
 *
 * @param element 강조할 파싱 요소 정보
 * @returns 없음
 */
function handleElementListHover(element: ParsedHtmlEditableElement) {
  if (inspectorMode.value !== 'elements') return

  setPreviewHover(getPreviewElement(element.id))
}

/**
 * 구조 목록 항목 hover 시 iframe 미리보기 레이아웃 강조
 *
 * @param layoutNode 강조할 레이아웃 노드 정보
 * @returns 없음
 */
function handleLayoutNodeHover(layoutNode: ParsedHtmlLayoutNode) {
  if (inspectorMode.value !== 'layout') return

  const layoutElement = previewFrame.value?.contentDocument?.querySelector<HTMLElement>(
    `[data-tcube-layout-id="${layoutNode.id}"]`
  ) || null

  setPreviewHover(layoutElement)
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
 * 좌측 편집 요소 목록에서 항목 클릭 시 해당 미리보기 요소로 이동하고 편집 UI 실행
 *
 * @param element 목록에서 선택된 파싱 요소 정보
 * @returns 없음
 */
function handleElementListClick(element: ParsedHtmlEditableElement) {
  if (inspectorMode.value !== 'elements') return

  builderEditor.selectElement(element.id)
  selectedLayoutNodeId.value = ''
  closeLinkMenu()

  const previewElement = getPreviewElement(element.id)

  if (!previewElement) return

  scrollPreviewElementIntoView(previewElement, () => {
    if (inspectorMode.value !== 'elements') return

    const scrolledPreviewElement = getPreviewElement(element.id)

    if (!scrolledPreviewElement) return

    if (element.type === 'image') {
      if (isImageElement(scrolledPreviewElement)) {
        openImageMenuAtElement(scrolledPreviewElement)
        return
      }

      closeLinkMenu()
      return
    }

    if ((element.type === 'picture' || element.type === 'video') && isMediaElement(scrolledPreviewElement)) {
      openMediaMenuAtElement(scrolledPreviewElement)
      return
    }

    if (element.type === 'link' || element.tagName === 'a') {
      openAnchorToolbarAtElement(scrolledPreviewElement)
      return
    }

    startTextEdit(scrolledPreviewElement)
  })
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
  syncPreviewSelection()
}

/**
 * 레이아웃 노드 접힘 상태 전환
 *
 * @param layoutNode 접거나 펼칠 레이아웃 노드
 */
function toggleLayoutNode(layoutNode: ParsedHtmlLayoutNode) {
  if (isLayoutNodeCollapsed(layoutNode)) {
    collapsedLayoutNodeIds.value = collapsedLayoutNodeIds.value.filter((nodeId) => nodeId !== layoutNode.id)
    return
  }

  collapsedLayoutNodeIds.value = [...collapsedLayoutNodeIds.value, layoutNode.id]
}

/**
 * 레이아웃 노드 접힘 여부 확인
 *
 * @param layoutNode 확인할 레이아웃 노드
 * @returns 접힌 노드이면 true
 */
function isLayoutNodeCollapsed(layoutNode: ParsedHtmlLayoutNode) {
  return collapsedLayoutNodeIds.value.includes(layoutNode.id)
}

/**
 * 레이아웃 노드의 하위 구조 존재 여부 확인
 *
 * @param layoutNode 확인할 레이아웃 노드
 * @returns 하위 layout node가 있으면 true
 */
function hasLayoutChildren(layoutNode: ParsedHtmlLayoutNode) {
  return Boolean(currentDocument.value?.layoutNodes.some((node) => node.parentSelector === layoutNode.selector))
}

/**
 * 하위 레이아웃을 가진 노드 id 목록 조회
 *
 * @returns 접기 가능한 레이아웃 노드 id 목록
 */
function getCollapsibleLayoutNodeIds() {
  const layoutNodes = currentDocument.value?.layoutNodes || []
  const parentSelectors = new Set(layoutNodes.map((layoutNode) => layoutNode.parentSelector))

  return layoutNodes
    .filter((layoutNode) => parentSelectors.has(layoutNode.selector))
    .map((layoutNode) => layoutNode.id)
}

/**
 * 기준 레이아웃의 하위 접기 가능한 노드 id 목록 조회
 *
 * @param layoutNode 하위 구조 기준 레이아웃 노드
 * @returns 하위 접기 가능한 레이아웃 노드 id 목록
 */
function getLayoutDescendantCollapsibleNodeIds(layoutNode: ParsedHtmlLayoutNode) {
  const layoutNodes = currentDocument.value?.layoutNodes || []
  const nodeBySelector = new Map(layoutNodes.map((node) => [node.selector, node]))
  const collapsibleNodeIds = new Set(getCollapsibleLayoutNodeIds())

  return layoutNodes
    .filter((node) => collapsibleNodeIds.has(node.id))
    .filter((node) => isLayoutNodeDescendantOf(node, layoutNode, nodeBySelector))
    .map((node) => node.id)
}

/**
 * 대상 레이아웃이 기준 레이아웃의 하위 노드인지 확인
 *
 * @param layoutNode 확인할 레이아웃 노드
 * @param ancestorNode 기준이 되는 상위 레이아웃 노드
 * @param nodeBySelector selector 기준 레이아웃 노드 조회 맵
 * @returns 기준 레이아웃의 하위 노드이면 true
 */
function isLayoutNodeDescendantOf(
  layoutNode: ParsedHtmlLayoutNode,
  ancestorNode: ParsedHtmlLayoutNode,
  nodeBySelector: Map<string, ParsedHtmlLayoutNode>
) {
  let parentNode = nodeBySelector.get(layoutNode.parentSelector)

  while (parentNode) {
    if (parentNode.id === ancestorNode.id) return true

    parentNode = nodeBySelector.get(parentNode.parentSelector)
  }

  return false
}

/**
 * 기준 레이아웃의 하위 접기 가능한 노드가 모두 접힌 상태인지 확인
 *
 * @param layoutNode 하위 구조 기준 레이아웃 노드
 * @returns 하위 접기 가능한 노드가 모두 접혔으면 true
 */
function areLayoutDescendantsCollapsed(layoutNode: ParsedHtmlLayoutNode) {
  const descendantNodeIds = getLayoutDescendantCollapsibleNodeIds(layoutNode)

  return descendantNodeIds.length > 0
    && descendantNodeIds.every((nodeId) => collapsedLayoutNodeIds.value.includes(nodeId))
}

/**
 * 기준 레이아웃의 하위 접기 가능한 노드 전체 접기 또는 펼치기
 *
 * @param layoutNode 하위 구조 기준 레이아웃 노드
 * @returns 없음
 */
function toggleLayoutDescendants(layoutNode: ParsedHtmlLayoutNode) {
  const descendantNodeIds = getLayoutDescendantCollapsibleNodeIds(layoutNode)

  if (areLayoutDescendantsCollapsed(layoutNode)) {
    collapsedLayoutNodeIds.value = collapsedLayoutNodeIds.value.filter((nodeId) => !descendantNodeIds.includes(nodeId))
    return
  }

  collapsedLayoutNodeIds.value = [...new Set([...collapsedLayoutNodeIds.value, ...descendantNodeIds])]
}

/**
 * 접힌 조상 노드가 있는지 확인
 *
 * @param layoutNode 표시 여부를 확인할 레이아웃 노드
 * @param collapsedIds 접힌 레이아웃 노드 id 목록
 * @param nodeBySelector selector 기준 레이아웃 노드 조회 맵
 * @returns 접힌 조상이 있으면 true
 */
function hasCollapsedLayoutAncestor(
  layoutNode: ParsedHtmlLayoutNode,
  collapsedIds: Set<string>,
  nodeBySelector: Map<string, ParsedHtmlLayoutNode>
) {
  let parentNode = nodeBySelector.get(layoutNode.parentSelector)

  while (parentNode) {
    if (collapsedIds.has(parentNode.id)) return true

    parentNode = nodeBySelector.get(parentNode.parentSelector)
  }

  return false
}

/**
 * 레이아웃 노드 드래그 시작 상태 저장
 *
 * @param layoutNode 드래그를 시작한 레이아웃 노드
 */
function handleLayoutDragStart(layoutNode: ParsedHtmlLayoutNode) {
  draggedLayoutNodeId.value = layoutNode.id
  selectedLayoutNodeId.value = layoutNode.id
  closeLinkMenu()
}

/**
 * 레이아웃 노드 드래그 종료 상태 초기화
 */
function handleLayoutDragEnd() {
  draggedLayoutNodeId.value = ''
}

/**
 * 드롭 가능 대상 위에서 기본 브라우저 드롭을 허용
 *
 * @param layoutNode 현재 마우스가 올라간 레이아웃 노드
 */
function handleLayoutDragOver(layoutNode: ParsedHtmlLayoutNode) {
  if (!canDropLayoutNode(layoutNode)) return
}

/**
 * 레이아웃 노드 드롭 처리 및 raw HTML 순서 변경
 *
 * @param layoutNode 드롭 기준 레이아웃 노드
 * @param event 드롭 위치 계산에 사용하는 DragEvent
 */
function handleLayoutDrop(layoutNode: ParsedHtmlLayoutNode, event: DragEvent) {
  if (!draggedLayoutNodeId.value || !canDropLayoutNode(layoutNode)) return

  const position = getLayoutDropPosition(event)
  const movedLayoutNodeId = builderEditor.moveCurrentDocumentLayoutNode(draggedLayoutNodeId.value, layoutNode.id, position)

  draggedLayoutNodeId.value = ''

  if (movedLayoutNodeId) {
    selectedLayoutNodeId.value = movedLayoutNodeId
    pendingLayoutFocusId.value = movedLayoutNodeId
    collapsedLayoutNodeIds.value = collapsedLayoutNodeIds.value.filter((nodeId) => {
      return currentDocument.value?.layoutNodes.some((node) => node.id === nodeId)
    })
    closeLinkMenu()
    nextTick(() => {
      syncPreviewSelection()
      focusSelectedLayoutNodeAfterPreviewRender()
    })
  }
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
 * 드롭 좌표 기준으로 before/after 위치 계산
 *
 * @param event 드롭 이벤트
 * @returns 기준 노드 앞 또는 뒤 위치
 */
function getLayoutDropPosition(event: DragEvent): 'before' | 'after' {
  const target = event.currentTarget

  if (!(target instanceof HTMLElement)) return 'after'

  const rect = target.getBoundingClientRect()

  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

/**
 * 링크 요소 클릭 위치에 링크 편집 툴바를 표시
 *
 * @param element 툴바를 연결할 anchor 요소
 * @param event 툴바 위치 계산에 사용할 마우스 이벤트
 * @param targetType 링크 내부에서 편집 가능한 대상 유형
 */
function openLinkMenu(element: HTMLAnchorElement, event: MouseEvent, targetType: 'link' | 'text' | 'image' = 'text') {
  const elementId = element.dataset.tcubeEditableId

  if (!elementId) return

  const position = getPopoverPosition(event)

  linkMenu.visible = true
  linkMenu.mode = 'menu'
  linkMenu.targetType = targetType
  linkMenu.elementId = elementId
  linkMenu.href = element.getAttribute('href') || ''
  linkMenu.x = position.x
  linkMenu.y = position.y
}

/**
 * 링크 요소의 현재 위치를 기준으로 링크 편집 툴바를 표시
 *
 * @param element 툴바를 연결할 anchor 요소
 * @param targetType 링크 내부에서 편집 가능한 대상 유형
 */
function openLinkMenuAtElement(element: HTMLAnchorElement, targetType: 'link' | 'text' | 'image' = 'text') {
  const elementId = element.dataset.tcubeEditableId

  if (!elementId) return

  const position = getPopoverPositionByElement(element)

  linkMenu.visible = true
  linkMenu.mode = 'menu'
  linkMenu.targetType = targetType
  linkMenu.elementId = elementId
  linkMenu.href = element.getAttribute('href') || ''
  linkMenu.x = position.x
  linkMenu.y = position.y
}

/**
 * anchor 클릭 대상의 내부 구조를 판별해 링크/텍스트/이미지 툴바 중 알맞은 툴바를 표시
 *
 * @param anchorElement 클릭된 대상과 연결된 anchor 요소
 * @param clickedElement 실제 클릭 이벤트가 발생한 요소
 * @param event 툴바 위치 계산에 사용할 마우스 이벤트
 */
function openAnchorToolbar(anchorElement: HTMLAnchorElement, clickedElement: HTMLElement, event: MouseEvent) {
  const imageElement = clickedElement.closest<HTMLImageElement>('img[data-tcube-editable-id]')
    || anchorElement.querySelector<HTMLImageElement>('img[data-tcube-editable-id]')

  if (imageElement) {
    if (imageElement.dataset.tcubeEditableId) {
      selectPreviewEditableElement(imageElement.dataset.tcubeEditableId)
    }
    openImageMenu(imageElement, event)
    return
  }

  const mediaElement = clickedElement.closest<HTMLElement>('[data-tcube-editable-type="picture"], [data-tcube-editable-type="video"]')
    || anchorElement.querySelector<HTMLElement>('[data-tcube-editable-type="picture"], [data-tcube-editable-type="video"]')

  if (isMediaElement(mediaElement)) {
    if (mediaElement.dataset.tcubeEditableId) {
      selectPreviewEditableElement(mediaElement.dataset.tcubeEditableId)
    }
    openMediaMenu(mediaElement, event)
    return
  }

  const targetType = isSimpleTextAnchor(anchorElement) ? 'text' : 'link'
  const elementId = anchorElement.dataset.tcubeEditableId

  if (elementId) {
    selectPreviewEditableElement(elementId)
    openLinkMenu(anchorElement, event, targetType)
  }
}

/**
 * 특정 미리보기 요소 위치를 기준으로 anchor 편집 툴바를 표시
 *
 * @param element anchor 자체이거나 anchor 하위에 포함된 미리보기 요소
 */
function openAnchorToolbarAtElement(element: HTMLElement) {
  const anchorElement = isAnchorElement(element) ? element : element.closest<HTMLAnchorElement>('a')

  if (!anchorElement) return

  const imageElement = anchorElement.querySelector<HTMLImageElement>('img[data-tcube-editable-id]')

  if (imageElement) {
    openImageMenuAtElement(imageElement)
    return
  }

  openLinkMenuAtElement(anchorElement, isSimpleTextAnchor(anchorElement) ? 'text' : 'link')
}

/**
 * 이미지 클릭 위치에 이미지 편집 툴바를 표시
 * 이미지가 링크 내부에 있으면 링크 수정 항목도 함께 노출
 *
 * @param element 툴바를 연결할 이미지 요소
 * @param event 툴바 위치 계산에 사용할 마우스 이벤트
 */
function openImageMenu(element: HTMLImageElement, event: MouseEvent) {
  const elementId = element.dataset.tcubeEditableId
  const linkElement = element.closest<HTMLAnchorElement>('a')

  if (!elementId) return

  pendingImageMenuElementId = ''

  const position = getPopoverPosition(event)

  linkMenu.visible = true
  linkMenu.mode = 'menu'
  linkMenu.targetType = 'image'
  linkMenu.hasLink = Boolean(linkElement)
  linkMenu.elementId = elementId
  linkMenu.href = linkElement?.getAttribute('href') || ''
  linkMenu.x = position.x
  linkMenu.y = position.y
}

/**
 * 이미지 요소의 현재 위치를 기준으로 이미지 편집 툴바를 표시
 *
 * @param element 툴바를 연결할 이미지 요소
 */
function openImageMenuAtElement(element: HTMLImageElement) {
  const elementId = element.dataset.tcubeEditableId
  const linkElement = element.closest<HTMLAnchorElement>('a')

  if (!elementId) return

  pendingImageMenuElementId = ''

  const position = getPopoverPositionByElement(element)

  linkMenu.visible = true
  linkMenu.mode = 'menu'
  linkMenu.targetType = 'image'
  linkMenu.hasLink = Boolean(linkElement)
  linkMenu.elementId = elementId
  linkMenu.href = linkElement?.getAttribute('href') || ''
  linkMenu.x = position.x
  linkMenu.y = position.y
}

/**
 * picture/video 클릭 위치를 기준으로 미디어 편집 팝업 표시
 *
 * @param element 편집할 picture 또는 video 요소
 * @param event 팝업 위치 계산에 사용할 마우스 이벤트
 * @returns 없음
 */
function openMediaMenu(element: HTMLPictureElement | HTMLVideoElement, event: MouseEvent) {
  const elementId = element.dataset.tcubeEditableId
  const linkElement = element.closest<HTMLAnchorElement>('a')

  if (!elementId) return

  const position = getPopoverPosition(event)

  linkMenu.visible = true
  linkMenu.mode = 'menu'
  linkMenu.targetType = element.tagName.toLowerCase() === 'picture' ? 'picture' : 'video'
  linkMenu.hasLink = Boolean(linkElement)
  linkMenu.elementId = elementId
  linkMenu.href = linkElement?.getAttribute('href') || ''
  linkMenu.x = position.x
  linkMenu.y = position.y
}

/**
 * picture/video 요소 위치를 기준으로 미디어 편집 팝업 표시
 *
 * @param element 편집할 picture 또는 video 요소
 * @returns 없음
 */
function openMediaMenuAtElement(element: HTMLPictureElement | HTMLVideoElement) {
  const elementId = element.dataset.tcubeEditableId
  const linkElement = element.closest<HTMLAnchorElement>('a')

  if (!elementId) return

  const position = getPopoverPositionByElement(element)

  linkMenu.visible = true
  linkMenu.mode = 'menu'
  linkMenu.targetType = element.tagName.toLowerCase() === 'picture' ? 'picture' : 'video'
  linkMenu.hasLink = Boolean(linkElement)
  linkMenu.elementId = elementId
  linkMenu.href = linkElement?.getAttribute('href') || ''
  linkMenu.x = position.x
  linkMenu.y = position.y
}

/**
 * 선택한 img/picture/video의 URL 및 업로드 편집 화면 열기
 *
 * @returns 없음
 */
function openSelectedMediaSrcEdit() {
  linkMenu.mediaSources = getMediaSources(linkMenu.elementId)
  linkMenu.mode = 'media-src'
  nextTick(() => {
    const input = previewWrap.value?.querySelector<HTMLInputElement>('.html-media-source-input')
    input?.focus()
  })
}

/**
 * 미디어 URL 편집 목록에서 선택한 source 파일 업로드 시작
 *
 * @param mediaSourceSelector 업로드 대상 source 선택자
 * @returns 없음
 */
function openMediaSourcePicker(mediaSourceSelector: string) {
  openMediaPicker(linkMenu.elementId, mediaSourceSelector)
}

/**
 * media source별 URL 수정 내용을 미리보기와 문서 모델에 반영
 *
 * @returns 없음
 */
function applySelectedMediaSources() {
  const editableElement = getEditableElement(linkMenu.elementId)

  if (!editableElement) return

  const mediaSources = linkMenu.mediaSources.map((mediaSource) => ({ ...mediaSource }))
  const frameDocument = previewFrame.value?.contentDocument

  mediaSources.forEach((mediaSource) => {
    frameDocument?.querySelector<HTMLElement>(mediaSource.selector)?.setAttribute(mediaSource.attribute, mediaSource.src)
  })

  if (editableElement.type === 'image') {
    builderEditor.updateCurrentDocumentElement(linkMenu.elementId, { src: mediaSources[0]?.src || '' })
    closeLinkMenu()
    return
  }

  if (editableElement.type !== 'picture' && editableElement.type !== 'video') return

  builderEditor.updateCurrentDocumentElement(linkMenu.elementId, { mediaSources })
  closeLinkMenu()
}

/**
 * 현재 선택된 링크 요소를 텍스트 직접 편집 상태로 전환
 */
function startSelectedLinkTextEdit() {
  const element = getPreviewElement(linkMenu.elementId)

  if (element) {
    startTextEdit(element)
  }
}

/**
 * 현재 선택된 링크의 href 입력 모드로 툴바를 전환하고 input에 포커싱
 */
function openSelectedLinkHrefEdit() {
  linkMenu.mode = 'href'
  nextTick(() => {
    const input = previewWrap.value?.querySelector<HTMLInputElement>('.html-link-edit-popover input')
    input?.focus()
    input?.select()
  })
}

/**
 * 툴바에서 입력한 링크 주소를 미리보기와 store에 반영
 */
function applySelectedLinkHref() {
  const previewElement = getPreviewElement(linkMenu.elementId)
  const linkElement = isAnchorElement(previewElement)
    ? previewElement
    : previewElement?.closest('a')

  if (isAnchorElement(linkElement)) {
    linkElement.setAttribute('href', linkMenu.href)
  }

  builderEditor.updateCurrentDocumentElement(linkMenu.elementId, {
    href: linkMenu.href
  })
  closeLinkMenu()
}

/**
 * picture/video의 지정 source 파일 업로드 선택 창 열기
 *
 * @param elementId 편집할 미디어 컨테이너 id
 * @param mediaSourceSelector 업로드 대상 source 선택자
 * @returns 없음
 */
function openMediaPicker(elementId: string, mediaSourceSelector: string) {
  selectedImageElementId.value = elementId
  selectedMediaSourceSelector.value = mediaSourceSelector
  selectedMediaInputType.value = linkMenu.targetType === 'video' ? 'video' : 'image'
  imageInput.value?.click()
}

/**
 * 파일 선택 창에서 선택된 이미지를 data URL로 읽어 미리보기와 store에 반영
 *
 * @param event 이미지 파일 input의 change 이벤트
 */
function handleImageInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const elementId = selectedImageElementId.value

  if (!file || !elementId) {
    input.value = ''
    return
  }

  const reader = new FileReader()

  reader.onload = () => {
    const src = typeof reader.result === 'string' ? reader.result : ''
    const imageElement = getPreviewElement(elementId)

    if (selectedMediaSourceSelector.value) {
      const editableElement = getEditableElement(elementId)

      if (editableElement?.type === 'picture' || editableElement?.type === 'video') {
        const mediaSources = (editableElement.mediaSources || []).map((mediaSource) => {
          return mediaSource.selector === selectedMediaSourceSelector.value
            ? { ...mediaSource, src }
            : mediaSource
        })
        const mediaSource = mediaSources.find((source) => source.selector === selectedMediaSourceSelector.value)

        if (mediaSource) {
          previewFrame.value?.contentDocument
            ?.querySelector<HTMLElement>(mediaSource.selector)
            ?.setAttribute(mediaSource.attribute, src)
          builderEditor.updateCurrentDocumentElement(elementId, { mediaSources })
          linkMenu.mediaSources = mediaSources.map((source) => ({ ...source }))
        }

        selectedMediaSourceSelector.value = ''
        input.value = ''
        return
      }
    }

    if (isImageElement(imageElement)) {
      imageElement.src = src
    }

    builderEditor.updateCurrentDocumentElement(elementId, { src })
    linkMenu.mediaSources = linkMenu.mediaSources.map((mediaSource) => {
      return mediaSource.selector === selectedMediaSourceSelector.value
        ? { ...mediaSource, src }
        : mediaSource
    })
    selectedMediaSourceSelector.value = ''
    input.value = ''
  }

  reader.readAsDataURL(file)
}

/**
 * 링크/이미지 툴바 상태를 초기값으로 되돌리고 화면에서 숨김
 */
function closeLinkMenu() {
  linkMenu.visible = false
  linkMenu.mode = 'menu'
  linkMenu.targetType = 'link'
  linkMenu.hasLink = false
  linkMenu.href = ''
  linkMenu.mediaSources = []
}

/**
 * 편집 요소 id로 현재 문서의 요소 모델 조회
 *
 * @param elementId 조회할 편집 요소 id
 * @returns 현재 문서의 편집 요소 또는 없으면 null
 */
function getEditableElement(elementId: string) {
  return currentDocument.value?.elements.find((element) => element.id === elementId) || null
}

/**
 * img/picture/video의 URL 편집용 source 목록 복제
 *
 * @param elementId 조회할 미디어 컨테이너 id
 * @returns URL 편집에 사용할 source 목록
 */
function getMediaSources(elementId: string) {
  const editableElement = getEditableElement(elementId)

  if (editableElement?.type === 'image') {
    return [{
      selector: editableElement.selector,
      label: 'IMG',
      attribute: 'src' as const,
      src: editableElement.src || '',
      originalSrc: editableElement.originalSrc || ''
    }]
  }

  if (editableElement?.type !== 'picture' && editableElement?.type !== 'video') return []

  return (editableElement.mediaSources || []).map((mediaSource) => ({ ...mediaSource }))
}

/**
 * 파싱 요소 id에 해당하는 iframe 내부 미리보기 요소를 조회
 *
 * @param elementId 조회할 파싱 요소 id
 * @returns iframe 내부의 편집 가능 HTMLElement 또는 없으면 null
 */
function getPreviewElement(elementId: string) {
  return previewFrame.value?.contentDocument?.querySelector<HTMLElement>(
    `[data-tcube-editable-id="${elementId}"]`
  ) || null
}

/**
 * iframe 내부 요소도 안정적으로 판별할 수 있도록 tagName 기준으로 이미지 여부를 확인
 *
 * @param element 이미지 여부를 확인할 DOM 요소
 * @returns img 태그이면 true, 아니면 false
 */
function isImageElement(element: Element | null): element is HTMLImageElement {
  return Boolean(element && element.tagName.toLowerCase() === 'img')
}

/**
 * iframe 내부 요소의 picture/video 미디어 컨테이너 여부 확인
 *
 * @param element 미디어 여부를 확인할 DOM 요소
 * @returns picture 또는 video 태그이면 true
 */
function isMediaElement(element: Element | null): element is HTMLPictureElement | HTMLVideoElement {
  const tagName = element?.tagName.toLowerCase()

  return tagName === 'picture' || tagName === 'video'
}

/**
 * iframe 내부 요소도 안정적으로 판별할 수 있도록 tagName 기준으로 링크 여부를 확인
 *
 * @param element 링크 여부를 확인할 DOM 요소
 * @returns a 태그이면 true, 아니면 false
 */
function isAnchorElement(element: Element | null): element is HTMLAnchorElement {
  return Boolean(element && element.tagName.toLowerCase() === 'a')
}

/**
 * iframe 클릭 좌표를 미리보기 래퍼 기준의 툴바 표시 좌표로 변환
 *
 * @param event iframe 내부에서 발생한 마우스 이벤트
 * @returns 툴바를 표시할 x, y 좌표
 */
function getPopoverPosition(event: MouseEvent) {
  const frameRect = previewFrame.value?.getBoundingClientRect()
  const wrapRect = previewWrap.value?.getBoundingClientRect()

  if (!frameRect || !wrapRect) {
    return { x: 16, y: 16 }
  }

  return {
    x: Math.min(frameRect.left - wrapRect.left + event.clientX + 12, wrapRect.width - 260),
    y: Math.max(12, frameRect.top - wrapRect.top + event.clientY + 12)
  }
}

/**
 * 특정 요소의 화면 위치를 미리보기 래퍼 기준의 툴바 표시 좌표로 변환
 *
 * @param element 툴바를 배치할 기준 HTMLElement
 * @returns 툴바를 표시할 x, y 좌표
 */
function getPopoverPositionByElement(element: HTMLElement) {
  const elementRect = element.getBoundingClientRect()
  const frameRect = previewFrame.value?.getBoundingClientRect()
  const wrapRect = previewWrap.value?.getBoundingClientRect()

  if (!frameRect || !wrapRect) {
    return { x: 16, y: 16 }
  }

  return {
    x: Math.min(frameRect.left - wrapRect.left + elementRect.left + 12, wrapRect.width - 260),
    y: Math.max(12, frameRect.top - wrapRect.top + elementRect.bottom + 12)
  }
}

/**
 * contenteditable 요소의 커서를 텍스트 끝으로 이동
 *
 * @param element 커서를 이동할 HTMLElement
 */
function placeCaretAtEnd(element: HTMLElement) {
  const selection = element.ownerDocument.getSelection()
  const range = element.ownerDocument.createRange()

  range.selectNodeContents(element)
  range.collapse(false)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

/**
 * 좌측 편집 요소 목록에 표시할 미리보기 문자열을 생성
 *
 * @param element 목록에 표시할 파싱 요소 정보
 * @returns 최대 36자로 줄인 요소 미리보기 문자열
 */
function getElementPreview(element: ParsedHtmlEditableElement) {
  const value = element.type === 'image'
    ? element.alt || element.src || '이미지'
    : element.type === 'picture'
      ? element.mediaSources?.find((mediaSource) => mediaSource.label === 'IMG fallback')?.src || '반응형 이미지'
      : element.type === 'video'
        ? element.mediaSources?.[0]?.src || '비디오'
    : element.type === 'link'
      ? element.href || '링크'
      : element.content || '텍스트'

  return value.length > 36 ? `${value.slice(0, 36)}...` : value
}

/**
 * 편집 요소 유형에 맞는 remix icon 클래스를 반환
 *
 * @param element 아이콘을 결정할 파싱 요소 정보
 * @returns 요소 유형에 맞는 아이콘 클래스명
 */
/**
 * HTML 구조 목록에 표시할 레이아웃 노드 설명 생성
 *
 * @param layoutNode 구조 목록에 표시할 레이아웃 노드
 * @returns 자식 수와 텍스트 일부를 포함한 설명
 */
function getLayoutNodePreview(layoutNode: ParsedHtmlLayoutNode) {
  const value = layoutNode.previewText || `${layoutNode.childCount} child`

  return value.length > 42 ? `${value.slice(0, 42)}...` : value
}

/**
 * 편집 요소 유형에 맞는 remix icon 클래스명 반환
 *
 * @param element 아이콘을 결정할 파싱 요소 정보
 * @returns 요소 유형에 맞는 아이콘 클래스명
 */
function getElementIcon(element: ParsedHtmlEditableElement) {
  if (element.type === 'image') return 'ri-image-line'
  if (element.type === 'picture') return 'ri-landscape-line'
  if (element.type === 'video') return 'ri-video-line'
  if (element.type === 'link') return 'ri-link'

  return 'ri-text'
}

/**
 * anchor 내부 구조가 텍스트 직접 편집에 적합한 단순 구조인지 판별
 *
 * @param element 구조를 판별할 anchor 요소
 * @returns 단순 텍스트 링크이면 true, 복잡한 구조이면 false
 */
function isSimpleTextAnchor(element: HTMLAnchorElement) {
  if (element.querySelector('img, picture, svg, video, table')) return false
  if (element.querySelectorAll('div').length > 1) return false

  const elementChildren = Array.from(element.children)

  if (elementChildren.length === 0) return true
  if (elementChildren.length > 2) return false

  return elementChildren.every((child) => {
    const tagName = child.tagName.toLowerCase()
    if (!['span', 'strong', 'em', 'b', 'i', 'small', 'div'].includes(tagName)) return false
    if (child.querySelector('img, picture, svg, video, table, div')) return false

    return Boolean((child.textContent || '').replace(/\s+/g, ' ').trim())
  })
}

/** 인스펙터 탭 전환 시 반대 모드의 선택 및 편집 상태 초기화 */
watch(inspectorMode, (mode) => {
  pendingImageMenuElementId = ''
  closeLinkMenu()
  syncPreviewInspectorMode()
  clearPreviewHover()

  if (mode === 'layout') {
    builderEditor.selectElement(null)
  } else {
    selectedLayoutNodeId.value = ''
  }

  syncPreviewSelection()
})

watch(previewHtml, () => {
  closeLinkMenu()
})

watch(
  () => builderEditor.selectedElementId,
  () => {
    syncPreviewSelection()
  }
)

onMounted(() => {
  document.addEventListener('click', handleOuterDocumentClick)
  document.addEventListener('keydown', handleCloseMenuKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOuterDocumentClick)
  document.removeEventListener('keydown', handleCloseMenuKeydown)
})
</script>
