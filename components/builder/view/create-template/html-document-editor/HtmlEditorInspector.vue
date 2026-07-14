<template>
  <aside class="html-editor-panel element-list-panel">
    <div class="html-editor-panel-title">
      <strong>{{ mode === 'elements' ? '편집 요소' : 'HTML 구조' }}</strong>
      <div class="html-inspector-title-actions">
        <button
          v-if="mode === 'layout'"
          class="html-inspector-collapse-button"
          type="button"
          :aria-label="areAllLayoutNodesCollapsed ? '하위 요소 전체 펼치기' : '하위 요소 전체 접기'"
          :title="areAllLayoutNodesCollapsed ? '하위 요소 전체 펼치기' : '하위 요소 전체 접기'"
          @click="toggleAllLayoutNodes"
        >
          <TcubeIcon :icon="areAllLayoutNodesCollapsed ? 'ri-expand-diagonal-2-line' : 'ri-collapse-diagonal-2-line'" />
        </button>
        <span>{{ mode === 'elements' ? document.elements.length : document.layoutNodes.length }}개</span>
      </div>
    </div>

    <div class="html-inspector-tabs" role="tablist" aria-label="HTML inspector mode">
      <button
        class="html-inspector-tab"
        :class="{ active: mode === 'elements' }"
        type="button"
        @click="emit('update:mode', 'elements')"
      >
        <TcubeIcon icon="ri-edit-box-line" />
        <span>요소</span>
      </button>
      <button
        class="html-inspector-tab"
        :class="{ active: mode === 'layout' }"
        type="button"
        @click="emit('update:mode', 'layout')"
      >
        <TcubeIcon icon="ri-node-tree" />
        <span>구조</span>
      </button>
    </div>

    <div ref="elementList" v-show="mode === 'elements'" class="html-inspector-list element-node-list">
      <button
        v-for="element in document.elements"
        :key="element.id"
        class="element-list-item"
        :class="{ active: selectedElementId === element.id }"
        type="button"
        @click.stop="emit('select-element', element)"
        @mouseenter="emit('hover-element', element)"
        @mouseleave="emit('clear-hover')"
      >
        <TcubeIcon :icon="getElementIcon(element)" />
        <span>
          <strong>{{ element.tagName.toUpperCase() }}</strong>
          <small>{{ getElementPreview(element) }}</small>
        </span>
      </button>
    </div>

    <div
      ref="layoutList"
      v-if="mode === 'layout'"
      class="html-inspector-list layout-node-list"
    >
      <div
        v-for="layoutNode in visibleLayoutNodes"
        :key="layoutNode.id"
        class="layout-node-item"
        :class="[{
          active: selectedLayoutNodeId === layoutNode.id,
          dragging: draggedLayoutNodeId === layoutNode.id,
          droppable: canDropLayoutNode(layoutNode),
          'tree-child': layoutNode.depth > 0,
          'drag-ready': isLayoutNodeDragIconVisible(layoutNode)
        }, getLayoutNodeActiveRegionClass(layoutNode), getLayoutNodeScopeClasses(layoutNode)]"
        :style="{
          paddingLeft: `${8 + layoutNode.depth * 18}px`,
          '--layout-node-indent': `${layoutNode.depth * 18}px`,
          '--layout-branch-scope-left': selectedLayoutBranchIndent
        }"
        :draggable="isLayoutNodeDragIconVisible(layoutNode)"
        role="button"
        tabindex="0"
        @click.stop="emit('select-layout', layoutNode)"
        @dragstart="handleLayoutDragStart(layoutNode)"
        @dragend="emit('layout-drag-end')"
        @dragover.prevent
        @drop.prevent="handleLayoutDrop(layoutNode, $event)"
        @mouseenter="emit('hover-layout', layoutNode)"
        @mouseleave="emit('clear-hover')"
        @keydown.enter.prevent="emit('select-layout', layoutNode)"
        @keydown.space.prevent="emit('select-layout', layoutNode)"
      >
        <span class="layout-node-scope-highlight" aria-hidden="true" />
        <span class="layout-node-branch-highlight" aria-hidden="true" />
        <div class="layout-node-card">
          <span
            class="layout-node-drag-icon"
            :class="{ visible: isLayoutNodeDragIconVisible(layoutNode) }"
            aria-hidden="true"
          />
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
          <span class="layout-node-summary">
            <TcubeIcon
              v-if="getLayoutNodeIcon(layoutNode)"
              class="layout-node-type-icon"
              :icon="getLayoutNodeIcon(layoutNode)"
            />
            <strong>{{ layoutNode.tagName }}</strong>
          </span>
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
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type {
  ParsedHtmlDocument,
  ParsedHtmlEditableElement,
  ParsedHtmlLayoutNode
} from '~/services/html/parseHtmlDocument'
import type { HtmlInspectorMode, HtmlLayoutMovePosition } from '~/types/builder/html-document-editor'
import {
  getHtmlCollapsibleLayoutNodeIds,
  getHtmlDescendantCollapsibleNodeIds,
  getHtmlLayoutActiveRegions,
  getHtmlLayoutScopeNodeIds,
  getVisibleHtmlLayoutNodes
} from '~/services/html/htmlLayoutTree'

const LAYOUT_NODE_ICONS: Record<string, string> = {
  a: 'ri-link',
  button: 'ri-link',
  div: 'ri-layout-grid-line',
  h1: 'ri-heading',
  h2: 'ri-heading',
  h3: 'ri-heading',
  h4: 'ri-heading',
  h5: 'ri-heading',
  h6: 'ri-heading',
  header: 'ri-layout-top-line',
  nav: 'ri-menu-line',
  main: 'ri-layout-line',
  section: 'ri-layout-row-line',
  article: 'ri-article-line',
  aside: 'ri-layout-right-line',
  footer: 'ri-layout-bottom-line',
  figure: 'ri-image-line',
  figcaption: 'ri-text-caption',
  img: 'ri-image-line',
  picture: 'ri-image-line',
  video: 'ri-video-line',
  table: 'ri-table-line',
  span: 'ri-text',
  p: 'ri-text',
  pre: 'ri-text',
  address: 'ri-map-pin-line',
  details: 'ri-list-check-2',
  summary: 'ri-file-list-3-line'
}

const props = defineProps<{
  document: ParsedHtmlDocument
  mode: HtmlInspectorMode
  selectedElementId: string | null
  selectedLayoutNodeId: string
  draggedLayoutNodeId: string
}>()

const emit = defineEmits<{
  'update:mode': [mode: HtmlInspectorMode]
  'select-element': [element: ParsedHtmlEditableElement]
  'select-layout': [layoutNode: ParsedHtmlLayoutNode]
  'hover-element': [element: ParsedHtmlEditableElement]
  'hover-layout': [layoutNode: ParsedHtmlLayoutNode]
  'clear-hover': []
  'layout-drag-start': [layoutNode: ParsedHtmlLayoutNode]
  'layout-drag-end': []
  'move-layout': [targetNodeId: string, position: HtmlLayoutMovePosition]
}>()

const elementList = ref<HTMLElement | null>(null)
const layoutList = ref<HTMLElement | null>(null)
const collapsedLayoutNodeIds = ref<string[]>([])

/** 접힌 조상이 없는 현재 구조 트리 노드 목록 */
const visibleLayoutNodes = computed(() => {
  return getVisibleHtmlLayoutNodes(props.document.layoutNodes, collapsedLayoutNodeIds.value)
})

/** 선택 노드 기준 상위 조상, 직접 부모, 현재 하위 영역 분류 */
const selectedLayoutActiveRegions = computed(() => {
  return getHtmlLayoutActiveRegions(props.document.layoutNodes, props.selectedLayoutNodeId)
})

/** 선택 노드가 속한 최상위 조상과 전체 하위 노드 범위 */
const selectedLayoutScopeNodeIds = computed(() => {
  return getHtmlLayoutScopeNodeIds(props.document.layoutNodes, props.selectedLayoutNodeId)
})

/** 현재 구조 목록에 노출된 최상위 조상 범위의 시작과 끝 노드 */
const selectedLayoutScopeBounds = computed(() => {
  const visibleScopeNodes = visibleLayoutNodes.value.filter((node) => selectedLayoutScopeNodeIds.value.has(node.id))

  return {
    startNodeId: visibleScopeNodes[0]?.id || '',
    endNodeId: visibleScopeNodes.at(-1)?.id || ''
  }
})

/** 현재 구조 목록에 노출된 선택 노드와 하위 범위의 시작과 끝 노드 */
const selectedLayoutBranchBounds = computed(() => {
  const visibleBranchNodes = visibleLayoutNodes.value.filter((node) => {
    return selectedLayoutActiveRegions.value.get(node.id) === 'branch'
  })

  return {
    startNodeId: visibleBranchNodes[0]?.id || '',
    endNodeId: visibleBranchNodes.at(-1)?.id || ''
  }
})

/** 선택 노드와 하위 범위 테두리가 시작되는 구조 목록의 왼쪽 위치 */
const selectedLayoutBranchIndent = computed(() => {
  const selectedNode = props.document.layoutNodes.find((node) => node.id === props.selectedLayoutNodeId)

  return `${8 + (selectedNode?.depth || 0) * 18}px`
})

/** 선택 노드 아래에 하나 이상의 하위 레이아웃이 존재하는지 여부 */
const selectedLayoutHasDescendants = computed(() => {
  let branchNodeCount = 0

  selectedLayoutActiveRegions.value.forEach((activeRegion) => {
    if (activeRegion === 'branch') branchNodeCount += 1
  })

  return branchNodeCount > 1
})

/** 전체 접기 대상 레이아웃이 모두 접힌 상태 여부 */
const areAllLayoutNodesCollapsed = computed(() => {
  const collapsibleLayoutNodeIds = getHtmlCollapsibleLayoutNodeIds(props.document.layoutNodes)

  return collapsibleLayoutNodeIds.length > 0
    && collapsibleLayoutNodeIds.every((nodeId) => collapsedLayoutNodeIds.value.includes(nodeId))
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

  collapsedLayoutNodeIds.value = getHtmlCollapsibleLayoutNodeIds(props.document.layoutNodes)
}

/**
 * 선택한 구조 노드의 접힌 조상 노드 펼침
 *
 * @param layoutNodeId 표시할 구조 노드 id
 * @returns 없음
 */
function expandLayoutNodeAncestors(layoutNodeId: string) {
  const selectedNode = props.document.layoutNodes.find((layoutNode) => layoutNode.id === layoutNodeId)

  if (!selectedNode) return

  const nodeBySelector = new Map(props.document.layoutNodes.map((layoutNode) => [layoutNode.selector, layoutNode]))
  const ancestorIds = new Set<string>()
  let parentNode = nodeBySelector.get(selectedNode.parentSelector)

  while (parentNode && !ancestorIds.has(parentNode.id)) {
    ancestorIds.add(parentNode.id)
    parentNode = nodeBySelector.get(parentNode.parentSelector)
  }

  collapsedLayoutNodeIds.value = collapsedLayoutNodeIds.value.filter((nodeId) => !ancestorIds.has(nodeId))
}

/**
 * 현재 활성 인스펙터 항목을 목록 중앙으로 이동
 *
 * @param mode 스크롤할 인스펙터 모드
 * @returns 없음
 */
function scrollActiveItemIntoView(mode: HtmlInspectorMode) {
  nextTick(() => {
    const inspectorList = mode === 'elements' ? elementList.value : layoutList.value
    const activeSelector = mode === 'elements' ? '.element-list-item.active' : '.layout-node-item.active'
    const activeItem = inspectorList?.querySelector<HTMLElement>(activeSelector)

    if (!inspectorList || !activeItem) return

    const listRect = inspectorList.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()
    const itemCenterOffset = itemRect.top - listRect.top + (itemRect.height / 2)
    const targetScrollTop = inspectorList.scrollTop + itemCenterOffset - (inspectorList.clientHeight / 2)

    inspectorList.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' })
  })
}

/**
 * 레이아웃 노드 접힘 상태 전환
 *
 * @param layoutNode 접거나 펼칠 레이아웃 노드
 * @returns 없음
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
 * @returns 하위 레이아웃 노드가 있으면 true
 */
function hasLayoutChildren(layoutNode: ParsedHtmlLayoutNode) {
  return props.document.layoutNodes.some((node) => node.parentSelector === layoutNode.selector)
}

/**
 * 구조 카드의 활성 영역 클래스 조회
 *
 * @param layoutNode 활성 영역을 확인할 레이아웃 노드
 * @returns 활성 영역 클래스명
 */
function getLayoutNodeActiveRegionClass(layoutNode: ParsedHtmlLayoutNode) {
  const activeRegion = selectedLayoutActiveRegions.value.get(layoutNode.id)

  return activeRegion ? `${activeRegion}-active` : ''
}

/**
 * 선택 구조 범위의 배경과 시작/끝 테두리 클래스 조회
 *
 * @param layoutNode 범위 클래스를 확인할 레이아웃 노드
 * @returns 구조 범위 클래스 객체
 */
function getLayoutNodeScopeClasses(layoutNode: ParsedHtmlLayoutNode) {
  const isScopeNode = selectedLayoutScopeNodeIds.value.has(layoutNode.id)
  const isBranchNode = selectedLayoutHasDescendants.value
    && selectedLayoutActiveRegions.value.get(layoutNode.id) === 'branch'

  return {
    'scope-active': isScopeNode,
    'scope-start': isScopeNode && selectedLayoutScopeBounds.value.startNodeId === layoutNode.id,
    'scope-end': isScopeNode && selectedLayoutScopeBounds.value.endNodeId === layoutNode.id,
    'branch-scope-active': isBranchNode,
    'branch-scope-start': isBranchNode && selectedLayoutBranchBounds.value.startNodeId === layoutNode.id,
    'branch-scope-end': isBranchNode && selectedLayoutBranchBounds.value.endNodeId === layoutNode.id
  }
}

/**
 * 구조 카드의 레이아웃 태그 아이콘 조회
 *
 * @param layoutNode 아이콘을 조회할 레이아웃 노드
 * @returns 태그 유형에 대응하는 아이콘명
 */
function getLayoutNodeIcon(layoutNode: ParsedHtmlLayoutNode) {
  return LAYOUT_NODE_ICONS[layoutNode.tagName] || ''
}

/**
 * 선택 레이아웃과 같은 부모 아래에서 순서를 바꿀 수 있는 노드인지 확인
 *
 * @param layoutNode 드래그 아이콘 표시 여부를 확인할 레이아웃 노드
 * @returns 선택 노드 또는 이동 가능한 형제 노드이면 true
 */
function isLayoutNodeDragIconVisible(layoutNode: ParsedHtmlLayoutNode) {
  const selectedNode = props.document.layoutNodes.find((node) => node.id === props.selectedLayoutNodeId)

  return Boolean(selectedNode && selectedNode.parentSelector === layoutNode.parentSelector)
}

/**
 * 기준 레이아웃의 하위 접기 가능한 노드가 모두 접힌 상태인지 확인
 *
 * @param layoutNode 하위 구조 기준 레이아웃 노드
 * @returns 하위 접기 가능한 노드가 모두 접혔으면 true
 */
function areLayoutDescendantsCollapsed(layoutNode: ParsedHtmlLayoutNode) {
  const descendantNodeIds = getHtmlDescendantCollapsibleNodeIds(props.document.layoutNodes, layoutNode)

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
  const descendantNodeIds = getHtmlDescendantCollapsibleNodeIds(props.document.layoutNodes, layoutNode)

  if (areLayoutDescendantsCollapsed(layoutNode)) {
    collapsedLayoutNodeIds.value = collapsedLayoutNodeIds.value.filter((nodeId) => !descendantNodeIds.includes(nodeId))
    return
  }

  collapsedLayoutNodeIds.value = [...new Set([...collapsedLayoutNodeIds.value, ...descendantNodeIds])]
}

/**
 * 구조 목록 드래그 시작 전달
 *
 * @param layoutNode 드래그를 시작한 레이아웃 노드
 * @returns 없음
 */
function handleLayoutDragStart(layoutNode: ParsedHtmlLayoutNode) {
  emit('layout-drag-start', layoutNode)
}

/**
 * 구조 목록 드롭 요청 전달
 *
 * @param layoutNode 드롭 기준 레이아웃 노드
 * @param event 드롭 위치 계산에 사용하는 DragEvent
 * @returns 없음
 */
function handleLayoutDrop(layoutNode: ParsedHtmlLayoutNode, event: DragEvent) {
  if (!canDropLayoutNode(layoutNode)) return

  emit('move-layout', layoutNode.id, getLayoutDropPosition(event))
}

/**
 * 구조 목록 드롭 가능 여부 확인
 *
 * @param layoutNode 드롭 대상 레이아웃 노드
 * @returns 같은 부모의 다른 노드이면 true
 */
function canDropLayoutNode(layoutNode: ParsedHtmlLayoutNode) {
  if (!props.draggedLayoutNodeId || props.draggedLayoutNodeId === layoutNode.id) return false

  const draggedNode = props.document.layoutNodes.find((node) => node.id === props.draggedLayoutNodeId)

  return Boolean(draggedNode && draggedNode.parentSelector === layoutNode.parentSelector)
}

/**
 * 구조 목록 드롭 좌표 기준 앞/뒤 위치 계산
 *
 * @param event 드롭 이벤트
 * @returns 기준 노드 앞 또는 뒤 위치
 */
function getLayoutDropPosition(event: DragEvent): HtmlLayoutMovePosition {
  const target = event.currentTarget

  if (!(target instanceof HTMLElement)) return 'after'

  const rect = target.getBoundingClientRect()

  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

/**
 * 좌측 편집 요소 목록의 미리보기 문자열 생성
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
 * 편집 요소 유형에 맞는 아이콘명 조회
 *
 * @param element 아이콘을 결정할 파싱 요소 정보
 * @returns 요소 유형에 맞는 아이콘명
 */
function getElementIcon(element: ParsedHtmlEditableElement) {
  if (element.type === 'image') return 'ri-image-line'
  if (element.type === 'picture') return 'ri-landscape-line'
  if (element.type === 'video') return 'ri-video-line'
  if (element.type === 'link') return 'ri-link'

  return 'ri-text'
}

/** 선택 구조 변경 시 접힌 조상 노드 펼침 */
watch(
  () => props.selectedLayoutNodeId,
  (layoutNodeId) => {
    if (layoutNodeId) expandLayoutNodeAncestors(layoutNodeId)
  },
  { immediate: true }
)

/** 문서 구조 갱신 시 존재하지 않는 접힘 상태 제거 */
watch(
  () => props.document.layoutNodes,
  (layoutNodes) => {
    const currentNodeIds = new Set(layoutNodes.map((node) => node.id))

    collapsedLayoutNodeIds.value = collapsedLayoutNodeIds.value.filter((nodeId) => currentNodeIds.has(nodeId))
  }
)

/** 선택 항목 또는 모드 변경 시 활성 항목을 목록 가시 영역으로 이동 */
watch(
  [
    () => props.mode,
    () => props.selectedElementId,
    () => props.selectedLayoutNodeId
  ],
  ([mode]) => {
    scrollActiveItemIntoView(mode)
  }
)
</script>
