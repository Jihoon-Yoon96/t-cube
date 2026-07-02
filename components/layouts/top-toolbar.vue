<template>
  <div class="top-toolbar">
    <div></div>

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
type ViewportMode = 'desktop' | 'tablet' | 'mobile'

defineProps<{
  activeViewport: ViewportMode
  viewportModes: Array<{
    key: ViewportMode
    label: string
    shortLabel: string
    icon: string
  }>
}>()

const emit = defineEmits<{
  'update:activeViewport': [value: ViewportMode]
  preview: []
  save: []
}>()
</script>

<style scoped>
.top-toolbar {
  height: 74px;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto minmax(180px, 1fr);
  align-items: center;
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
  .top-actions {
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
}
</style>

