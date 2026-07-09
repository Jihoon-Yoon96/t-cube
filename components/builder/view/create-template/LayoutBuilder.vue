<template>
  <section class="layout-builder-screen">
    <div class="layout-builder-header">
      <div>
        <span class="section-title">LAYOUT DESIGN</span>
        <h1>레이아웃을 직접 배치해주세요</h1>
        <p>도형 블록을 추가하고 캔버스 위에 배치하면 HTML 초안으로 변환할 수 있습니다.</p>
      </div>

      <div class="layout-builder-actions">
        <button class="secondary-action" type="button" @click="handleSelectMethodAgain">
          <TcubeIcon icon="ri-arrow-left-line" />
          <span>방식 다시 선택</span>
        </button>
        <button
          class="primary-action"
          type="button"
          :disabled="!builderLayout.layoutBlocks.length"
          @click="builderLayoutDesignToHtml.generateHtmlFromLayoutDesign"
        >
          <TcubeIcon icon="ri-code-s-slash-line" />
          <span>HTML 생성</span>
        </button>
      </div>
    </div>

    <div class="layout-builder-workspace">
      <aside class="layout-builder-tools">
        <strong>블록 추가</strong>

        <details class="layout-tool-group" open>
          <summary>기본 도형</summary>
          <button
            v-for="tool in shapeTools"
            :key="tool.type"
            type="button"
            @click="builderLayout.addLayoutBlock(tool.type)"
          >
            <TcubeIcon :icon="tool.icon" />
            <span>{{ tool.label }}</span>
          </button>
        </details>

        <details class="layout-tool-group" open>
          <summary>컴포넌트</summary>
          <button
            v-for="tool in componentTools"
            :key="tool.type"
            type="button"
            @click="builderLayout.addLayoutBlock(tool.type)"
          >
            <TcubeIcon :icon="tool.icon" />
            <span>{{ tool.label }}</span>
          </button>
        </details>
      </aside>

      <div
        ref="canvasWrapRef"
        class="layout-builder-canvas-wrap"
        @wheel.prevent="handleCanvasWheel"
      >
        <div class="layout-builder-zoom">{{ Math.round(canvasScale * 100) }}%</div>
        <div class="layout-builder-canvas-stage">
          <div
            class="layout-builder-canvas"
            @pointerdown.self="clearSelection"
          >
            <div
              class="layout-builder-canvas-scroll"
              :style="canvasScrollStyle"
              @pointerdown.self="clearSelection"
            >
              <div
                ref="canvasRef"
                class="layout-builder-canvas-content"
                :style="canvasContentStyle"
                @pointerdown.self="clearSelection"
              >
                <button
                  v-for="block in builderLayout.layoutBlocks"
                  :key="block.id"
                  class="layout-builder-block"
                  :class="[
                    `layout-builder-block-${block.type}`,
                    {
                      'is-component': isComponentBlock(block.type),
                      'is-selected': block.id === builderLayout.selectedLayoutBlockId
                    }
                  ]"
                  type="button"
                  :style="getBlockStyle(block)"
                  @pointerdown="handleBlockPointerDown($event, block.id)"
                >
                  <span class="layout-builder-block-content">
                    <strong>{{ block.label }}</strong>
                    <small>{{ block.description }}</small>
                  </span>

                  <span
                    v-if="block.id === builderLayout.selectedLayoutBlockId"
                    class="resize-handle resize-handle-n"
                    @pointerdown.stop="handleResizePointerDown($event, block.id, 'n')"
                  />
                  <span
                    v-if="block.id === builderLayout.selectedLayoutBlockId"
                    class="resize-handle resize-handle-e"
                    @pointerdown.stop="handleResizePointerDown($event, block.id, 'e')"
                  />
                  <span
                    v-if="block.id === builderLayout.selectedLayoutBlockId"
                    class="resize-handle resize-handle-s"
                    @pointerdown.stop="handleResizePointerDown($event, block.id, 's')"
                  />
                  <span
                    v-if="block.id === builderLayout.selectedLayoutBlockId"
                    class="resize-handle resize-handle-w"
                    @pointerdown.stop="handleResizePointerDown($event, block.id, 'w')"
                  />
                  <span
                    v-if="block.id === builderLayout.selectedLayoutBlockId"
                    class="resize-handle resize-handle-se"
                    @pointerdown.stop="handleResizePointerDown($event, block.id, 'se')"
                  />
                </button>
              </div>
            </div>

            <div v-if="!builderLayout.layoutBlocks.length" class="layout-builder-empty">
              <TcubeIcon icon="ri-layout-2-line" />
              <strong>블록을 추가해 레이아웃을 그려보세요</strong>
              <span>왼쪽 도구에서 기본 도형과 컴포넌트를 추가할 수 있습니다.</span>
            </div>
          </div>
        </div>
      </div>

      <aside class="layout-builder-properties">
        <strong>속성</strong>

        <template v-if="selectedBlock">
          <label>
            <span>라벨</span>
            <input
              :value="selectedBlock.label"
              type="text"
              @input="updateSelectedBlock({ label: getInputValue($event) })"
            >
          </label>

          <label>
            <span>설명</span>
            <textarea
              :value="selectedBlock.description"
              rows="4"
              @input="updateSelectedBlock({ description: getInputValue($event) })"
            />
          </label>

          <div class="layout-builder-size-grid">
            <label>
              <span>너비</span>
              <input
                :value="selectedBlock.width"
                type="number"
                min="24"
                @input="updateSelectedSize({ width: getNumberInputValue($event) })"
              >
            </label>
            <label>
              <span>높이</span>
              <input
                :value="selectedBlock.height"
                type="number"
                min="8"
                @input="updateSelectedSize({ height: getNumberInputValue($event) })"
              >
            </label>
          </div>

          <label>
            <span>배경색</span>
            <div class="layout-builder-color-row">
              <input
                :value="selectedBlock.backgroundColor"
                type="color"
                @input="updateSelectedBlock({ backgroundColor: getInputValue($event) })"
              >
              <input
                :value="selectedBlock.backgroundColor"
                type="text"
                @input="updateSelectedBlock({ backgroundColor: getInputValue($event) })"
              >
            </div>
          </label>

          <div class="layout-builder-layer-control">
            <span>순서</span>
            <div class="layout-builder-layer-buttons">
              <button
                type="button"
                :disabled="!canMoveSelectedBlockBackward"
                @click="builderLayout.moveLayoutBlockBackward(selectedBlock.id)"
              >
                <TcubeIcon icon="ri-arrow-down-line" />
                <span>뒤로</span>
              </button>
              <button
                type="button"
                :disabled="!canMoveSelectedBlockForward"
                @click="builderLayout.moveLayoutBlockForward(selectedBlock.id)"
              >
                <TcubeIcon icon="ri-arrow-up-line" />
                <span>위로</span>
              </button>
              <button
                type="button"
                :disabled="!canMoveSelectedBlockForward"
                @click="builderLayout.moveLayoutBlockToFront(selectedBlock.id)"
              >
                <TcubeIcon icon="ri-bring-to-front" />
                <span>맨 위로</span>
              </button>
              <button
                type="button"
                :disabled="!canMoveSelectedBlockBackward"
                @click="builderLayout.moveLayoutBlockToBack(selectedBlock.id)"
              >
                <TcubeIcon icon="ri-send-to-back" />
                <span>맨 뒤로</span>
              </button>
            </div>
          </div>

          <button class="layout-builder-delete" type="button" @click="builderLayout.removeLayoutBlock(selectedBlock.id)">
            <TcubeIcon icon="ri-delete-bin-line" />
            <span>삭제</span>
          </button>
        </template>

        <p v-else>캔버스에서 블록을 선택하면 라벨, 설명, 크기, 배경색을 수정할 수 있습니다.</p>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useBuilderLayoutCanvas } from '~/composables/layout/useBuilderLayoutCanvas'
import { useBuilderLayoutDesignToHtml } from '~/composables/layout/useBuilderLayoutDesignToHtml'
import { useBuilderView } from '~/composables/view/useBuilderView'
import type { BuilderLayoutBlock, BuilderLayoutBlockType } from '~/stores/builder'

type DragState = {
  blockId: string
  startPointerX: number
  startPointerY: number
  startX: number
  startY: number
}

type ResizeDirection = 'n' | 'e' | 's' | 'w' | 'se'

type ResizeState = {
  blockId: string
  direction: ResizeDirection
  startPointerX: number
  startPointerY: number
  startX: number
  startY: number
  startWidth: number
  startHeight: number
}

const builderLayout = useBuilderLayoutCanvas()
const builderLayoutDesignToHtml = useBuilderLayoutDesignToHtml()
const builderView = useBuilderView()
const canvasWrapRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLElement | null>(null)
const dragState = ref<DragState | null>(null)
const resizeState = ref<ResizeState | null>(null)
const canvasScale = ref(1)
const canvasBaseWidth = 960
const canvasBaseHeight = 720
const canvasScaleIncrement = 0.05

const shapeTools: Array<{ type: BuilderLayoutBlockType, label: string, icon: string }> = [
  { type: 'rectangle', label: '사각형', icon: 'ri-rectangle-line' },
  { type: 'circle', label: '동그라미', icon: 'ri-circle-line' },
  { type: 'triangle', label: '세모', icon: 'ri-triangle-line' },
  { type: 'line', label: '선', icon: 'ri-subtract-line' }
]

const componentTools: Array<{ type: BuilderLayoutBlockType, label: string, icon: string }> = [
  { type: 'header', label: '헤더', icon: 'ri-layout-top-line' },
  { type: 'banner', label: '배너', icon: 'ri-layout-4-line' },
  { type: 'text', label: '텍스트', icon: 'ri-text' },
  { type: 'image', label: '이미지', icon: 'ri-image-line' },
  { type: 'button', label: '버튼', icon: 'ri-checkbox-blank-line' },
  { type: 'card', label: '카드', icon: 'ri-layout-grid-line' }
]

const selectedBlock = computed(() => builderLayout.selectedLayoutBlock)
const selectedBlockLayerIndex = computed(() => {
  if (!selectedBlock.value) return -1

  return [...builderLayout.layoutBlocks]
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    .findIndex((block) => block.id === selectedBlock.value?.id)
})
const canMoveSelectedBlockBackward = computed(() => selectedBlockLayerIndex.value > 0)
const canMoveSelectedBlockForward = computed(() => (
  selectedBlockLayerIndex.value >= 0 && selectedBlockLayerIndex.value < builderLayout.layoutBlocks.length - 1
))
const canvasScrollStyle = computed(() => ({
  width: `${canvasBaseWidth * canvasScale.value}px`,
  height: `${canvasBaseHeight * canvasScale.value}px`
}))
const canvasContentStyle = computed(() => ({
  transform: `scale(${canvasScale.value})`
}))

/**
 * 레이아웃 블록의 위치와 크기, 배경색, 반응형 글자 크기를 캔버스용 inline style로 변환
 *
 * @param block 캔버스에 표시할 레이아웃 블록
 * @returns 블록 위치와 크기 CSS 값
 */
function getBlockStyle(block: BuilderLayoutBlock) {
  const titleSize = clamp(Math.min(block.width / 11, block.height / 4.6), 8, 18)
  const descriptionSize = clamp(Math.min(block.width / 17, block.height / 7), 0, 12)
  const textColor = getReadableTextColor(block.backgroundColor)

  return {
    left: `${block.x}px`,
    top: `${block.y}px`,
    zIndex: block.zIndex || 1,
    width: `${block.width}px`,
    height: `${block.height}px`,
    backgroundColor: block.type === 'triangle' ? 'transparent' : block.backgroundColor,
    color: textColor,
    '--block-bg': block.backgroundColor,
    '--block-text-color': textColor,
    '--block-title-size': `${titleSize}px`,
    '--block-desc-size': `${descriptionSize}px`
  }
}

/**
 * 주어진 블록 타입이 컴포넌트 계열인지 확인
 *
 * @param type 확인할 블록 타입
 * @returns 컴포넌트 계열이면 true
 */
function isComponentBlock(type: BuilderLayoutBlockType) {
  return ['header', 'text', 'image', 'button', 'card', 'banner'].includes(type)
}

/**
 * 블록 선택 후 포인터 이동에 따라 드래그 상태를 시작
 *
 * @param event 드래그를 시작한 pointerdown 이벤트
 * @param blockId 드래그할 블록 id
 */
function handleBlockPointerDown(event: PointerEvent, blockId: string) {
  if (resizeState.value) return

  const block = builderLayout.layoutBlocks.find((item) => item.id === blockId)

  if (!block) return

  builderLayout.selectLayoutBlock(blockId)
  dragState.value = {
    blockId,
    startPointerX: event.clientX,
    startPointerY: event.clientY,
    startX: block.x,
    startY: block.y
  }

  window.addEventListener('pointermove', handleBlockPointerMove)
  window.addEventListener('pointerup', stopBlockDrag, { once: true })
}

/**
 * 현재 드래그 중인 블록의 좌표를 캔버스 범위 안에서 갱신
 *
 * @param event 포인터 이동 이벤트
 */
function handleBlockPointerMove(event: PointerEvent) {
  if (!dragState.value || !canvasRef.value) return

  const block = builderLayout.layoutBlocks.find((item) => item.id === dragState.value?.blockId)

  if (!block) return

  const nextX = dragState.value.startX + (event.clientX - dragState.value.startPointerX) / canvasScale.value
  const nextY = dragState.value.startY + (event.clientY - dragState.value.startPointerY) / canvasScale.value
  const maxX = canvasBaseWidth - block.width
  const maxY = canvasBaseHeight - block.height

  builderLayout.updateLayoutBlock(block.id, {
    x: clamp(nextX, 0, maxX),
    y: clamp(nextY, 0, maxY)
  })
}

/**
 * 선택 블록의 크기 조절 상태를 시작
 *
 * @param event 크기 조절 핸들을 누른 pointerdown 이벤트
 * @param blockId 크기를 조절할 블록 id
 * @param direction 크기 조절 방향
 */
function handleResizePointerDown(event: PointerEvent, blockId: string, direction: ResizeDirection) {
  const block = builderLayout.layoutBlocks.find((item) => item.id === blockId)

  if (!block) return

  builderLayout.selectLayoutBlock(blockId)
  resizeState.value = {
    blockId,
    direction,
    startPointerX: event.clientX,
    startPointerY: event.clientY,
    startX: block.x,
    startY: block.y,
    startWidth: block.width,
    startHeight: block.height
  }

  window.addEventListener('pointermove', handleResizePointerMove)
  window.addEventListener('pointerup', stopBlockResize, { once: true })
}

/**
 * 현재 크기 조절 중인 블록의 위치와 크기를 갱신
 *
 * @param event 포인터 이동 이벤트
 */
function handleResizePointerMove(event: PointerEvent) {
  if (!resizeState.value) return

  const block = builderLayout.layoutBlocks.find((item) => item.id === resizeState.value?.blockId)

  if (!block) return

  const deltaX = (event.clientX - resizeState.value.startPointerX) / canvasScale.value
  const deltaY = (event.clientY - resizeState.value.startPointerY) / canvasScale.value
  const patch: Partial<Omit<BuilderLayoutBlock, 'id'>> = {}

  if (resizeState.value.direction.includes('e')) {
    patch.width = clamp(resizeState.value.startWidth + deltaX, getMinWidth(block.type), canvasBaseWidth - block.x)
  }

  if (resizeState.value.direction.includes('s')) {
    patch.height = clamp(resizeState.value.startHeight + deltaY, getMinHeight(block.type), canvasBaseHeight - block.y)
  }

  if (resizeState.value.direction.includes('w')) {
    const nextWidth = clamp(resizeState.value.startWidth - deltaX, getMinWidth(block.type), resizeState.value.startX + resizeState.value.startWidth)
    patch.width = nextWidth
    patch.x = resizeState.value.startX + resizeState.value.startWidth - nextWidth
  }

  if (resizeState.value.direction.includes('n')) {
    const nextHeight = clamp(resizeState.value.startHeight - deltaY, getMinHeight(block.type), resizeState.value.startY + resizeState.value.startHeight)
    patch.height = nextHeight
    patch.y = resizeState.value.startY + resizeState.value.startHeight - nextHeight
  }

  builderLayout.updateLayoutBlock(block.id, patch)
}

/**
 * 현재 진행 중인 블록 드래그를 종료하고 전역 이벤트를 정리
 */
function stopBlockDrag() {
  dragState.value = null
  window.removeEventListener('pointermove', handleBlockPointerMove)
}

/**
 * 현재 진행 중인 크기 조절을 종료하고 전역 이벤트를 정리
 */
function stopBlockResize() {
  resizeState.value = null
  window.removeEventListener('pointermove', handleResizePointerMove)
}

/**
 * 선택된 블록의 속성을 수정
 *
 * @param patch 선택 블록에 반영할 속성 일부
 */
function updateSelectedBlock(patch: Partial<Omit<BuilderLayoutBlock, 'id'>>) {
  if (!selectedBlock.value) return

  builderLayout.updateLayoutBlock(selectedBlock.value.id, patch)
}

/**
 * 선택된 블록의 크기를 최소 크기 이상으로 보정하여 수정
 *
 * @param patch 선택 블록에 반영할 너비/높이 값
 */
function updateSelectedSize(patch: Partial<Pick<BuilderLayoutBlock, 'width' | 'height'>>) {
  if (!selectedBlock.value) return

  builderLayout.updateLayoutBlock(selectedBlock.value.id, {
    ...patch,
    width: patch.width ? Math.max(getMinWidth(selectedBlock.value.type), patch.width) : selectedBlock.value.width,
    height: patch.height ? Math.max(getMinHeight(selectedBlock.value.type), patch.height) : selectedBlock.value.height
  })
}

/**
 * 캔버스 휠 입력으로 확대/축소 배율을 5% 단위로 변경
 *
 * @param event 캔버스 영역의 wheel 이벤트
 */
function handleCanvasWheel(event: WheelEvent) {
  const direction = event.deltaY > 0 ? -canvasScaleIncrement : canvasScaleIncrement

  canvasScale.value = clamp(Number((canvasScale.value + direction).toFixed(2)), 0.4, 1.8)
}

/**
 * input 이벤트에서 문자열 값을 추출
 *
 * @param event 값을 읽을 input 이벤트
 * @returns 이벤트 대상의 문자열 값
 */
function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | HTMLTextAreaElement).value
}

/**
 * 배경색 밝기에 따라 내부 텍스트 색상을 흰색 또는 검은색으로 결정
 *
 * @param backgroundColor 대비를 계산할 CSS hex 색상값
 * @returns 어두운 배경이면 흰색, 밝은 배경이면 검은색
 */
function getReadableTextColor(backgroundColor?: string) {
  const rgb = parseHexColor(backgroundColor)

  if (!rgb) return '#111827'

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255

  return luminance > 0.58 ? '#111827' : '#ffffff'
}

/**
 * hex 색상 문자열을 RGB 값으로 변환
 *
 * @param value 변환할 hex 색상 문자열
 * @returns 변환된 RGB 값, 변환할 수 없으면 null
 */
function parseHexColor(value?: string) {
  if (!value) return null

  const hex = value.trim().replace('#', '')
  const normalizedHex = hex.length === 3
    ? hex.split('').map((char) => `${char}${char}`).join('')
    : hex

  if (!/^[\da-f]{6}$/i.test(normalizedHex)) return null

  return {
    r: Number.parseInt(normalizedHex.slice(0, 2), 16),
    g: Number.parseInt(normalizedHex.slice(2, 4), 16),
    b: Number.parseInt(normalizedHex.slice(4, 6), 16)
  }
}

/**
 * number input 이벤트에서 0 이상의 숫자 값을 추출
 *
 * @param event 값을 읽을 input 이벤트
 * @returns 정수 숫자 값
 */
function getNumberInputValue(event: Event) {
  return Math.max(0, Number((event.target as HTMLInputElement).value) || 0)
}

/**
 * 블록 타입별 최소 너비를 반환
 *
 * @param type 최소 너비를 확인할 블록 타입
 * @returns 최소 너비
 */
function getMinWidth(type: BuilderLayoutBlockType) {
  return type === 'line' ? 24 : 48
}

/**
 * 블록 타입별 최소 높이를 반환
 *
 * @param type 최소 높이를 확인할 블록 타입
 * @returns 최소 높이
 */
function getMinHeight(type: BuilderLayoutBlockType) {
  return type === 'line' ? 4 : 32
}

/**
 * 캔버스 빈 영역을 클릭했을 때 현재 선택을 해제
 */
function clearSelection() {
  builderLayout.clearLayoutBlockSelection()
}

/**
 * 디자인 작성 방식 선택 화면으로 돌아가기 위해 현재 선택된 작성 방식을 초기화
 */
function handleSelectMethodAgain() {
  builderView.setView('design-method')
}

/**
 * 값을 최소/최대 범위 안으로 제한
 *
 * @param value 제한할 값
 * @param min 허용 최소값
 * @param max 허용 최대값
 * @returns 범위 안으로 보정된 값
 */
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handleBlockPointerMove)
  window.removeEventListener('pointermove', handleResizePointerMove)
})
</script>

<style scoped>
.layout-builder-screen {
  min-height: calc(100vh - 142px);
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 18px;
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.035));
  padding: 28px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
}

.layout-builder-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.layout-builder-header h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 31px;
  line-height: 1.2;
  font-weight: 900;
}

.layout-builder-header p,
.layout-builder-properties p {
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
  font-weight: 700;
}

.layout-builder-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
}

.layout-builder-workspace {
  min-height: 0;
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr) 280px;
  gap: 16px;
}

.layout-builder-tools,
.layout-builder-properties {
  align-self: start;
  display: grid;
  gap: 10px;
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 12px;
  background: rgba(13, 16, 32, 0.4);
  padding: 16px;
}

.layout-builder-tools > strong,
.layout-builder-properties > strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 900;
}

.layout-tool-group {
  display: grid;
  gap: 8px;
}

.layout-tool-group summary {
  display: flex;
  align-items: center;
  min-height: 30px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.layout-tool-group[open] summary {
  color: var(--text-strong);
}

.layout-tool-group button,
.layout-builder-delete {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  border: 1px solid rgba(174, 183, 232, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.055);
  color: var(--text-primary);
  padding: 0 12px;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.layout-tool-group button:hover {
  border-color: rgba(139, 145, 255, 0.46);
  background: rgba(139, 145, 255, 0.15);
  color: #ffffff;
}

.layout-builder-canvas-wrap {
  position: relative;
  min-width: 0;
  overflow: auto;
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 12px;
  background:
    linear-gradient(45deg, rgba(255, 255, 255, 0.035) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.035) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.035) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.035) 75%);
  background-color: #151a31;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  background-size: 20px 20px;
  padding: 22px;
}

.layout-builder-zoom {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 3;
  width: max-content;
  border: 1px solid rgba(174, 183, 232, 0.18);
  border-radius: 8px;
  background: rgba(13, 16, 32, 0.86);
  color: var(--text-primary);
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 900;
}

.layout-builder-canvas-stage {
  position: relative;
  margin: 0 auto;
  width: 960px;
  max-width: 100%;
  height: 720px;
}

.layout-builder-canvas {
  width: 100%;
  height: 100%;
  overflow: auto;
  transform-origin: top left;
  border-radius: 12px;
  background: #f4f6fb;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.28);
}

.layout-builder-canvas-scroll {
  position: relative;
  min-width: 100%;
  min-height: 100%;
}

.layout-builder-canvas-content {
  position: absolute;
  inset: 0 auto auto 0;
  width: 960px;
  height: 720px;
  transform-origin: top left;
}

.layout-builder-block {
  position: absolute;
  display: grid;
  align-content: center;
  border: 2px solid rgba(97, 104, 255, 0.12);
  border-radius: 12px;
  background: #ffffff;
  color: #1a1f36;
  padding: 10px;
  font: inherit;
  text-align: left;
  cursor: grab;
  touch-action: none;
  box-shadow: 0 12px 28px rgba(32, 38, 69, 0.08);
}

.layout-builder-block:hover {
  cursor: move;
}

.layout-builder-block.is-selected {
  border-color: #6168ff;
  box-shadow: 0 0 0 3px rgba(97, 104, 255, 0.18), 0 12px 28px rgba(32, 38, 69, 0.12);
}

.layout-builder-block-content {
  min-width: 0;
  display: grid;
  gap: 5px;
  pointer-events: none;
}

.layout-builder-block strong {
  overflow: hidden;
  font-size: var(--block-title-size);
  line-height: 1.15;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-builder-block small {
  display: -webkit-box;
  overflow: hidden;
  color: color-mix(in srgb, var(--block-text-color) 74%, transparent);
  font-size: var(--block-desc-size);
  line-height: 1.35;
  font-weight: 700;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.layout-builder-block small:empty,
.layout-builder-block[style*="--block-desc-size: 0px"] small {
  display: none;
}

.layout-builder-block-button {
  place-items: center;
  text-align: center;
}

.layout-builder-block-image {
  place-items: center;
  text-align: center;
}

.layout-builder-block-circle {
  border-radius: 999px;
  place-items: center;
  text-align: center;
}

.layout-builder-block-triangle {
  place-items: center;
  border: 0;
  background: transparent;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.layout-builder-block-triangle::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--block-bg);
  content: "";
}

.layout-builder-block-line {
  min-height: 4px;
  border: 0;
  border-radius: 999px;
  padding: 0;
}

.layout-builder-block-line .layout-builder-block-content {
  display: none;
}

.resize-handle {
  position: absolute;
  z-index: 2;
  background: #ffffff;
  border: 2px solid #6168ff;
  border-radius: 999px;
}

.resize-handle-n,
.resize-handle-s {
  left: 50%;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  cursor: ns-resize;
}

.resize-handle-n {
  top: -7px;
}

.resize-handle-s {
  bottom: -7px;
}

.resize-handle-e,
.resize-handle-w {
  top: 50%;
  width: 12px;
  height: 12px;
  margin-top: -6px;
  cursor: ew-resize;
}

.resize-handle-e {
  right: -7px;
}

.resize-handle-w {
  left: -7px;
}

.resize-handle-se {
  right: -8px;
  bottom: -8px;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
}

.layout-builder-empty {
  height: 100%;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 10px;
  color: #69708a;
  text-align: center;
}

.layout-builder-empty i {
  color: #6168ff;
  font-size: 42px;
}

.layout-builder-empty strong {
  color: #202642;
  font-size: 17px;
  font-weight: 900;
}

.layout-builder-empty span {
  font-size: 13px;
  font-weight: 700;
}

.layout-builder-properties label {
  display: grid;
  gap: 7px;
}

.layout-builder-properties label span {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 900;
}

.layout-builder-layer-control {
  display: grid;
  gap: 8px;
}

.layout-builder-layer-control > span {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 900;
}

.layout-builder-layer-buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.layout-builder-layer-buttons button {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgba(174, 183, 232, 0.14);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.055);
  color: var(--text-primary);
  padding: 0 8px;
  font: inherit;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
}

.layout-builder-layer-buttons button:hover:not(:disabled) {
  border-color: rgba(139, 145, 255, 0.56);
  background: rgba(139, 145, 255, 0.16);
  color: #ffffff;
}

.layout-builder-layer-buttons button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.layout-builder-properties input,
.layout-builder-properties textarea {
  width: 100%;
  border: 1px solid rgba(174, 183, 232, 0.14);
  border-radius: 9px;
  background: rgba(13, 16, 32, 0.72);
  color: var(--text-primary);
  padding: 10px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  outline: none;
}

.layout-builder-properties input {
  height: 38px;
}

.layout-builder-properties input[type="color"] {
  width: 48px;
  flex: 0 0 48px;
  padding: 3px;
}

.layout-builder-properties textarea {
  resize: vertical;
}

.layout-builder-properties input:focus,
.layout-builder-properties textarea:focus {
  border-color: rgba(139, 145, 255, 0.62);
}

.layout-builder-size-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.layout-builder-color-row {
  display: flex;
  gap: 8px;
}

.layout-builder-delete {
  justify-content: center;
  border-color: rgba(255, 107, 129, 0.22);
  color: #ff9aab;
}

@media (max-width: 1100px) {
  .layout-builder-workspace {
    grid-template-columns: 1fr;
  }

  .layout-builder-tools {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .layout-builder-tools > strong {
    grid-column: 1 / -1;
  }
}
</style>
