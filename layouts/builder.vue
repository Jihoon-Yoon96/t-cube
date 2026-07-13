<template>
  <div class="tc-builder-page">
    <div class="tc-builder-shell">
      <BuilderSidebar
        :active-mode="activeMode"
        @select-create="builderView.moveToView('start')"
        @select-edit="builderView.moveToView('editor')"
      />

      <header class="tc-builder-mobile-header">
        <div class="tc-builder-brand tc-builder-mobile-brand">
          <TcubeIcon icon="ri-edit-box-fill" />
          <div class="tc-builder-brand-text">
            <strong>T.CUBE</strong>
          </div>
        </div>
      </header>

      <main class="tc-builder-main">
        <section class="tc-builder-main-inner">
          <BuilderTopToolbar
            v-if="showTopToolbar"
            :active-viewport="builderView.activeViewport"
            :viewport-modes="viewportModes"
            @update:active-viewport="builderView.setActiveViewport"
            @preview="openHtmlPreview"
            @save="handleSave"
          />

          <section
            class="tc-builder-content-body"
            :class="{ 'tc-builder-content-body--fixed': showTopToolbar }"
          >
            <slot />
          </section>
        </section>
      </main>
    </div>

    <Teleport to="body">
      <HtmlDocumentFullPreview
        v-if="showHtmlPreview && builderEditor.currentDocument"
        :document="builderEditor.currentDocument"
        :active-viewport="builderView.activeViewport"
        :viewport-modes="viewportModes"
        @update:active-viewport="builderView.setActiveViewport"
        @close="closeHtmlPreview"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import HtmlDocumentFullPreview from '~/components/builder/view/create-template/HtmlDocumentFullPreview.vue'
import BuilderSidebar from '~/components/layouts/Sidebar/index.vue'
import BuilderTopToolbar from '~/components/layouts/top-toolbar.vue'
import { useBuilderEditor } from '~/composables/editor/useBuilderEditor'
import { useBuilderView } from '~/composables/view/useBuilderView'
import type { BuilderViewportMode } from '~/stores/builder'

const builderView = useBuilderView()
const builderEditor = useBuilderEditor()
const showHtmlPreview = ref(false)

const viewportModes: Array<{
  key: BuilderViewportMode
  label: string
  shortLabel: string
  icon: string
}> = [
  { key: 'desktop', label: 'PC viewport', shortLabel: 'PC', icon: 'ri-computer-line' },
  { key: 'tablet', label: 'Tablet viewport', shortLabel: 'Tablet', icon: 'ri-tablet-line' },
  { key: 'mobile', label: 'Mobile viewport', shortLabel: 'Mobile', icon: 'ri-smartphone-line' }
]

/** 현재 빌더 화면에 대응하는 sidebar 활성 모드 */
const activeMode = computed(() => builderView.currentView === 'editor' ? 'edit' : 'create')

/** HTML 편집 화면의 top toolbar 표시 여부 */
const showTopToolbar = computed(() => builderView.currentView === 'html-editor')

/** 현재 HTML 수정 결과의 전체 화면 미리보기 열기 */
function openHtmlPreview() {
  if (!builderEditor.currentDocument) return

  showHtmlPreview.value = true
}

/** 전체 화면 미리보기를 닫고 HTML 편집 화면으로 복귀 */
function closeHtmlPreview() {
  showHtmlPreview.value = false
}

/** 현재 HTML 변경 상태를 저장 완료 상태로 전환 */
function handleSave() {
  builderEditor.markDirty(false)
}

/** HTML 편집 화면을 벗어나면 열려 있는 전체 화면 미리보기 닫기 */
watch(() => builderView.currentView, (currentView) => {
  if (currentView !== 'html-editor') closeHtmlPreview()
})
</script>
