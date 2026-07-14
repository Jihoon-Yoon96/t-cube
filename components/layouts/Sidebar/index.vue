<template>
  <aside class="tc-builder-sidebar">
    <div class="tc-builder-brand">
      <TcubeIcon icon="ri-edit-box-fill" />
      <div class="tc-builder-brand-text">
        <strong>T.CUBE</strong>
      </div>
      <button
        v-if="collapsible"
        class="tc-builder-sidebar-brand-collapse-button"
        type="button"
        aria-label="사이드바 접기"
        title="사이드바 접기"
        @click="emit('collapse')"
      >
        <TcubeIcon icon="ri-sidebar-fold-line" />
      </button>
    </div>

    <nav class="tc-builder-sidebar-menu">
      <div v-for="item in menuItems" :key="item.key" class="tc-builder-sidebar-menu-group">
        <button
          class="tc-builder-sidebar-menu-item"
          :class="{ 'tc-builder-is-active': activeMode === item.key }"
          type="button"
          @click="emit(item.event)"
        >
          <TcubeIcon :icon="item.icon" />
          <span>{{ item.label }}</span>
        </button>

        <SidebarTree v-if="item.key === 'create' && activeMode === 'create'" />
      </div>
    </nav>

  </aside>
</template>

<script setup lang="ts">
import SidebarTree from './SidebarTree.vue'

defineProps<{
  activeMode: 'create' | 'edit'
  collapsible: boolean
}>()

const emit = defineEmits<{
  'select-create': []
  'select-edit': []
  collapse: []
}>()

const menuItems = [
  {
    key: 'create',
    label: '템플릿 생성',
    icon: 'ri-add-box-line',
    event: 'select-create'
  },
  {
    key: 'edit',
    label: '템플릿 수정',
    icon: 'ri-edit-line',
    event: 'select-edit'
  }
] as const
</script>
