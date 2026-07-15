<template>
  <section class="layout-generate-screen">
    <header class="layout-generate-toolbar">
      <div class="layout-generate-step">
        <span class="section-title">LAYOUT DESIGN · STEP 3</span>
      </div>

      <div class="layout-generate-actions">
        <button
          class="secondary-action"
          type="button"
          :disabled="layoutAiGeneration.isGenerating.value"
          @click="emit('back')"
        >
          <TcubeIcon icon="ri-arrow-left-line" />
          <span>레이아웃 수정</span>
        </button>
        <button
          class="primary-action"
          type="button"
          :disabled="layoutAiGeneration.isGenerating.value"
          @click="handleGenerate"
        >
          <TcubeIcon
            :class="{ 'rotating-icon': layoutAiGeneration.isGenerating.value }"
            :icon="layoutAiGeneration.isGenerating.value ? 'ri-loader-4-line' : 'ri-sparkling-2-line'"
          />
          <span>{{ layoutAiGeneration.isGenerating.value ? '생성 중' : '생성하기' }}</span>
        </button>
      </div>
    </header>

    <p v-if="layoutAiGeneration.generationError.value" class="layout-generate-error">
      {{ layoutAiGeneration.generationError.value }}
    </p>

    <main class="layout-generate-preview">
      <section class="layout-generate-brief-card">
        <div>
          <span>카테고리/브랜드</span>
          <strong>{{ brief.category }}</strong>
        </div>
        <div>
          <span>목적</span>
          <strong>{{ brief.purpose }}</strong>
        </div>
        <div>
          <span>화면</span>
          <strong>{{ viewportLabels[brief.viewport] }}</strong>
        </div>
        <div>
          <span>첨부자료</span>
          <strong>{{ brief.planningFile?.name || '없음' }}</strong>
        </div>
      </section>

      <section class="layout-generate-canvas-card">
        <div class="layout-generate-canvas-heading">
          <div>
            <span>LAYOUT PREVIEW</span>
            <strong>배치 레이아웃</strong>
          </div>
          <small>{{ blocks.length }}개 엘리먼트</small>
        </div>

        <div class="layout-generate-canvas">
          <div
            v-for="block in blocks"
            :key="block.id"
            class="layout-generate-block"
            :class="[`layout-generate-block-${block.type}`]"
            :style="getPreviewBlockStyle(block)"
          >
            <strong>{{ block.label }}</strong>
            <small v-if="block.description">{{ block.description }}</small>
          </div>

          <div v-if="!blocks.length" class="layout-generate-empty">
            <TcubeIcon icon="ri-layout-2-line" />
            <strong>배치된 엘리먼트가 없습니다</strong>
            <span>입력한 정보를 기준으로 AI가 전체 레이아웃을 구성합니다.</span>
          </div>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <div
        v-if="layoutAiGeneration.isGenerating.value"
        class="layout-generate-loading-dim"
        role="status"
        aria-live="polite"
        aria-label="AI 웹페이지 생성 중"
      >
        <div class="layout-generate-loading-card">
          <button
            class="layout-generate-loading-close"
            type="button"
            aria-label="AI 생성 취소하고 닫기"
            title="AI 생성 취소하고 닫기"
            @click="layoutAiGeneration.cancelLayoutDesignGeneration"
          >
            <TcubeIcon icon="ri-close-line" />
          </button>
          <span class="layout-generate-loading-icon">
            <TcubeIcon icon="ri-sparkling-2-line" />
          </span>
          <strong>AI가 웹페이지를 만들고 있습니다</strong>
          <p>입력 정보와 배치 레이아웃을 분석해 편집 가능한 HTML을 생성하는 중입니다.</p>
          <div class="layout-generate-loading-time">
            <TcubeIcon icon="ri-time-line" />
            <span>작업 소요 시간</span>
            <strong>{{ generationElapsedLabel }}</strong>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { useBuilderLayoutAiGeneration } from '~/composables/layout/useBuilderLayoutAiGeneration'
import type { BuilderLayoutBlock } from '~/stores/builder/type/types'
import type {
  BuilderLayoutDesignBrief,
  BuilderLayoutViewport
} from '~/types/builder/layout-design'

const props = defineProps<{
  brief: BuilderLayoutDesignBrief
  blocks: BuilderLayoutBlock[]
}>()

const emit = defineEmits<{
  back: []
}>()

const layoutAiGeneration = useBuilderLayoutAiGeneration()
const generationElapsedSeconds = ref(0)
let generationTimerId: ReturnType<typeof setInterval> | null = null

const viewportLabels: Record<BuilderLayoutViewport, string> = {
  pc: 'PC',
  mobile: 'Mobile',
  responsive: '반응형'
}

/** AI 생성 작업의 경과 시간을 분:초 형식으로 변환 */
const generationElapsedLabel = computed(() => {
  const minutes = Math.floor(generationElapsedSeconds.value / 60)
  const seconds = generationElapsedSeconds.value % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

/**
 * 레이아웃 블록 좌표와 시각 속성을 비율 기반 미리보기 스타일로 변환
 *
 * @param block 미리보기에 표시할 레이아웃 블록
 * @returns 위치, 크기, 색상 스타일
 */
function getPreviewBlockStyle(block: BuilderLayoutBlock) {
  const isText = block.type === 'text'
  const isTransparent = isText || block.type === 'triangle'

  return {
    left: `${(block.x / 960) * 100}%`,
    top: `${(block.y / 720) * 100}%`,
    zIndex: block.zIndex || 1,
    width: `${(block.width / 960) * 100}%`,
    height: `${(block.height / 720) * 100}%`,
    backgroundColor: isTransparent ? 'transparent' : block.backgroundColor,
    color: getReadableTextColor(block.backgroundColor),
    '--preview-bg': block.backgroundColor
  }
}

/**
 * 배경색 밝기에 따른 미리보기 텍스트 색상 계산
 *
 * @param backgroundColor CSS hex 배경색
 * @returns 대비 가능한 흰색 또는 검은색
 */
function getReadableTextColor(backgroundColor: string) {
  const hex = backgroundColor.trim().replace('#', '')
  const normalizedHex = hex.length === 3
    ? hex.split('').map((char) => `${char}${char}`).join('')
    : hex

  if (!/^[\da-f]{6}$/i.test(normalizedHex)) return '#111827'

  const red = Number.parseInt(normalizedHex.slice(0, 2), 16)
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16)
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255

  return luminance > 0.58 ? '#111827' : '#ffffff'
}

/** 입력 정보와 레이아웃 기반 AI HTML 디자인 생성 */
function handleGenerate() {
  layoutAiGeneration.generateLayoutDesign(
    props.brief,
    props.blocks
  )
}

/** 생성 작업 경과 시간 측정 시작 */
function startGenerationTimer() {
  stopGenerationTimer()
  generationElapsedSeconds.value = 0
  generationTimerId = setInterval(() => {
    generationElapsedSeconds.value += 1
  }, 1000)
}

/** 생성 작업 경과 시간 측정 종료 */
function stopGenerationTimer() {
  if (!generationTimerId) return

  clearInterval(generationTimerId)
  generationTimerId = null
}

/** AI 생성 상태에 따른 경과 시간 타이머 시작 및 종료 */
watch(() => layoutAiGeneration.isGenerating.value, (isGenerating) => {
  if (isGenerating) {
    startGenerationTimer()
    return
  }

  stopGenerationTimer()
})

/** 화면 해제 시 생성 경과 시간 타이머 정리 */
onBeforeUnmount(() => {
  stopGenerationTimer()
})
</script>

<style scoped>
.layout-generate-screen {
  min-height: calc(100vh - 142px);
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.035));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
}

.layout-generate-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  min-height: 92px;
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(240px, 1fr);
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid rgba(174, 183, 232, 0.12);
  border-radius: 14px 14px 0 0;
  background: rgba(16, 20, 40, 0.94);
  padding: 14px 20px;
  backdrop-filter: blur(16px);
}

.layout-generate-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.layout-generate-actions {
  justify-content: flex-end;
}

.layout-generate-error {
  width: min(960px, calc(100% - 40px));
  margin: 18px auto 0;
  border: 1px solid rgba(255, 107, 129, 0.22);
  border-radius: 10px;
  background: rgba(255, 107, 129, 0.08);
  color: #ff9aab;
  padding: 11px 14px;
  font-size: 12px;
  font-weight: 800;
}

.layout-generate-preview {
  width: min(960px, calc(100% - 40px));
  display: grid;
  gap: 18px;
  margin: 0 auto;
  padding: 28px 0 40px;
}

.layout-generate-brief-card {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid rgba(174, 183, 232, 0.12);
  border-radius: 12px;
  background: rgba(13, 16, 32, 0.48);
}

.layout-generate-brief-card > div {
  min-width: 0;
  display: grid;
  gap: 6px;
  border-right: 1px solid rgba(174, 183, 232, 0.1);
  padding: 15px;
}

.layout-generate-brief-card > div:last-child {
  border-right: 0;
}

.layout-generate-brief-card span {
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 900;
}

.layout-generate-brief-card strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-generate-canvas-card {
  overflow: hidden;
  border: 1px solid rgba(174, 183, 232, 0.12);
  border-radius: 12px;
  background: rgba(13, 16, 32, 0.48);
}

.layout-generate-canvas-heading {
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid rgba(174, 183, 232, 0.1);
  padding: 0 18px;
}

.layout-generate-canvas-heading > div {
  display: grid;
  gap: 3px;
}

.layout-generate-canvas-heading span,
.layout-generate-canvas-heading small {
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 900;
}

.layout-generate-canvas-heading strong {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 900;
}

.layout-generate-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #f4f6fb;
}

.layout-generate-block {
  position: absolute;
  display: grid;
  align-content: center;
  gap: 4px;
  overflow: hidden;
  border: 1px solid rgba(97, 104, 255, 0.14);
  border-radius: 10px;
  padding: 1.5%;
  font-size: clamp(7px, 1.2vw, 14px);
}

.layout-generate-block > strong,
.layout-generate-block > small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-generate-block > small {
  font-size: 0.72em;
  opacity: 0.72;
}

.layout-generate-block-circle {
  border-radius: 999px;
  place-content: center;
  text-align: center;
}

.layout-generate-block-triangle {
  border: 0;
  background: var(--preview-bg) !important;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  place-content: center;
  text-align: center;
}

.layout-generate-block-line {
  border: 0;
  border-radius: 999px;
  padding: 0;
}

.layout-generate-block-line > * {
  display: none;
}

.layout-generate-block-text {
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
}

.layout-generate-block-button,
.layout-generate-block-image {
  place-content: center;
  text-align: center;
}

.layout-generate-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 9px;
  color: #69708a;
  text-align: center;
}

.layout-generate-empty i {
  color: #6168ff;
  font-size: 38px;
}

.layout-generate-empty strong {
  color: #202642;
  font-size: 15px;
}

.layout-generate-empty span {
  font-size: 11px;
  font-weight: 700;
}

.layout-generate-loading-dim {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: grid;
  place-items: center;
  background: rgba(6, 8, 20, 0.82);
  padding: 24px;
  backdrop-filter: blur(8px);
}

.layout-generate-loading-card {
  position: relative;
  width: min(440px, 100%);
  display: grid;
  justify-items: center;
  gap: 14px;
  border: 1px solid rgba(139, 145, 255, 0.28);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(31, 36, 72, 0.98), rgba(15, 19, 42, 0.98));
  padding: 38px 30px 30px;
  text-align: center;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.48);
}

.layout-generate-loading-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(199, 204, 239, 0.18);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.07);
  color: #dfe2ff;
  padding: 0;
  font: inherit;
  font-size: 19px;
  cursor: pointer;
  transition: 0.2s ease;
}

.layout-generate-loading-close:hover {
  border-color: rgba(199, 204, 239, 0.36);
  background: rgba(255, 255, 255, 0.13);
  color: #ffffff;
}

.layout-generate-loading-close:focus-visible {
  outline: 2px solid #aeb2ff;
  outline-offset: 2px;
}

.layout-generate-loading-icon {
  width: 70px;
  height: 70px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(139, 145, 255, 0.34);
  border-radius: 20px;
  background: rgba(139, 145, 255, 0.14);
  color: #aeb2ff;
  font-size: 34px;
  animation: layout-generate-pulse 1.5s ease-in-out infinite;
}

.layout-generate-loading-card > strong {
  color: #ffffff;
  font-size: 19px;
  line-height: 1.35;
  font-weight: 900;
}

.layout-generate-loading-card > p {
  max-width: 350px;
  margin: -4px 0 4px;
  color: #c5cae3;
  font-size: 12px;
  line-height: 1.6;
  font-weight: 700;
}

.layout-generate-loading-time {
  min-width: 210px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(174, 183, 232, 0.14);
  border-radius: 11px;
  background: rgba(6, 8, 20, 0.3);
  color: #c5cae3;
  padding: 11px 13px;
  font-size: 11px;
  font-weight: 800;
  text-align: left;
}

.layout-generate-loading-time i {
  color: #aeb2ff;
  font-size: 16px;
}

.layout-generate-loading-time strong {
  color: #ffffff;
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  font-weight: 900;
}

@keyframes layout-generate-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(139, 145, 255, 0.2);
  }

  50% {
    transform: scale(1.06);
    box-shadow: 0 0 0 12px rgba(139, 145, 255, 0);
  }
}

@media (max-width: 980px) {
  .layout-generate-toolbar {
    grid-template-columns: 1fr;
  }

  .layout-generate-step {
    display: none;
  }

  .layout-generate-actions {
    flex-wrap: wrap;
    justify-content: center;
  }
}

@media (max-width: 700px) {
  .layout-generate-actions > button {
    flex: 1 1 auto;
    justify-content: center;
  }

  .layout-generate-brief-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .layout-generate-brief-card > div:nth-child(2) {
    border-right: 0;
  }

  .layout-generate-brief-card > div:nth-child(-n + 2) {
    border-bottom: 1px solid rgba(174, 183, 232, 0.1);
  }
}
</style>
