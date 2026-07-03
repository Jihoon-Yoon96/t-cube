/**
 * 템플릿 생성 단계 중 "디자인 시안 작성" 흐름에서
 * 사용자가 선택한 작성 방식과 AI 생성 상태를 관리
 */


import type { BuilderDesignMethod, BuilderLayoutBlock, BuilderLayoutBlockType, BuilderStep } from './type/types'

export function useBuilderDesignState(step: Ref<BuilderStep>) {
  const selectedDesignMethod = ref<BuilderDesignMethod | null>(null)
  const aiStatus = ref<'idle' | 'generating' | 'complete' | 'error'>('idle')
  const layoutBlocks = ref<BuilderLayoutBlock[]>([])
  const selectedLayoutBlockId = ref<string | null>(null)

  const selectedLayoutBlock = computed(() => (
    layoutBlocks.value.find((block) => block.id === selectedLayoutBlockId.value) || null
  ))

  function selectDesignMethod(method: BuilderDesignMethod) {
    selectedDesignMethod.value = method
    step.value = 'ai-design'
  }

  function addLayoutBlock(type: BuilderLayoutBlockType) {
    const nextBlock = createLayoutBlock(type)

    layoutBlocks.value.push(nextBlock)
    selectedLayoutBlockId.value = nextBlock.id
  }

  function selectLayoutBlock(blockId: string) {
    selectedLayoutBlockId.value = blockId
  }

  function updateLayoutBlock(blockId: string, patch: Partial<Omit<BuilderLayoutBlock, 'id'>>) {
    const block = layoutBlocks.value.find((item) => item.id === blockId)

    if (!block) return

    Object.assign(block, patch)
  }

  function moveLayoutBlockForward(blockId: string) {
    moveLayoutBlockByOffset(blockId, 1)
  }

  function moveLayoutBlockBackward(blockId: string) {
    moveLayoutBlockByOffset(blockId, -1)
  }

  function moveLayoutBlockToFront(blockId: string) {
    const orderedBlocks = getBlocksByLayer()
    const currentIndex = orderedBlocks.findIndex((block) => block.id === blockId)

    if (currentIndex < 0 || currentIndex === orderedBlocks.length - 1) return

    const [targetBlock] = orderedBlocks.splice(currentIndex, 1)

    orderedBlocks.push(targetBlock)
    normalizeLayoutBlockLayers(orderedBlocks)
  }

  function moveLayoutBlockToBack(blockId: string) {
    const orderedBlocks = getBlocksByLayer()
    const currentIndex = orderedBlocks.findIndex((block) => block.id === blockId)

    if (currentIndex <= 0) return

    const [targetBlock] = orderedBlocks.splice(currentIndex, 1)

    orderedBlocks.unshift(targetBlock)
    normalizeLayoutBlockLayers(orderedBlocks)
  }

  function removeLayoutBlock(blockId: string) {
    layoutBlocks.value = layoutBlocks.value.filter((block) => block.id !== blockId)

    if (selectedLayoutBlockId.value === blockId) {
      selectedLayoutBlockId.value = layoutBlocks.value.at(-1)?.id || null
    }
  }

  function clearLayoutBlocks() {
    layoutBlocks.value = []
    selectedLayoutBlockId.value = null
  }

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

  function getBlocksByLayer() {
    return [...layoutBlocks.value].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
  }

  function normalizeLayoutBlockLayers(orderedBlocks = getBlocksByLayer()) {
    orderedBlocks.forEach((block, index) => {
      block.zIndex = index + 1
    })
  }

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
