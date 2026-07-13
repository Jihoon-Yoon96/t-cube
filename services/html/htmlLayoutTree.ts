/**
 * HTML 편집기 구조 트리 계산
 * Vue 반응성과 DOM 접근 없이 레이아웃 노드 계층 정보 계산
 */
import type { ParsedHtmlLayoutNode } from './parseHtmlDocument'

export type HtmlLayoutActiveRegion = 'ancestor' | 'parent' | 'branch'

/**
 * 접힌 조상이 없는 레이아웃 노드 목록 조회
 *
 * @param layoutNodes 전체 레이아웃 노드 목록
 * @param collapsedNodeIds 접힌 레이아웃 노드 id 목록
 * @returns 구조 트리에 표시할 레이아웃 노드 목록
 */
export function getVisibleHtmlLayoutNodes(
  layoutNodes: ParsedHtmlLayoutNode[],
  collapsedNodeIds: string[]
) {
  const collapsedIds = new Set(collapsedNodeIds)
  const nodeBySelector = createLayoutNodeMap(layoutNodes)

  return layoutNodes.filter((node) => !hasCollapsedLayoutAncestor(node, collapsedIds, nodeBySelector))
}

/**
 * 선택 레이아웃의 최상위 조상부터 현재 노드까지의 계층 순서 조회
 *
 * @param layoutNodes 전체 레이아웃 노드 목록
 * @param selectedNodeId 선택 레이아웃 노드 id
 * @returns 레이아웃 노드 id별 계층 순서
 */
export function getHtmlLayoutHierarchyLevels(
  layoutNodes: ParsedHtmlLayoutNode[],
  selectedNodeId: string
) {
  const selectedNode = layoutNodes.find((node) => node.id === selectedNodeId)

  if (!selectedNode) return new Map<string, number>()

  const nodeBySelector = createLayoutNodeMap(layoutNodes)
  const hierarchyNodes: ParsedHtmlLayoutNode[] = []
  const visitedNodeIds = new Set<string>()
  let currentNode: ParsedHtmlLayoutNode | undefined = selectedNode

  while (currentNode && !visitedNodeIds.has(currentNode.id)) {
    hierarchyNodes.unshift(currentNode)
    visitedNodeIds.add(currentNode.id)
    currentNode = nodeBySelector.get(currentNode.parentSelector)
  }

  return new Map(hierarchyNodes.map((node, level) => [node.id, level]))
}

/**
 * 선택 노드 기준 상위 조상, 직접 부모, 현재 하위 영역 조회
 *
 * @param layoutNodes 전체 레이아웃 노드 목록
 * @param selectedNodeId 선택 레이아웃 노드 id
 * @returns 레이아웃 노드 id별 활성 영역
 */
export function getHtmlLayoutActiveRegions(
  layoutNodes: ParsedHtmlLayoutNode[],
  selectedNodeId: string
) {
  const selectedNode = layoutNodes.find((node) => node.id === selectedNodeId)
  const activeRegions = new Map<string, HtmlLayoutActiveRegion>()

  if (!selectedNode) return activeRegions

  const nodeBySelector = createLayoutNodeMap(layoutNodes)
  const visitedNodeIds = new Set<string>()
  let parentNode = nodeBySelector.get(selectedNode.parentSelector)

  activeRegions.set(selectedNode.id, 'branch')
  layoutNodes.forEach((layoutNode) => {
    if (isHtmlLayoutNodeDescendantOf(layoutNode, selectedNode, nodeBySelector)) {
      activeRegions.set(layoutNode.id, 'branch')
    }
  })

  if (parentNode) {
    activeRegions.set(parentNode.id, 'parent')
    visitedNodeIds.add(parentNode.id)
    parentNode = nodeBySelector.get(parentNode.parentSelector)
  }

  while (parentNode && !visitedNodeIds.has(parentNode.id)) {
    activeRegions.set(parentNode.id, 'ancestor')
    visitedNodeIds.add(parentNode.id)
    parentNode = nodeBySelector.get(parentNode.parentSelector)
  }

  return activeRegions
}

/**
 * 선택 노드가 속한 최상위 조상과 전체 하위 노드 범위 조회
 *
 * @param layoutNodes 전체 레이아웃 노드 목록
 * @param selectedNodeId 선택 레이아웃 노드 id
 * @returns 선택 노드가 포함된 최상위 구조 범위의 노드 id 집합
 */
export function getHtmlLayoutScopeNodeIds(
  layoutNodes: ParsedHtmlLayoutNode[],
  selectedNodeId: string
) {
  const hierarchyLevels = getHtmlLayoutHierarchyLevels(layoutNodes, selectedNodeId)
  const topmostHierarchyNodeId = hierarchyLevels.keys().next().value as string | undefined
  const topmostHierarchyNode = layoutNodes.find((node) => node.id === topmostHierarchyNodeId)
  const scopeNodeIds = new Set<string>()

  if (!topmostHierarchyNode) return scopeNodeIds

  const nodeBySelector = createLayoutNodeMap(layoutNodes)

  scopeNodeIds.add(topmostHierarchyNode.id)
  layoutNodes.forEach((layoutNode) => {
    if (isHtmlLayoutNodeDescendantOf(layoutNode, topmostHierarchyNode, nodeBySelector)) {
      scopeNodeIds.add(layoutNode.id)
    }
  })

  return scopeNodeIds
}

/**
 * 하위 레이아웃을 가진 노드 id 목록 조회
 *
 * @param layoutNodes 전체 레이아웃 노드 목록
 * @returns 접기 가능한 레이아웃 노드 id 목록
 */
export function getHtmlCollapsibleLayoutNodeIds(layoutNodes: ParsedHtmlLayoutNode[]) {
  const parentSelectors = new Set(layoutNodes.map((layoutNode) => layoutNode.parentSelector))

  return layoutNodes
    .filter((layoutNode) => parentSelectors.has(layoutNode.selector))
    .map((layoutNode) => layoutNode.id)
}

/**
 * 기준 레이아웃의 하위 접기 가능한 노드 id 목록 조회
 *
 * @param layoutNodes 전체 레이아웃 노드 목록
 * @param ancestorNode 하위 구조 기준 레이아웃 노드
 * @returns 하위 접기 가능한 레이아웃 노드 id 목록
 */
export function getHtmlDescendantCollapsibleNodeIds(
  layoutNodes: ParsedHtmlLayoutNode[],
  ancestorNode: ParsedHtmlLayoutNode
) {
  const nodeBySelector = createLayoutNodeMap(layoutNodes)
  const collapsibleNodeIds = new Set(getHtmlCollapsibleLayoutNodeIds(layoutNodes))

  return layoutNodes
    .filter((node) => collapsibleNodeIds.has(node.id))
    .filter((node) => isHtmlLayoutNodeDescendantOf(node, ancestorNode, nodeBySelector))
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
export function isHtmlLayoutNodeDescendantOf(
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
 * selector 기준 레이아웃 노드 조회 맵 생성
 *
 * @param layoutNodes 전체 레이아웃 노드 목록
 * @returns selector별 레이아웃 노드 조회 맵
 */
function createLayoutNodeMap(layoutNodes: ParsedHtmlLayoutNode[]) {
  return new Map(layoutNodes.map((node) => [node.selector, node]))
}

/**
 * 접힌 조상 노드 존재 여부 확인
 *
 * @param layoutNode 표시 여부를 확인할 레이아웃 노드
 * @param collapsedIds 접힌 레이아웃 노드 id 집합
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
