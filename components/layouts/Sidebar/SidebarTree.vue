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
import { useBuilderUpload } from '~/composables/upload/useBuilderUpload'
import { useBuilderView } from '~/composables/view/useBuilderView'

const builderView = useBuilderView()
const builderUpload = useBuilderUpload()

const uploadTreeItems = computed(() => [
  {
    label: 'HTML 업로드',
    active: ['file-upload', 'html-editor'].includes(builderView.currentView) && builderUpload.selectedUploadFileType === 'HTML',
    depth: 2,
    last: false,
    onClick: () => builderUpload.selectUploadFileType('HTML')
  },
  {
    label: '이미지 업로드',
    active: ['file-upload', 'image-preview'].includes(builderView.currentView) && builderUpload.selectedUploadFileType === '이미지',
    depth: 2,
    last: false,
    onClick: () => builderUpload.selectUploadFileType('이미지')
  },
  {
    label: 'PDF 업로드',
    active: ['file-upload', 'pdf-preview'].includes(builderView.currentView) && builderUpload.selectedUploadFileType === 'PDF',
    depth: 2,
    last: false,
    onClick: () => builderUpload.selectUploadFileType('PDF')
  }
])

const designTreeItems = computed(() => [
  {
    label: '레이아웃 작성',
    active: builderView.currentView === 'layout-design',
    depth: 2,
    last: false,
    onClick: () => builderView.selectDesignMethod('layout')
  },
  {
    label: 'AI 프롬프트 작성',
    active: builderView.currentView === 'ai-prompt-design',
    depth: 2,
    last: true,
    onClick: () => builderView.selectDesignMethod('ai-prompt')
  }
])

const createTreeItems = computed(() => {
  if (builderView.currentView === 'start') {
    return [
      {
        label: '파일 업로드',
        active: false,
        depth: 1,
        last: false,
        onClick: () => builderView.moveToView('pdf-image-upload')
      },
      {
        label: '디자인 시안 작성',
        active: false,
        depth: 1,
        last: true,
        onClick: () => builderView.moveToView('design-method')
      }
    ]
  }

  if (builderView.currentView === 'pdf-image-upload') {
    return [
      {
        label: '파일 업로드',
        active: true,
        depth: 1,
        last: false,
        onClick: () => builderView.moveToView('pdf-image-upload')
      },
      ...uploadTreeItems.value,
      {
        label: '디자인 시안 작성',
        active: false,
        depth: 1,
        last: true,
        onClick: () => builderView.moveToView('design-method')
      }
    ]
  }

  if (
    builderView.currentView === 'file-upload'
    || builderView.currentView === 'html-editor'
    || builderView.currentView === 'image-preview'
    || builderView.currentView === 'pdf-preview'
  ) {
    return [
      {
        label: '파일 업로드',
        active: false,
        depth: 1,
        last: false,
        onClick: () => builderView.moveToView('pdf-image-upload')
      },
      ...uploadTreeItems.value,
      {
        label: '디자인 시안 작성',
        active: false,
        depth: 1,
        last: true,
        onClick: () => builderView.moveToView('design-method')
      }
    ]
  }

  if (
    builderView.currentView === 'design-method'
    || builderView.currentView === 'layout-design'
    || builderView.currentView === 'ai-prompt-design'
  ) {
    return [
      {
        label: '파일 업로드',
        active: false,
        depth: 1,
        last: false,
        onClick: () => builderView.moveToView('pdf-image-upload')
      },
      {
        label: '디자인 시안 작성',
        active: builderView.currentView === 'design-method',
        depth: 1,
        last: false,
        onClick: () => builderView.moveToView('design-method')
      },
      ...designTreeItems.value
    ]
  }

  if (builderView.currentView === 'preview') {
    return [
      {
        label: '파일 업로드',
        active: false,
        depth: 1,
        last: false,
        onClick: () => builderView.moveToView('pdf-image-upload')
      },
      {
        label: '디자인 시안 작성',
        active: false,
        depth: 1,
        last: true,
        onClick: () => builderView.moveToView('design-method')
      }
    ]
  }

  return []
})
</script>
