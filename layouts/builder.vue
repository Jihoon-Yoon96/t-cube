<template>
  <div class="tc-builder-page">
    <div class="tc-builder-shell">
      <BuilderSidebar
        :active-mode="activeMode"
        @select-create="builderStore.setStep('start')"
        @select-edit="builderStore.startEditor()"
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
            :active-viewport="builderStore.activeViewport"
            :viewport-modes="viewportModes"
            @update:active-viewport="builderStore.setActiveViewport"
            @preview="builderStore.setStep('preview')"
            @save="handleSave"
          />

          <section class="tc-builder-content-body">
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


