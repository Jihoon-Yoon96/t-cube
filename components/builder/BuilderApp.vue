<template>
  <section class="builder-app">
    <header class="builder-topbar">
      <div class="brand-block">
        <i class="ri-edit-box-fill" aria-hidden="true"></i>
        <div>
          <strong>T.CUBE Builder</strong>
          <span>Template workspace</span>
        </div>
      </div>

      <div class="topbar-actions">
        <div class="viewport-tabs" aria-label="Viewport">
          <button
            v-for="viewport in viewportModes"
            :key="viewport.key"
            class="icon-button"
            :class="{ active: activeViewport === viewport.key }"
            type="button"
            :aria-label="viewport.label"
            :title="viewport.label"
            @click="activeViewport = viewport.key"
          >
            <i :class="viewport.icon" aria-hidden="true"></i>
          </button>
        </div>

        <button class="ghost-button" type="button">
          <i class="ri-eye-line" aria-hidden="true"></i>
          <span>Preview</span>
        </button>

        <button class="primary-button" type="button" @click="emitSave">
          <i class="ri-save-3-line" aria-hidden="true"></i>
          <span>Save JSON</span>
        </button>
      </div>
    </header>

    <div class="builder-shell">
      <aside class="left-panel" aria-label="Builder source panel">
        <section class="panel-section">
          <div class="panel-heading">
            <h2>Import</h2>
            <button class="icon-button subtle" type="button" aria-label="Add source" title="Add source">
              <i class="ri-add-line" aria-hidden="true"></i>
            </button>
          </div>

          <div class="import-list">
            <button
              v-for="source in importSources"
              :key="source.label"
              class="source-button"
              type="button"
            >
              <i :class="source.icon" aria-hidden="true"></i>
              <span>{{ source.label }}</span>
            </button>
          </div>
        </section>

        <section class="panel-section">
          <div class="panel-heading">
            <h2>Pages</h2>
          </div>

          <button
            v-for="page in pages"
            :key="page.id"
            class="page-row"
            :class="{ active: activePageId === page.id }"
            type="button"
            @click="activePageId = page.id"
          >
            <span class="page-thumb"></span>
            <span>{{ page.name }}</span>
          </button>
        </section>
      </aside>

      <main class="stage-area" aria-label="Builder stage">
        <div class="stage-toolbar">
          <div>
            <strong>{{ activePage?.name }}</strong>
            <span>{{ canvasLabel }}</span>
          </div>

          <div class="stage-tools">
            <button class="icon-button subtle" type="button" aria-label="Undo" title="Undo">
              <i class="ri-arrow-go-back-line" aria-hidden="true"></i>
            </button>
            <button class="icon-button subtle" type="button" aria-label="Redo" title="Redo">
              <i class="ri-arrow-go-forward-line" aria-hidden="true"></i>
            </button>
            <button class="icon-button subtle" type="button" aria-label="Zoom out" title="Zoom out">
              <i class="ri-subtract-line" aria-hidden="true"></i>
            </button>
            <span class="zoom-label">100%</span>
            <button class="icon-button subtle" type="button" aria-label="Zoom in" title="Zoom in">
              <i class="ri-add-line" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div class="canvas-wrap">
          <section class="canvas" :class="`canvas-${activeViewport}`">
            <article
              v-for="element in sampleElements"
              :key="element.id"
              class="canvas-element"
              :class="[`element-${element.type}`, { selected: selectedElementId === element.id }]"
              :style="element.style"
              @click="selectedElementId = element.id"
            >
              <template v-if="element.type === 'text'">
                {{ element.content }}
              </template>
              <template v-else-if="element.type === 'image'">
                <i class="ri-image-line" aria-hidden="true"></i>
              </template>
            </article>
          </section>
        </div>
      </main>

      <aside class="right-panel" aria-label="Builder inspector">
        <section class="panel-section">
          <div class="panel-heading">
            <h2>Inspector</h2>
          </div>

          <div v-if="selectedElement" class="inspector-card">
            <label>
              <span>Element</span>
              <input :value="selectedElement.name" readonly>
            </label>

            <label>
              <span>Type</span>
              <input :value="selectedElement.type" readonly>
            </label>

            <div class="field-grid">
              <label>
                <span>X</span>
                <input :value="selectedElement.x" readonly>
              </label>
              <label>
                <span>Y</span>
                <input :value="selectedElement.y" readonly>
              </label>
              <label>
                <span>W</span>
                <input :value="selectedElement.width" readonly>
              </label>
              <label>
                <span>H</span>
                <input :value="selectedElement.height" readonly>
              </label>
            </div>
          </div>

          <p v-else class="empty-text">Select an element on the stage.</p>
        </section>

        <section class="panel-section json-section">
          <div class="panel-heading">
            <h2>JSON</h2>
          </div>

          <pre>{{ jsonPreview }}</pre>
        </section>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
type ViewportMode = 'desktop' | 'tablet' | 'mobile'

type CanvasElement = {
  id: string
  name: string
  type: 'text' | 'image' | 'shape'
  x: number
  y: number
  width: number
  height: number
  content?: string
  style: Record<string, string | number>
}

const emit = defineEmits<{
  save: [payload: Record<string, unknown>]
}>()

const viewportModes = [
  { key: 'desktop', label: 'Desktop viewport', icon: 'ri-computer-line' },
  { key: 'tablet', label: 'Tablet viewport', icon: 'ri-tablet-line' },
  { key: 'mobile', label: 'Mobile viewport', icon: 'ri-smartphone-line' }
] as const

const importSources = [
  { label: 'HTML file', icon: 'ri-html5-line' },
  { label: 'PDF file', icon: 'ri-file-pdf-2-line' },
  { label: 'Image file', icon: 'ri-image-line' },
  { label: 'AI prompt', icon: 'ri-sparkling-2-line' }
]

const pages = [
  { id: 'page-home', name: 'Main canvas', width: 960, height: 540 }
]

const sampleElements: CanvasElement[] = [
  {
    id: 'headline',
    name: 'Hero headline',
    type: 'text',
    x: 72,
    y: 84,
    width: 340,
    height: 80,
    content: 'Build campaign content faster',
    style: {
      left: '72px',
      top: '84px',
      width: '340px',
      height: '80px',
      fontSize: '34px',
      fontWeight: 800
    }
  },
  {
    id: 'body-copy',
    name: 'Body copy',
    type: 'text',
    x: 74,
    y: 184,
    width: 310,
    height: 72,
    content: 'Import, edit, and export CMS-ready template JSON from one focused builder.',
    style: {
      left: '74px',
      top: '184px',
      width: '310px',
      height: '72px',
      fontSize: '15px',
      lineHeight: 1.45
    }
  },
  {
    id: 'visual',
    name: 'Main visual',
    type: 'image',
    x: 500,
    y: 86,
    width: 300,
    height: 250,
    style: {
      left: '500px',
      top: '86px',
      width: '300px',
      height: '250px'
    }
  },
  {
    id: 'accent-shape',
    name: 'Accent shape',
    type: 'shape',
    x: 72,
    y: 308,
    width: 160,
    height: 44,
    style: {
      left: '72px',
      top: '308px',
      width: '160px',
      height: '44px'
    }
  }
]

const activeViewport = ref<ViewportMode>('desktop')
const activePageId = ref(pages[0].id)
const selectedElementId = ref<string | null>('headline')

const activePage = computed(() => pages.find((page) => page.id === activePageId.value))
const selectedElement = computed(() => sampleElements.find((element) => element.id === selectedElementId.value))
const canvasLabel = computed(() => {
  if (!activePage.value) return 'No page selected'

  return `${activePage.value.width} x ${activePage.value.height}`
})

const jsonPreview = computed(() => {
  return JSON.stringify(
    {
      page: activePage.value,
      selectedElementId: selectedElementId.value,
      viewport: activeViewport.value
    },
    null,
    2
  )
})

function emitSave() {
  emit('save', {
    template: {
      version: 1,
      pages,
      elements: sampleElements
    },
    metadata: {
      viewport: activeViewport.value
    }
  })
}
</script>

<style scoped>
:global(html, body, #__nuxt) {
  margin: 0;
  min-height: 100%;
}

:global(body) {
  background: #eef1f5;
  color: #1f2733;
  font-family: Inter, Arial, sans-serif;
}

* {
  box-sizing: border-box;
}

.builder-app {
  --surface: #ffffff;
  --surface-soft: #f5f7fa;
  --surface-muted: #e9edf3;
  --line: #d9e0ea;
  --text: #1f2733;
  --muted: #6a7381;
  --accent: #246bfe;
  --accent-soft: #e8f0ff;
  --success: #14a46c;

  width: 100%;
  min-height: 100vh;
  display: grid;
  grid-template-rows: 64px 1fr;
  background: #eef1f5;
}

.builder-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 20px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}

.brand-block,
.topbar-actions,
.viewport-tabs,
.stage-tools {
  display: flex;
  align-items: center;
}

.brand-block {
  gap: 10px;
  min-width: 0;
}

.brand-block i {
  color: var(--accent);
  font-size: 24px;
}

.brand-block strong,
.brand-block span {
  display: block;
}

.brand-block strong {
  font-size: 15px;
  line-height: 1.1;
}

.brand-block span {
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
}

.topbar-actions {
  gap: 10px;
}

.viewport-tabs {
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-soft);
}

.icon-button,
.ghost-button,
.primary-button,
.source-button,
.page-row {
  border: 0;
  font: inherit;
  cursor: pointer;
}

.icon-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
}

.icon-button:hover,
.icon-button.active {
  background: var(--surface);
  color: var(--accent);
}

.icon-button.subtle {
  border: 1px solid var(--line);
  background: var(--surface);
}

.ghost-button,
.primary-button {
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
}

.ghost-button {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
}

.primary-button {
  background: var(--accent);
  color: #ffffff;
}

.builder-shell {
  min-height: 0;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 300px;
}

.left-panel,
.right-panel {
  min-height: 0;
  overflow: auto;
  border-color: var(--line);
  background: var(--surface);
}

.left-panel {
  border-right: 1px solid var(--line);
}

.right-panel {
  border-left: 1px solid var(--line);
}

.panel-section {
  padding: 18px;
  border-bottom: 1px solid var(--line);
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-heading h2 {
  margin: 0;
  color: var(--text);
  font-size: 13px;
  font-weight: 800;
}

.import-list {
  display: grid;
  gap: 8px;
}

.source-button,
.page-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  text-align: left;
}

.source-button {
  min-height: 42px;
  padding: 0 12px;
}

.source-button i {
  color: var(--accent);
  font-size: 17px;
}

.page-row {
  min-height: 54px;
  padding: 8px;
}

.page-row.active {
  outline: 2px solid var(--accent);
  background: var(--accent-soft);
}

.page-thumb {
  width: 42px;
  height: 32px;
  flex: 0 0 auto;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: #ffffff;
}

.stage-area {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: 54px 1fr;
  background: #dfe5ed;
}

.stage-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
  background: #f7f9fc;
}

.stage-toolbar strong,
.stage-toolbar span {
  display: block;
}

.stage-toolbar strong {
  font-size: 13px;
}

.stage-toolbar span {
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}

.stage-tools {
  gap: 6px;
}

.zoom-label {
  min-width: 42px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.canvas-wrap {
  min-width: 0;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: auto;
  padding: 36px;
}

.canvas {
  position: relative;
  flex: 0 0 auto;
  width: 960px;
  height: 540px;
  overflow: hidden;
  border: 1px solid #cfd7e3;
  border-radius: 4px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 18px 42px rgba(31, 39, 51, 0.18);
}

.canvas-tablet {
  width: 720px;
  height: 540px;
}

.canvas-mobile {
  width: 390px;
  height: 640px;
}

.canvas-element {
  position: absolute;
  display: flex;
  align-items: center;
  color: var(--text);
  border: 1px solid transparent;
}

.canvas-element.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(36, 107, 254, 0.14);
}

.element-text {
  padding: 4px;
}

.element-image {
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #dbeafe 0%, #f0fdf4 100%);
  color: var(--accent);
  font-size: 52px;
}

.element-shape {
  border-radius: 999px;
  background: var(--success);
}

.inspector-card {
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
}

label span {
  color: var(--muted);
  font-size: 11px;
  font-weight: 800;
}

input {
  width: 100%;
  height: 36px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text);
  padding: 0 10px;
  font: inherit;
  font-size: 13px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.empty-text {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.json-section pre {
  max-height: 280px;
  overflow: auto;
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: #141922;
  color: #d9f0ff;
  font-size: 11px;
  line-height: 1.5;
}

@media (max-width: 1080px) {
  .builder-shell {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .right-panel {
    display: none;
  }
}

@media (max-width: 760px) {
  .builder-app {
    grid-template-rows: auto 1fr;
  }

  .builder-topbar {
    align-items: flex-start;
    flex-direction: column;
    padding: 14px;
  }

  .topbar-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .builder-shell {
    grid-template-columns: 1fr;
  }

  .left-panel {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .import-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stage-area {
    min-height: 640px;
  }

  .canvas-wrap {
    justify-content: flex-start;
    padding: 24px;
  }
}
</style>
