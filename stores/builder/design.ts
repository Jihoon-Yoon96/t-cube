/**
 * 템플릿 생성 화면 중 "디자인 시안 작성" 흐름에서
 * 사용자가 선택한 작성 방식과 AI 생성 상태를 관리
 */


import type { BuilderDesignMethod, BuilderLayoutBlock, BuilderLayoutBlockType, BuilderView } from './type/types'

/**
 * 디자인 시안 작성 상태 구성
 * 작성 방식, AI 상태, 레이아웃 블록 상태 관리
 *
 * @param currentView 현재 빌더 화면 ref
 * @returns 디자인 시안 작성 상태와 레이아웃 블록 변경 API
 */
export function useBuilderDesignState(currentView: Ref<BuilderView>) {
  const selectedDesignMethod = ref<BuilderDesignMethod | null>(null)
  const aiStatus = ref<'idle' | 'generating' | 'complete' | 'error'>('idle')
  const layoutBlocks = ref<BuilderLayoutBlock[]>([])
  const selectedLayoutBlockId = ref<string | null>(null)

  /**
   * 현재 선택된 레이아웃 블록
   *
   * @returns 선택된 블록, 없으면 null
   */
  const selectedLayoutBlock = computed(() => (
    layoutBlocks.value.find((block) => block.id === selectedLayoutBlockId.value) || null
  ))

  /**
   * 디자인 시안 작성 방식 선택
   * 작성 화면으로 currentView 변경
   *
   * @param method 선택할 작성 방식
   */
  function selectDesignMethod(method: BuilderDesignMethod) {
    selectedDesignMethod.value = method
    currentView.value = 'ai-design'
  }

  /**
   * 레이아웃 블록 추가
   * 생성된 블록을 즉시 선택 상태로 변경
   *
   * @param type 추가할 레이아웃 블록 유형
   */
  function addLayoutBlock(type: BuilderLayoutBlockType) {
    const nextBlock = createLayoutBlock(type)

    layoutBlocks.value.push(nextBlock)
    selectedLayoutBlockId.value = nextBlock.id
  }

  /**
   * 레이아웃 블록 선택
   *
   * @param blockId 선택할 블록 id
   */
  function selectLayoutBlock(blockId: string) {
    selectedLayoutBlockId.value = blockId
  }

  /**
   * 레이아웃 블록 속성 갱신
   *
   * @param blockId 변경할 블록 id
   * @param patch 블록에 반영할 변경 값
   */
  function updateLayoutBlock(blockId: string, patch: Partial<Omit<BuilderLayoutBlock, 'id'>>) {
    const block = layoutBlocks.value.find((item) => item.id === blockId)

    if (!block) return

    Object.assign(block, patch)
  }

  /**
   * 레이아웃 블록을 한 계층 앞으로 이동
   *
   * @param blockId 이동할 블록 id
   */
  function moveLayoutBlockForward(blockId: string) {
    moveLayoutBlockByOffset(blockId, 1)
  }

  /**
   * 레이아웃 블록을 한 계층 뒤로 이동
   *
   * @param blockId 이동할 블록 id
   */
  function moveLayoutBlockBackward(blockId: string) {
    moveLayoutBlockByOffset(blockId, -1)
  }

  /**
   * 레이아웃 블록을 최상위 계층으로 이동
   *
   * @param blockId 이동할 블록 id
   */
  function moveLayoutBlockToFront(blockId: string) {
    const orderedBlocks = getBlocksByLayer()
    const currentIndex = orderedBlocks.findIndex((block) => block.id === blockId)

    if (currentIndex < 0 || currentIndex === orderedBlocks.length - 1) return

    const [targetBlock] = orderedBlocks.splice(currentIndex, 1)

    orderedBlocks.push(targetBlock)
    normalizeLayoutBlockLayers(orderedBlocks)
  }

  /**
   * 레이아웃 블록을 최하위 계층으로 이동
   *
   * @param blockId 이동할 블록 id
   */
  function moveLayoutBlockToBack(blockId: string) {
    const orderedBlocks = getBlocksByLayer()
    const currentIndex = orderedBlocks.findIndex((block) => block.id === blockId)

    if (currentIndex <= 0) return

    const [targetBlock] = orderedBlocks.splice(currentIndex, 1)

    orderedBlocks.unshift(targetBlock)
    normalizeLayoutBlockLayers(orderedBlocks)
  }

  /**
   * 레이아웃 블록 삭제
   * 삭제 대상이 선택 블록이면 마지막 블록을 선택
   *
   * @param blockId 삭제할 블록 id
   */
  function removeLayoutBlock(blockId: string) {
    layoutBlocks.value = layoutBlocks.value.filter((block) => block.id !== blockId)

    if (selectedLayoutBlockId.value === blockId) {
      selectedLayoutBlockId.value = layoutBlocks.value.at(-1)?.id || null
    }
  }

  /**
   * 전체 레이아웃 블록 초기화
   */
  function clearLayoutBlocks() {
    layoutBlocks.value = []
    selectedLayoutBlockId.value = null
  }

  /**
   * 레이아웃 블록 생성
   * 프리셋과 현재 블록 개수 기준 초기 위치 설정
   *
   * @param type 생성할 레이아웃 블록 유형
   * @returns 새 레이아웃 블록
   */
  function createLayoutBlock(type: BuilderLayoutBlockType): BuilderLayoutBlock {
    const base = getLayoutBlockPreset(type)
    const index = layoutBlocks.value.length

    return {
      ...base,
      id: `layout-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      x: Math.min(620, 60 + (index % 3) * 34),
      y: Math.min(620, 60 + index * 34),
      zIndex: getNextLayerIndex()
    }
  }

  /**
   * 레이아웃 블록 유형별 프리셋 조회
   *
   * @param type 조회할 레이아웃 블록 유형
   * @returns id/좌표/계층값을 제외한 블록 기본값
   */
  function getLayoutBlockPreset(type: BuilderLayoutBlockType): Omit<BuilderLayoutBlock, 'id' | 'x' | 'y' | 'zIndex'> {
    const presets: Record<BuilderLayoutBlockType, Omit<BuilderLayoutBlock, 'id' | 'x' | 'y' | 'zIndex'>> = {
      rectangle: {
        type: 'rectangle',
        label: '',
        description: '',
        backgroundColor: '#ffffff',
        width: 260,
        height: 150
      },
      circle: {
        type: 'circle',
        label: '',
        description: '',
        backgroundColor: '#eef0ff',
        width: 150,
        height: 150
      },
      triangle: {
        type: 'triangle',
        label: '',
        description: '',
        backgroundColor: '#8b91ff',
        width: 150,
        height: 130
      },
      line: {
        type: 'line',
        label: '',
        description: '',
        backgroundColor: '#8b91ff',
        width: 260,
        height: 10
      },
      header: {
        type: 'header',
        label: '헤더',
        description: '브랜드명과 주요 메뉴가 들어가는 상단 영역',
        backgroundColor: '#ffffff',
        width: 760,
        height: 86
      },
      text: {
        type: 'text',
        label: '텍스트',
        description: '제목 또는 본문 설명 영역',
        backgroundColor: '#ffffff',
        width: 340,
        height: 120
      },
      image: {
        type: 'image',
        label: '이미지',
        description: '대표 이미지 또는 콘텐츠 이미지 영역',
        backgroundColor: '#eef0ff',
        width: 320,
        height: 210
      },
      button: {
        type: 'button',
        label: '버튼',
        description: '주요 액션 버튼',
        backgroundColor: '#6168ff',
        width: 180,
        height: 58
      },
      card: {
        type: 'card',
        label: '카드',
        description: '반복 콘텐츠 또는 기능 설명 카드',
        backgroundColor: '#ffffff',
        width: 250,
        height: 180
      },
      banner: {
        type: 'banner',
        label: '배너',
        description: '강조 메시지와 CTA가 들어가는 넓은 영역',
        backgroundColor: '#7763ff',
        width: 700,
        height: 180
      }
    }

    return presets[type]
  }

  /**
   * 레이아웃 블록 계층 순서 이동
   *
   * @param blockId 이동할 블록 id
   * @param offset 이동 방향, 1은 앞으로 -1은 뒤로
   */
  function moveLayoutBlockByOffset(blockId: string, offset: -1 | 1) {
    const orderedBlocks = getBlocksByLayer()
    const currentIndex = orderedBlocks.findIndex((block) => block.id === blockId)
    const nextIndex = currentIndex + offset

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedBlocks.length) return

    const currentBlock = orderedBlocks[currentIndex]

    orderedBlocks[currentIndex] = orderedBlocks[nextIndex]
    orderedBlocks[nextIndex] = currentBlock
    normalizeLayoutBlockLayers(orderedBlocks)
  }

  /**
   * 레이아웃 블록 계층 정렬
   *
   * @returns zIndex 오름차순으로 정렬한 블록 목록
   */
  function getBlocksByLayer() {
    return [...layoutBlocks.value].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
  }

  /**
   * 레이아웃 블록 계층값 재정렬
   *
   * @param orderedBlocks zIndex 순서대로 정렬된 블록 목록
   */
  function normalizeLayoutBlockLayers(orderedBlocks = getBlocksByLayer()) {
    orderedBlocks.forEach((block, index) => {
      block.zIndex = index + 1
    })
  }

  /**
   * 다음 레이아웃 블록 계층값 계산
   *
   * @returns 현재 최대 zIndex 다음 값
   */
  function getNextLayerIndex() {
    return Math.max(0, ...layoutBlocks.value.map((block) => block.zIndex || 0)) + 1
  }

  return {
    selectedDesignMethod,
    aiStatus,
    layoutBlocks,
    selectedLayoutBlockId,
    selectedLayoutBlock,
    selectDesignMethod,
    addLayoutBlock,
    selectLayoutBlock,
    updateLayoutBlock,
    moveLayoutBlockForward,
    moveLayoutBlockBackward,
    moveLayoutBlockToFront,
    moveLayoutBlockToBack,
    removeLayoutBlock,
    clearLayoutBlocks
  }
}

