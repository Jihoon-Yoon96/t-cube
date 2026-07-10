<template>
  <CreateTemplateStart v-if="builderView.currentView === 'start'" />
  <CreateTemplateSelectFileType v-else-if="builderView.currentView === 'pdf-image-upload'" />
  <CreateTemplateUploadFile v-else-if="builderView.currentView === 'file-upload'" />
  <CreateTemplateImageDesignPreview v-else-if="builderView.currentView === 'image-preview'" />
  <CreateTemplatePdfDesignPreview v-else-if="builderView.currentView === 'pdf-preview'" />
  <CreateTemplateHowToMakeDesign v-else-if="builderView.currentView === 'design-method'" />
  <CreateTemplateLayoutBuilder v-else-if="builderView.currentView === 'layout-design'" />
  <CreateTemplateHtmlDocumentEditor v-else-if="builderView.currentView === 'html-editor'" />
  <EditTemplateSelectTemplate v-else-if="builderView.currentView === 'editor'" />

  <div v-else class="body-placeholder">
    <span class="section-title">WORKSPACE</span>
    <h1>{{ stageTitle }}</h1>
    <p>{{ stageSubtitle }}</p>
  </div>
</template>

<script setup lang="ts">
import CreateTemplateHowToMakeDesign from './view/create-template/HowToMakeDesign.vue'
import CreateTemplateHtmlDocumentEditor from './view/create-template/HtmlDocumentEditor.vue'
import CreateTemplateImageDesignPreview from './view/create-template/ImageDesignPreview.vue'
import CreateTemplateLayoutBuilder from './view/create-template/LayoutBuilder.vue'
import CreateTemplatePdfDesignPreview from './view/create-template/PdfDesignPreview.vue'
import CreateTemplateSelectFileType from './view/create-template/SelectFileType.vue'
import CreateTemplateStart from './view/create-template/Start.vue'
import CreateTemplateUploadFile from './view/create-template/UploadFile.vue'
import EditTemplateSelectTemplate from './view/edit-template/SelectTemplate.vue'
import { useBuilderView } from '~/composables/view/useBuilderView'

const builderView = useBuilderView()
const activePage = {
  width: 960,
  height: 540
}

const stageTitle = computed(() => {
  if (builderView.currentView === 'editor') return '템플릿 수정'
  if (builderView.currentView === 'preview') return '미리보기'

  return '템플릿 생성'
})

const stageSubtitle = computed(() => {
  if (builderView.currentView === 'editor') {
    return `${activePage.width} x ${activePage.height}`
  }

  return '바디 영역은 다음 단계에서 정리합니다.'
})
</script>

<style>
* {
  box-sizing: border-box;
}

.creation-start {
  min-height: calc(100vh - 142px);
  display: grid;
  grid-template-rows: auto auto 1fr;
  align-content: start;
  gap: 32px;
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.035));
  padding: 38px 28px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
}

.creation-intro {
  max-width: 760px;
  justify-self: center;
  text-align: center;
}

.creation-intro h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 31px;
  line-height: 1.2;
  font-weight: 900;
}

.creation-intro p {
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.55;
  font-weight: 600;
}

.creation-options,
.upload-options {
  justify-self: center;
  margin-top: 40px;
  display: grid;
  gap: 28px;
}

.creation-options {
  width: min(1080px, 100%);
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.upload-options {
  width: min(1180px, 100%);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.creation-card {
  min-height: 300px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 16px;
  border: 1px solid rgba(174, 183, 232, 0.12);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.04));
  color: var(--text-primary);
  padding: 44px;
  font: inherit;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);
}

.creation-card:hover {
  border-color: rgba(139, 145, 255, 0.42);
  background: linear-gradient(180deg, rgba(139, 145, 255, 0.18), rgba(139, 145, 255, 0.08));
}

.creation-card i {
  width: 86px;
  height: 86px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(139, 145, 255, 0.16);
  color: var(--accent);
  font-size: 44px;
}

.creation-card strong {
  color: var(--text-strong);
  font-size: 21px;
  line-height: 1.35;
  font-weight: 900;
}

.creation-card span {
  max-width: 360px;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.45;
  font-weight: 700;
}

.upload-card {
  min-height: 280px;
}

.file-upload-screen {
  gap: 32px;
}

.dropzone-wrap {
  justify-self: center;
  margin-top: 36px;
  width: min(1120px, 100%);
  display: grid;
  gap: 14px;
}

.file-dropzone {
  min-height: 460px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 18px;
  border: 2px dashed var(--accent-3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-secondary);
  padding: 96px 24px;
  text-align: center;
  cursor: pointer;
}

.file-dropzone:hover,
.file-dropzone.dragging {
  background: rgba(139, 145, 255, 0.07);
  border-color: var(--accent);
}

.file-dropzone.ready {
  border-color: rgba(105, 220, 160, 0.7);
}

.file-dropzone.error {
  border-color: rgba(255, 107, 129, 0.76);
}

.file-dropzone > i {
  color: var(--text-muted);
  font-size: 66px;
}

.file-dropzone.ready > i {
  color: #69dca0;
}

.file-dropzone span {
  max-width: 720px;
  color: var(--text-secondary);
  font-size: 21px;
  line-height: 1.4;
  font-weight: 600;
  word-break: break-all;
}

.file-dropzone span strong {
  color: var(--accent-3);
  font-weight: 900;
}

.file-dropzone.ready span strong {
  color: var(--text-strong);
}

.file-dropzone small {
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1.4;
  font-weight: 600;
}

.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.upload-message {
  min-height: 20px;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  font-weight: 700;
  text-align: center;
}

.upload-message.error {
  color: #ff8aa0;
}

.upload-message.success {
  color: #8ce0b1;
}

.upload-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.primary-action,
.secondary-action {
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 10px;
  padding: 0 16px;
  font: inherit;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.primary-action {
  border: 0;
  background: var(--accent-3);
  color: #ffffff;
}

.secondary-action {
  border: 1px solid rgba(174, 183, 232, 0.18);
  background: rgba(255, 255, 255, 0.055);
  color: var(--text-primary);
}

.primary-action:disabled,
.secondary-action:disabled {
  cursor: not-allowed;
  opacity: 0.44;
}

.html-editor-screen {
  min-height: calc(100vh - 74px);
  height: calc(100vh - 74px);
  display: grid;
  grid-template-rows: 1fr;
  margin: -34px;
  margin-top: 0;
}

.html-editor-layout {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
}

.html-editor-layout.show-element-list {
  grid-template-columns: 280px minmax(0, 1fr);
}

.html-image-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.html-editor-panel,
.html-editor-preview {
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.035));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.html-editor-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.html-editor-panel-title,
.html-editor-preview-toolbar {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid rgba(174, 183, 232, 0.1);
  padding: 0 16px;
}

.html-editor-preview-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.html-editor-panel-toggle {
  width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid rgba(174, 183, 232, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.055);
  color: var(--text-primary);
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.html-editor-panel-toggle:hover,
.html-editor-panel-toggle[aria-pressed="true"] {
  border-color: rgba(139, 145, 255, 0.46);
  background: rgba(139, 145, 255, 0.16);
  color: #ffffff;
}

.html-editor-panel-title strong,
.html-editor-preview-toolbar strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 900;
}

.html-editor-panel-title span,
.html-editor-preview-toolbar span {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
}

.html-inspector-title-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.html-inspector-collapse-button {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(174, 183, 232, 0.14);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.045);
  color: var(--text-secondary);
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.html-inspector-collapse-button:hover {
  border-color: rgba(139, 145, 255, 0.42);
  background: rgba(139, 145, 255, 0.14);
  color: #ffffff;
}

.element-list-panel {
  border-right: 0;
  overflow: hidden;
}

.html-inspector-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  border-bottom: 1px solid rgba(174, 183, 232, 0.1);
  padding: 10px;
}

.html-inspector-tab {
  min-width: 0;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(174, 183, 232, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.045);
  color: var(--text-secondary);
  padding: 0 10px;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.html-inspector-tab:hover,
.html-inspector-tab.active {
  border-color: rgba(139, 145, 255, 0.44);
  background: rgba(139, 145, 255, 0.14);
  color: #ffffff;
}

.html-inspector-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-color: rgba(139, 145, 255, 0.46) rgba(11, 15, 30, 0.48);
  scrollbar-width: thin;
}

.html-inspector-list::-webkit-scrollbar {
  width: 9px;
}

.html-inspector-list::-webkit-scrollbar-track {
  border-left: 1px solid rgba(174, 183, 232, 0.08);
  background: rgba(11, 15, 30, 0.42);
}

.html-inspector-list::-webkit-scrollbar-thumb {
  border: 2px solid rgba(11, 15, 30, 0.72);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(139, 145, 255, 0.72), rgba(59, 210, 131, 0.58));
}

.html-inspector-list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(163, 168, 255, 0.9), rgba(91, 229, 158, 0.82));
}

.element-node-list {
  padding: 10px;
}

.element-list-item {
  width: 100%;
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-primary);
  margin: 0 0 10px;
  padding: 10px;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.element-list-item:hover,
.element-list-item.active {
  border-color: rgba(139, 145, 255, 0.34);
  background: rgba(139, 145, 255, 0.1);
}

.element-list-item i {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 10px;
  background: rgba(139, 145, 255, 0.15);
  color: var(--accent);
  font-size: 20px;
}

.element-list-item span {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.element-list-item strong {
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 900;
}

.element-list-item small {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.35;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-node-list {
  padding: 10px;
}

.layout-node-item {
  width: 100%;
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-primary);
  margin: 0 0 8px;
  padding: 9px 10px;
  font: inherit;
  text-align: left;
  cursor: grab;
}

.layout-node-item:hover,
.layout-node-item.active {
  border-color: rgba(59, 210, 131, 0.34);
  background: rgba(59, 210, 131, 0.1);
}

.layout-node-item.dragging {
  opacity: 0.48;
}

.layout-node-item.droppable {
  border-color: rgba(139, 145, 255, 0.34);
}

.layout-node-toggle-spacer {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.layout-node-toggle {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid rgba(174, 183, 232, 0.14);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.045);
  color: var(--text-secondary);
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.layout-node-toggle:hover {
  border-color: rgba(139, 145, 255, 0.42);
  background: rgba(139, 145, 255, 0.14);
  color: #ffffff;
}

.layout-node-branch-toggle {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid rgba(174, 183, 232, 0.14);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.045);
  color: var(--text-muted);
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.layout-node-branch-toggle:hover {
  border-color: rgba(139, 145, 255, 0.42);
  background: rgba(139, 145, 255, 0.14);
  color: #ffffff;
}

.layout-node-drag-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 9px;
  background: rgba(59, 210, 131, 0.14);
  color: #79e6ad;
  font-size: 18px;
}

.layout-node-summary {
  min-width: 0;
  display: grid;
  gap: 4px;
  flex: 1 1 auto;
}

.layout-node-item strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-node-item small {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.35;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.html-editor-preview {
  display: grid;
  grid-template-rows: auto 1fr;
}

.html-browser-preview {
  position: relative;
  min-height: 0;
  display: flex;
  justify-content: center;
  background:
    linear-gradient(45deg, rgba(255, 255, 255, 0.035) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.035) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.035) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.035) 75%);
  background-color: #151a31;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  background-size: 20px 20px;
  padding: 22px;
  overflow: auto;
}

.html-browser-frame {
  min-height: 100%;
  height: 100%;
  display: block;
  max-width: 100%;
  border: 1px solid rgba(174, 183, 232, 0.18);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.28);
}

.html-link-edit-popover {
  position: absolute;
  z-index: 5;
  width: 248px;
  display: grid;
  gap: 8px;
  border: 1px solid rgba(174, 183, 232, 0.18);
  border-radius: 10px;
  background: rgba(17, 21, 40, 0.98);
  padding: 8px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.34);
}

.html-link-edit-popover button {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  padding: 0 10px;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.html-link-edit-popover button:hover {
  background: rgba(139, 145, 255, 0.14);
  color: #ffffff;
}

.html-link-edit-popover label {
  display: grid;
  gap: 8px;
}

.html-link-edit-popover label span {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 900;
}

.html-link-edit-popover input {
  width: 100%;
  height: 36px;
  border: 1px solid rgba(174, 183, 232, 0.16);
  border-radius: 8px;
  background: rgba(13, 16, 32, 0.92);
  color: var(--text-primary);
  padding: 0 10px;
  font: inherit;
  font-size: 12px;
  outline: none;
}

.html-link-edit-popover input:focus {
  border-color: rgba(139, 145, 255, 0.62);
}

.html-media-source-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}

.html-media-source-field button {
  width: 100%;
  height: 36px;
  min-height: 36px;
  justify-content: center;
  border: 1px solid rgba(174, 183, 232, 0.14);
  background: rgba(255, 255, 255, 0.045);
}

.html-link-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.html-link-edit-actions button {
  justify-content: center;
  min-height: 32px;
}

.html-link-edit-actions button:last-child {
  background: var(--accent-3);
  color: #ffffff;
}

.image-design-preview-screen {
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

.image-design-preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.image-design-preview-header h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 31px;
  line-height: 1.2;
  font-weight: 900;
}

.image-design-preview-header p {
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
  font-weight: 700;
}

.image-design-preview-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
}

.image-design-preview-layout {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
}

.image-design-preview-canvas,
.image-design-preview-info {
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 12px;
  background: rgba(13, 16, 32, 0.4);
  overflow: hidden;
}

.image-design-preview-canvas {
  min-height: 520px;
  display: grid;
  place-items: center;
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

.image-design-preview-canvas img {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 300px);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.28);
}

.pdf-design-preview-canvas iframe {
  width: 100%;
  min-height: calc(100vh - 300px);
  border: 1px solid rgba(174, 183, 232, 0.18);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.28);
}

.image-design-preview-info {
  align-self: start;
  display: grid;
  gap: 18px;
  padding: 18px;
}

.image-design-preview-info > strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 900;
}

.image-design-preview-info dl {
  display: grid;
  gap: 14px;
  margin: 0;
}

.image-design-preview-info dl div {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.image-design-preview-info dt {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 900;
}

.image-design-preview-info dd {
  overflow-wrap: anywhere;
  margin: 0;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.45;
  font-weight: 800;
}

.template-list-screen,
.body-placeholder {
  min-height: calc(100vh - 142px);
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.035));
  padding: 28px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
}

.template-list-header {
  margin-bottom: 24px;
}

.template-list-header h1,
.body-placeholder h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 31px;
  line-height: 1.2;
  font-weight: 900;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.template-card {
  min-height: 294px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.035));
  overflow: hidden;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.16);
}

.template-card:hover {
  border-color: rgba(139, 145, 255, 0.34);
}

.template-preview {
  position: relative;
  height: 132px;
  display: grid;
  place-items: center;
  background:
    linear-gradient(135deg, rgba(139, 145, 255, 0.16), rgba(255, 255, 255, 0.025)),
    var(--surface-soft);
}

.template-preview i {
  color: var(--accent);
  font-size: 42px;
}

.template-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  height: 24px;
  border-radius: 999px;
  padding: 0 10px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
}

.template-badge.purple {
  background: rgba(139, 145, 255, 0.72);
}

.template-badge.green {
  background: rgba(59, 210, 131, 0.72);
}

.template-badge.orange {
  background: rgba(255, 184, 107, 0.78);
}

.template-badge.blue {
  background: rgba(93, 170, 255, 0.72);
}

.template-info {
  display: grid;
  gap: 8px;
  padding: 16px 16px 10px;
}

.template-info strong {
  color: var(--text-strong);
  font-size: 15px;
  line-height: 1.35;
  font-weight: 900;
}

.template-info span,
.body-placeholder p {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
  font-weight: 600;
}

.template-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding: 0 16px 14px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
}

.template-action {
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-top: 1px solid rgba(174, 183, 232, 0.1);
  background: rgba(139, 145, 255, 0.1);
  color: var(--text-primary);
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.template-action:hover {
  background: rgba(139, 145, 255, 0.18);
  color: #ffffff;
}

.section-title {
  display: block;
  margin-bottom: 14px;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.8px;
}

.body-placeholder p {
  margin: 12px 0 0;
  font-size: 13px;
}

@media (max-width: 1100px) {
  .creation-options {
    width: min(860px, 100%);
    gap: 20px;
  }

  .upload-options {
    width: min(860px, 100%);
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .creation-card {
    min-height: 230px;
    padding: 34px;
  }

  .creation-card i {
    width: 72px;
    height: 72px;
    font-size: 36px;
  }

  .creation-card strong {
    font-size: 18px;
  }

  .creation-card span {
    max-width: 280px;
    font-size: 13px;
  }

  .dropzone-wrap {
    width: min(860px, 100%);
  }

  .template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .image-design-preview-layout {
    grid-template-columns: 1fr;
  }

  .image-design-preview-info {
    align-self: stretch;
  }

  .html-editor-layout.show-element-list {
    grid-template-columns: 240px minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .creation-start {
    min-height: 420px;
    padding: 28px 18px;
    gap: 24px;
  }

  .creation-intro h1 {
    font-size: 28px;
  }

  .creation-options,
  .upload-options {
    grid-template-columns: 1fr;
  }

  .creation-card {
    min-height: 170px;
    padding: 24px;
  }

  .creation-card i {
    width: 58px;
    height: 58px;
    font-size: 28px;
  }

  .file-upload-screen {
    gap: 24px;
  }

  .file-dropzone {
    min-height: 320px;
    padding: 60px 18px;
  }

  .file-dropzone > i {
    font-size: 48px;
  }

  .file-dropzone span {
    font-size: 17px;
  }

  .file-dropzone small,
  .upload-message {
    font-size: 13px;
  }

  .upload-actions {
    flex-direction: column;
  }

  .image-design-preview-screen {
    min-height: 420px;
    padding: 22px;
  }

  .image-design-preview-header {
    display: grid;
  }

  .image-design-preview-header h1 {
    font-size: 28px;
  }

  .image-design-preview-actions {
    flex-direction: column;
  }

  .image-design-preview-canvas {
    min-height: 320px;
    padding: 14px;
  }

  .image-design-preview-canvas img {
    max-height: 420px;
  }

  .pdf-design-preview-canvas iframe {
    min-height: 420px;
  }

  .html-editor-layout {
    grid-template-columns: 1fr;
  }

  .html-editor-layout.show-element-list {
    grid-template-columns: 1fr;
  }

  .element-list-panel {
    max-height: 280px;
    border-right: 1px solid rgba(174, 183, 232, 0.1);
    border-bottom: 0;
  }

  .template-list-screen,
  .body-placeholder {
    min-height: 420px;
    padding: 22px;
  }

  .template-list-header h1,
  .body-placeholder h1 {
    font-size: 28px;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }
}
</style>
