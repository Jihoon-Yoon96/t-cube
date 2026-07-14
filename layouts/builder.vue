<template>
  <div class="tc-builder-page">
    <div
      class="tc-builder-shell"
      :class="{ 'tc-builder-shell--sidebar-collapsed': isSidebarCollapsed && showTopToolbar }"
    >
      <BuilderSidebar
        v-if="!isSidebarCollapsed || !showTopToolbar"
        :active-mode="activeMode"
        :collapsible="showTopToolbar"
        @go-home="builderView.moveToView('start')"
        @select-create="builderView.moveToView('start')"
        @select-edit="builderView.moveToView('editor')"
        @collapse="setSidebarCollapsed(true)"
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
            :can-undo="builderEditor.canUndo"
            :can-redo="builderEditor.canRedo"
            :sidebar-collapsed="isSidebarCollapsed"
            :viewport-modes="viewportModes"
            @update:active-viewport="builderView.setActiveViewport"
            @expand-sidebar="setSidebarCollapsed(false)"
            @undo="builderEditor.undoCurrentDocument"
            @redo="builderEditor.redoCurrentDocument"
            @download="downloadCurrentDocument"
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
import { downloadGeneratedDesignImage, downloadGeneratedDesignPdf } from '~/services/browser/downloadGeneratedDesign'
import { renderFinalHtmlDocument } from '~/services/html/parseHtmlDocument'
import type { BuilderViewportMode } from '~/stores/builder'
import type { BuilderDownloadType } from '~/types/builder/download'

const builderView = useBuilderView()
const builderEditor = useBuilderEditor()
const showHtmlPreview = ref(false)
const isSidebarCollapsed = ref(false)

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

/**
 * HTML 편집 화면의 sidebar 접힘 상태 변경
 *
 * @param collapsed sidebar 접힘 여부
 * @returns 없음
 */
function setSidebarCollapsed(collapsed: boolean) {
  if (collapsed && !showTopToolbar.value) return

  isSidebarCollapsed.value = collapsed
}

/** 전체 화면 미리보기를 닫고 HTML 편집 화면으로 복귀 */
function closeHtmlPreview() {
  showHtmlPreview.value = false
}

/**
 * 현재 편집 상태를 선택 유형 파일로 다운로드
 * 이미지와 PDF는 최종 HTML을 현재 viewport 기준으로 렌더링
 *
 * @param type 다운로드 파일 유형
 * @returns 다운로드 완료 Promise
 */
async function downloadCurrentDocument(type: BuilderDownloadType) {
  const currentDocument = builderEditor.currentDocument

  if (!currentDocument) return

  const html = renderFinalHtmlDocument(currentDocument)
  const baseFileName = createDownloadBaseFileName(currentDocument.sourceName)

  if (type === 'image') {
    await downloadGeneratedDesignImage(html, baseFileName, builderView.activeViewport)
    return
  }

  if (type === 'pdf') {
    await downloadGeneratedDesignPdf(html, baseFileName, builderView.activeViewport)
    return
  }

  const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  const downloadAnchor = document.createElement('a')

  downloadAnchor.href = blobUrl
  downloadAnchor.download = `${baseFileName}.html`
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0)
}

/**
 * 원본 source 이름을 안전한 다운로드 기본 파일명으로 변환
 *
 * @param sourceName 현재 HTML 문서의 원본 파일명
 * @returns 확장자를 제외한 안전한 파일명
 */
function createDownloadBaseFileName(sourceName: string) {
  const sourceFileName = sourceName.trim().split(/[\\/]/).pop() || 'edited-document'
  const safeFileName = sourceFileName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').trim()
  return safeFileName.replace(/\.[^.]+$/, '') || 'edited-document'
}

/** 현재 HTML 변경 상태를 저장 완료 상태로 전환 */
function handleSave() {
  builderEditor.markDirty(false)
}

/** 화면 전환 시 HTML 편집 전용 UI 상태 초기화 및 sidebar 기본 접힘 적용 */
watch(() => builderView.currentView, (currentView) => {
  const isHtmlEditor = currentView === 'html-editor'

  setSidebarCollapsed(isHtmlEditor)
  if (isHtmlEditor) return

  closeHtmlPreview()
}, { immediate: true })
</script>
