<template>
  <div class="top-toolbar">
    <div class="history-actions" aria-label="편집 도구">
      <button
        v-if="sidebarCollapsed"
        class="history-btn sidebar-expand-btn"
        type="button"
        aria-label="사이드바 펼치기"
        title="사이드바 펼치기"
        @click="emit('expandSidebar')"
      >
        <TcubeIcon icon="ri-sidebar-unfold-line" />
      </button>

      <button
        class="history-btn"
        type="button"
        aria-label="뒤돌리기"
        title="뒤돌리기"
        :disabled="!canUndo"
        @click="emit('undo')"
      >
        <TcubeIcon icon="ri-arrow-go-back-line" />
      </button>

      <button
        class="history-btn"
        type="button"
        aria-label="재실행"
        title="재실행"
        :disabled="!canRedo"
        @click="emit('redo')"
      >
        <TcubeIcon icon="ri-arrow-go-forward-line" />
      </button>
    </div>

    <div class="top-toolbar-icons" aria-label="Viewport">
      <button
        v-for="viewport in viewportModes"
        :key="viewport.key"
        class="device-btn"
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

    <div class="top-actions">
      <div ref="downloadMenuRef" class="toolbar-download">
        <button
          class="toolbar-btn"
          type="button"
          aria-haspopup="menu"
          :aria-expanded="showDownloadMenu"
          @click="toggleDownloadMenu"
        >
          <TcubeIcon icon="ri-download-2-line" />
          <span>다운로드</span>
          <TcubeIcon :icon="showDownloadMenu ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'" />
        </button>

        <div v-if="showDownloadMenu" class="toolbar-download-menu" role="menu">
          <button
            v-for="option in downloadOptions"
            :key="option.type"
            type="button"
            role="menuitem"
            @click="selectDownloadType(option.type)"
          >
            <TcubeIcon :icon="option.icon" />
            <span>
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </span>
          </button>
        </div>
      </div>

      <button class="toolbar-btn" type="button" @click="emit('preview')">
        <TcubeIcon icon="ri-eye-line" />
        <span>미리보기</span>
      </button>

      <button class="toolbar-btn primary" type="button" @click="emit('save')">
        <TcubeIcon icon="ri-save-3-line" />
        <span>저장</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import type { BuilderDownloadType } from '~/types/builder/download'

type ViewportMode = 'desktop' | 'tablet' | 'mobile'

defineProps<{
  activeViewport: ViewportMode
  canUndo: boolean
  canRedo: boolean
  sidebarCollapsed: boolean
  viewportModes: Array<{
    key: ViewportMode
    label: string
    shortLabel: string
    icon: string
  }>
}>()

const emit = defineEmits<{
  'update:activeViewport': [value: ViewportMode]
  expandSidebar: []
  undo: []
  redo: []
  download: [type: BuilderDownloadType]
  preview: []
  save: []
}>()

const downloadMenuRef = ref<HTMLElement | null>(null)
const showDownloadMenu = ref(false)

const downloadOptions: Array<{
  type: BuilderDownloadType
  label: string
  description: string
  icon: string
}> = [
  { type: 'html', label: 'HTML', description: '편집 가능한 HTML 파일', icon: 'ri-code-s-slash-line' },
  { type: 'image', label: '이미지', description: 'PNG 이미지 파일', icon: 'ri-image-line' },
  { type: 'pdf', label: 'PDF', description: 'PDF 문서 파일', icon: 'ri-file-pdf-2-line' }
]

/** 다운로드 유형 메뉴 열기 및 닫기 */
function toggleDownloadMenu() {
  showDownloadMenu.value = !showDownloadMenu.value
}

/**
 * 다운로드 유형 선택 후 상위 다운로드 처리 요청
 *
 * @param type 선택한 다운로드 파일 유형
 */
function selectDownloadType(type: BuilderDownloadType) {
  showDownloadMenu.value = false
  emit('download', type)
}

onClickOutside(downloadMenuRef, () => {
  showDownloadMenu.value = false
})
</script>

<style scoped>
.top-toolbar {
  position: relative;
  z-index: 50;
  height: 74px;
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto minmax(180px, 1fr);
  align-items: center;
  overflow: visible;
  border-bottom: 1px solid var(--line);
  background: rgba(17, 21, 40, 0.92);
  padding: 0 24px;
  backdrop-filter: blur(14px);
}

.top-toolbar-icons {
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

.history-actions {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.history-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(174, 183, 232, 0.14);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  padding: 0;
  font: inherit;
  cursor: pointer;
  transition: 0.2s ease;
}

.history-btn i {
  font-size: 18px;
  line-height: 1;
}

.history-btn:hover:not(:disabled) {
  border-color: rgba(139, 145, 255, 0.32);
  background: rgba(139, 145, 255, 0.12);
  color: #ffffff;
}

.history-btn:disabled {
  color: var(--text-muted);
  cursor: not-allowed;
}

.sidebar-expand-btn {
  margin-right: 7px;
  border-color: rgba(139, 145, 255, 0.32);
  background: rgba(139, 145, 255, 0.12);
  color: var(--accent);
}

.device-btn {
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

.device-btn i {
  font-size: 17px;
  line-height: 1;
}

.device-btn:hover {
  background: rgba(139, 145, 255, 0.12);
  color: var(--accent);
}

.device-btn.active {
  background: rgba(139, 145, 255, 0.2);
  color: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(139, 145, 255, 0.28);
}

.top-actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 9px;
}

.toolbar-download {
  position: relative;
}

.toolbar-download-menu {
  position: absolute;
  top: calc(100% + 9px);
  right: 0;
  z-index: 40;
  width: 230px;
  display: grid;
  gap: 5px;
  border: 1px solid rgba(174, 183, 232, 0.16);
  border-radius: 12px;
  background: rgba(17, 21, 40, 0.98);
  padding: 7px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(16px);
}

.toolbar-download-menu > button {
  min-width: 0;
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 11px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-primary);
  padding: 9px 10px;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.toolbar-download-menu > button:hover,
.toolbar-download-menu > button:focus-visible {
  background: rgba(139, 145, 255, 0.14);
  color: #ffffff;
  outline: none;
}

.toolbar-download-menu > button > i {
  flex: 0 0 auto;
  color: var(--accent);
  font-size: 19px;
}

.toolbar-download-menu > button > span {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.toolbar-download-menu strong {
  font-size: 12px;
  font-weight: 900;
}

.toolbar-download-menu small {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
}

.toolbar-btn {
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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

.toolbar-btn:hover {
  background: rgba(139, 145, 255, 0.12);
  color: #ffffff;
}

.toolbar-btn.primary {
  border-color: rgba(255, 255, 255, 0.18);
  background: linear-gradient(180deg, var(--accent-2), var(--accent-3));
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(101, 108, 255, 0.18);
}

@media (max-width: 1100px) {
  .device-btn {
    min-width: 70px;
  }
}

@media (max-width: 760px) {
  .top-toolbar {
    height: auto;
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 14px;
  }

  .top-toolbar-icons,
  .top-actions,
  .history-actions {
    justify-self: stretch;
    justify-content: center;
  }

  .device-btn {
    min-width: 0;
    flex: 1;
  }

  .toolbar-btn {
    flex: 1;
  }

  .toolbar-download {
    flex: 1;
  }

  .toolbar-download .toolbar-btn {
    width: 100%;
  }
}
</style>
