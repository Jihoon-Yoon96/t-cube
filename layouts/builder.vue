<template>
  <div class="builder-page">
    <div class="builder-shell">
      <BuilderSidebar
        :active-mode="activeMode"
        @select-create="builderStore.setStep('start')"
        @select-edit="builderStore.startEditor()"
      />

      <header class="mobile-header">
        <div class="brand mobile-brand">
          <TcubeIcon icon="ri-edit-box-fill" />
          <div class="brand-text">
            <strong>T.CUBE</strong>
          </div>
        </div>
      </header>

      <main class="main">
        <section class="main-inner">
          <BuilderTopToolbar
            :active-viewport="builderStore.activeViewport"
            :viewport-modes="viewportModes"
            @update:active-viewport="builderStore.setActiveViewport"
            @preview="builderStore.setStep('preview')"
            @save="handleSave"
          />

          <section class="content-body">
            <slot />
          </section>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import BuilderSidebar from '~/components/layouts/Sidebar/index.vue'
import BuilderTopToolbar from '~/components/layouts/top-toolbar.vue'
import type { BuilderViewportMode } from '~/stores/builder'
import { useBuilderStore } from '~/stores/builder'

const builderStore = useBuilderStore()

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

const activeMode = computed(() => builderStore.step === 'editor' ? 'edit' : 'create')

function handleSave() {
  builderStore.markDirty(false)
}
</script>

<style scoped>
:global(html, body, #__nuxt) {
  margin: 0;
  width: 100%;
  min-height: 100%;
}

:global(body) {
  background: #0d1020;
  font-family: Inter, Arial, sans-serif;
}

* {
  box-sizing: border-box;
}

.builder-page {
  --page-bg: #0d1020;
  --surface: #111528;
  --surface-soft: #171c34;
  --surface-soft-2: #1d2340;
  --surface-elevated: #202642;
  --sidebar-start: #4f5cff;
  --sidebar-end: #3337a8;
  --accent: #8b91ff;
  --accent-2: #777dff;
  --accent-3: #656cff;
  --accent-soft: rgba(139, 145, 255, 0.14);
  --accent-soft-2: rgba(139, 145, 255, 0.22);
  --text-strong: #f4f6ff;
  --text-primary: #dfe3ff;
  --text-secondary: #aeb7e8;
  --text-muted: #727da8;
  --line: rgba(174, 183, 232, 0.12);
  width: 100%;
  min-height: 100vh;
  background: var(--page-bg);
  color: var(--text-primary);
}

.builder-shell {
  width: 100%;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 220px 1fr;
  background: var(--surface);
  overflow: auto;
}

.mobile-header {
  display: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ffffff;
}

.brand i {
  font-size: 24px;
  line-height: 1;
}

.brand strong {
  display: block;
  font-size: 24px;
  line-height: 0.9;
  font-weight: 800;
}

.main {
  background: var(--surface);
}

.main-inner {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 70% 0%, rgba(101, 108, 255, 0.08) 0, transparent 32%),
    var(--surface);
}

.content-body {
  flex: 1;
  padding: 34px;
}

@media (max-width: 1100px) {
  .builder-shell {
    grid-template-columns: 200px 1fr;
  }
}

@media (max-width: 760px) {
  .builder-shell {
    display: block;
  }

  :slotted(.desktop-sidebar) {
    display: none;
  }

  .mobile-header {
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(180deg, var(--sidebar-start) 0%, var(--sidebar-end) 100%);
    color: #ffffff;
    padding: 0 18px;
  }

  .mobile-header .brand i {
    font-size: 18px;
  }

  .mobile-header .brand strong {
    font-size: 15px;
    line-height: 1;
  }

  .main-inner {
    min-height: auto;
  }

  .content-body {
    padding: 22px;
  }
}
</style>

