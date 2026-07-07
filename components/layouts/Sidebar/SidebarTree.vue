<template>
  <div
    v-if="createTreeItems.length"
    class="tc-builder-sidebar-tree"
    aria-label="템플릿 생성 단계"
  >
    <button
      v-for="treeItem in createTreeItems"
      :key="treeItem.label"
      class="tc-builder-sidebar-tree-item"
      :class="{
        'tc-builder-is-active': treeItem.active,
        'tc-builder-sidebar-tree-item-child': treeItem.depth === 2,
        'tc-builder-is-last': treeItem.last
      }"
      type="button"
      @click="treeItem.onClick"
    >
      <span class="tc-builder-sidebar-tree-branch" aria-hidden="true"></span>
      <span>{{ treeItem.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useBuilderStore } from '~/stores/builder'

const builderStore = useBuilderStore()

const uploadTreeItems = computed(() => [
  {
    label: 'HTML 업로드',
    active: ['file-upload', 'html-editor'].includes(builderStore.currentView) && builderStore.selectedUploadFileType === 'HTML',
    depth: 2,
    last: false,
    onClick: () => builderStore.selectUploadFileType('HTML')
  },
  {
    label: '이미지 업로드',
    active: ['file-upload', 'image-preview'].includes(builderStore.currentView) && builderStore.selectedUploadFileType === '이미지',
    depth: 2,
    last: false,
    onClick: () => builderStore.selectUploadFileType('이미지')
  },
  {
    label: 'PDF 업로드',
    active: ['file-upload', 'pdf-preview'].includes(builderStore.currentView) && builderStore.selectedUploadFileType === 'PDF',
    depth: 2,
    last: false,
    onClick: () => builderStore.selectUploadFileType('PDF')
  }
])

const designTreeItems = computed(() => [
  {
    label: '레이아웃 작성',
    active: builderStore.currentView === 'ai-design' && builderStore.selectedDesignMethod === 'layout',
    depth: 2,
    last: false,
    onClick: () => builderStore.selectDesignMethod('layout')
  },
  {
    label: 'AI 프롬프트 작성',
    active: builderStore.currentView === 'ai-design' && builderStore.selectedDesignMethod === 'ai-prompt',
    depth: 2,
    last: true,
    onClick: () => builderStore.selectDesignMethod('ai-prompt')
  }
])

const createTreeItems = computed(() => {
  if (builderStore.currentView === 'start') {
    return [
      {
        label: '파일 업로드',
        active: false,
        depth: 1,
        last: false,
        onClick: () => builderStore.setView('pdf-image-upload')
      },
      {
        label: '디자인 시안 작성',
        active: false,
        depth: 1,
        last: true,
        onClick: () => builderStore.setView('ai-design')
      }
    ]
  }

  if (builderStore.currentView === 'pdf-image-upload') {
    return [
      {
        label: '파일 업로드',
        active: true,
        depth: 1,
        last: false,
        onClick: () => builderStore.setView('pdf-image-upload')
      },
      ...uploadTreeItems.value,
      {
        label: '디자인 시안 작성',
        active: false,
        depth: 1,
        last: true,
        onClick: () => builderStore.setView('ai-design')
      }
    ]
  }

  if (
    builderStore.currentView === 'file-upload'
    || builderStore.currentView === 'html-editor'
    || builderStore.currentView === 'image-preview'
    || builderStore.currentView === 'pdf-preview'
  ) {
    return [
      {
        label: '파일 업로드',
        active: false,
        depth: 1,
        last: false,
        onClick: () => builderStore.setView('pdf-image-upload')
      },
      ...uploadTreeItems.value,
      {
        label: '디자인 시안 작성',
        active: false,
        depth: 1,
        last: true,
        onClick: () => builderStore.setView('ai-design')
      }
    ]
  }

  if (builderStore.currentView === 'ai-design') {
    return [
      {
        label: '파일 업로드',
        active: false,
        depth: 1,
        last: false,
        onClick: () => builderStore.setView('pdf-image-upload')
      },
      {
        label: '디자인 시안 작성',
        active: true,
        depth: 1,
        last: false,
        onClick: () => builderStore.setView('ai-design')
      },
      ...designTreeItems.value
    ]
  }

  if (builderStore.currentView === 'preview') {
    return [
      {
        label: '파일 업로드',
        active: false,
        depth: 1,
        last: false,
        onClick: () => builderStore.setView('pdf-image-upload')
      },
      {
        label: '디자인 시안 작성',
        active: false,
        depth: 1,
        last: true,
        onClick: () => builderStore.setView('ai-design')
      }
    ]
  }

  return []
})
</script>

