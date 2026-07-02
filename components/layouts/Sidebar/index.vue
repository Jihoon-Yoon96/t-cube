<template>
  <aside class="sidebar desktop-sidebar">
    <div class="brand">
      <TcubeIcon icon="ri-edit-box-fill" />
      <div class="brand-text">
        <strong>T.CUBE</strong>
      </div>
    </div>

    <nav class="menu">
      <div v-for="item in menuItems" :key="item.key" class="menu-group">
        <button
          class="menu-item"
          :class="{ active: activeMode === item.key }"
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
}>()

const emit = defineEmits<{
  'select-create': []
  'select-edit': []
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

<style scoped>
.sidebar {
  background: linear-gradient(180deg, var(--sidebar-start) 0%, var(--sidebar-end) 100%);
  color: #ffffff;
  padding: 24px 18px;
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

.sidebar .brand {
  margin-bottom: 34px;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.menu-group {
  display: grid;
  gap: 6px;
}

.menu-item {
  width: 100%;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #ffffff;
  padding: 0 12px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.menu-item i {
  width: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  line-height: 1;
}

.menu-item span {
  line-height: 1;
}

.menu-item.active {
  background: rgba(255, 255, 255, 0.18);
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.12);
}
</style>
