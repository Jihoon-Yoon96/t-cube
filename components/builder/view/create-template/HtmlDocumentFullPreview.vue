<template>
  <section
    class="html-document-full-preview"
    role="dialog"
    aria-modal="true"
    aria-label="HTML 결과물 미리보기"
  >
    <header class="html-document-full-preview-header">
      <div></div>

      <div class="html-document-full-preview-viewports" aria-label="미리보기 화면 크기">
        <button
          v-for="viewport in viewportModes"
          :key="viewport.key"
          class="html-document-full-preview-device"
          :class="{ active: activeViewport === viewport.key }"
          type="button"
          :aria-label="viewport.label"
          :title="viewport.label"
          @click="emit('update:activeViewport', viewport.key)"
        >
          <TcubeIcon :icon="viewport.icon" />
          <span>{{ viewport.shortLabel }}</span>
        </button>
      </div>

      <button
        ref="closeButton"
        class="html-document-full-preview-close"
        type="button"
        aria-label="미리보기 닫기"
        @click="emit('close')"
      >
        <TcubeIcon icon="ri-close-line" />
        <span>닫기</span>
      </button>
    </header>

    <main class="html-document-full-preview-stage">
      <iframe
        class="html-document-full-preview-frame"
        :style="{ width: frameWidth }"
        :srcdoc="previewHtml"
        title="최종 HTML 미리보기"
        sandbox="allow-same-origin allow-popups allow-forms"
      ></iframe>
    </main>
  </section>
</template>

<script setup lang="ts">
import { renderFinalHtmlDocument } from '~/services/html/parseHtmlDocument'
import type { BuilderViewportMode, ParsedHtmlDocument } from '~/stores/builder'

const props = defineProps<{
  document: ParsedHtmlDocument
  activeViewport: BuilderViewportMode
  viewportModes: Array<{
    key: BuilderViewportMode
    label: string
    shortLabel: string
    icon: string
  }>
}>()

const emit = defineEmits<{
  'update:activeViewport': [value: BuilderViewportMode]
  close: []
}>()

const closeButton = ref<HTMLButtonElement | null>(null)
let previousBodyOverflow = ''

/** 에디터 전용 속성을 제외한 최종 HTML 결과물 */
const previewHtml = computed(() => renderFinalHtmlDocument(props.document))

/** 선택한 viewport에 대응하는 미리보기 iframe 너비 */
const frameWidth = computed(() => {
  if (props.activeViewport === 'tablet') return '768px'
  if (props.activeViewport === 'mobile') return '390px'

  return '100%'
})

/**
 * Escape 입력 시 전체 화면 미리보기 닫기
 *
 * @param event 키보드 입력 이벤트
 * @returns 없음
 */
function handlePreviewKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

/** 전체 화면 미리보기 진입 시 배경 스크롤 잠금과 닫기 버튼 포커스 */
onMounted(() => {
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handlePreviewKeydown)
  nextTick(() => closeButton.value?.focus())
})

/** 전체 화면 미리보기 종료 시 배경 스크롤과 키보드 이벤트 복원 */
onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
  window.removeEventListener('keydown', handlePreviewKeydown)
})
</script>

<style scoped>
.html-document-full-preview {
  --accent: #8b91ff;
  --text-primary: #dfe3ff;
  --text-muted: #727da8;
  position: fixed;
  inset: 0;
  z-index: 1000;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: 74px minmax(0, 1fr);
  background: #0f1326;
}

.html-document-full-preview-header {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) auto minmax(120px, 1fr);
  align-items: center;
  border-bottom: 1px solid rgba(174, 183, 232, 0.12);
  background: rgba(17, 21, 40, 0.98);
  padding: 0 24px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.2);
}

.html-document-full-preview-viewports {
  justify-self: center;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border: 1px solid rgba(174, 183, 232, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
}

.html-document-full-preview-device {
  min-width: 82px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-muted);
  padding: 0 10px;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.2s ease;
}

.html-document-full-preview-device i {
  font-size: 17px;
  line-height: 1;
}

.html-document-full-preview-device:hover {
  background: rgba(139, 145, 255, 0.12);
  color: var(--accent);
}

.html-document-full-preview-device.active {
  background: rgba(139, 145, 255, 0.2);
  color: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(139, 145, 255, 0.28);
}

.html-document-full-preview-close {
  justify-self: end;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(174, 183, 232, 0.14);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  padding: 0 13px;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.html-document-full-preview-close:hover,
.html-document-full-preview-close:focus-visible {
  border-color: rgba(139, 145, 255, 0.42);
  background: rgba(139, 145, 255, 0.14);
  color: #ffffff;
  outline: none;
}

.html-document-full-preview-close i {
  font-size: 18px;
}

.html-document-full-preview-stage {
  min-width: 0;
  min-height: 0;
  display: flex;
  justify-content: center;
  overflow: auto;
  padding: 18px 24px 24px;
  background-color: #10152b;
  background-image:
    linear-gradient(45deg, rgba(255, 255, 255, 0.025) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.025) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.025) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.025) 75%);
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  background-size: 16px 16px;
}

.html-document-full-preview-frame {
  flex: 0 0 auto;
  height: 100%;
  min-height: 0;
  border: 1px solid rgba(174, 183, 232, 0.2);
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.32);
}

@media (max-width: 760px) {
  .html-document-full-preview {
    grid-template-rows: auto minmax(0, 1fr);
  }

  .html-document-full-preview-header {
    grid-template-columns: 1fr auto;
    gap: 10px;
    padding: 12px;
  }

  .html-document-full-preview-header > div:first-child {
    display: none;
  }

  .html-document-full-preview-viewports {
    justify-self: stretch;
  }

  .html-document-full-preview-device {
    min-width: 0;
    flex: 1;
    padding: 0 7px;
  }

  .html-document-full-preview-close {
    padding: 0 10px;
  }

  .html-document-full-preview-close span {
    display: none;
  }

  .html-document-full-preview-stage {
    justify-content: flex-start;
    padding: 12px;
  }
}
</style>
