<template>
  <div
    v-if="createStepItems.length"
    class="tc-builder-sidebar-tree"
    aria-label="템플릿 생성 단계"
  >
    <button
      v-for="stepItem in createStepItems"
      :key="stepItem.label"
      class="tc-builder-sidebar-tree-item"
      :class="{
        'tc-builder-is-active': stepItem.active,
        'tc-builder-sidebar-tree-item-child': stepItem.depth === 2,
        'tc-builder-is-last': stepItem.last
      }"
      type="button"
      @click="stepItem.onClick"
    >
      <span class="tc-builder-sidebar-tree-branch" aria-hidden="true"></span>
      <span>{{ stepItem.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useBuilderStore } from '~/stores/builder'

const builderStore = useBuilderStore()

const uploadStepItems = computed(() => [
  {
    label: 'HTML 업로드',
    active: ['file-upload', 'html-editor'].includes(builderStore.step) && builderStore.selectedUploadFileType === 'HTML',
    depth: 2,
    last: false,
    onClick: () => builderStore.selectUploadFileType('HTML')
  },
  {
    label: '이미지 업로드',
    active: builderStore.step === 'file-upload' && builderStore.selectedUploadFileType === '이미지',
    depth: 2,
    last: false,
    onClick: () => builderStore.selectUploadFileType('이미지')
  },
  {
    label: 'PDF 업로드',
    active: builderStore.step === 'file-upload' && builderStore.selectedUploadFileType === 'PDF',
    depth: 2,
    last: false,
    onClick: () => builderStore.selectUploadFileType('PDF')
  }
])

const designStepItems = computed(() => [
  {
    label: '레이아웃 작성',
    active: builderStore.step === 'ai-design' && builderStore.selectedDesignMethod === 'layout',
    depth: 2,
    last: false,
    onClick: () => builderStore.selectDesignMethod('layout')
  },
  {
    label: 'AI 프롬프트 작성',
    active: builderStore.step === 'ai-design' && builderStore.selectedDesignMethod === 'ai-prompt',
    depth: 2,
    last: true,
    onClick: () => builderStore.selectDesignMethod('ai-prompt')
  }
])

const createStepItems = computed(() => {
  if (builderStore.step === 'start') {
    return [
      {
        label: '파일 업로드',
        active: false,
        depth: 1,
        last: false,
        onClick: () => builderStore.setStep('pdf-image-upload')
      },
      {
        label: '디자인 시안 작성',
        active: false,
        depth: 1,
        last: true,
        onClick: () => builderStore.setStep('ai-design')
      }
    ]
  }

  if (builderStore.step === 'pdf-image-upload') {
    return [
      {
        label: '파일 업로드',
        active: true,
        depth: 1,
        last: false,
        onClick: () => builderStore.setStep('pdf-image-upload')
      },
      ...uploadStepItems.value,
      {
        label: '디자인 시안 작성',
        active: false,
        depth: 1,
        last: true,
        onClick: () => builderStore.setStep('ai-design')
      }
    ]
  }

  if (builderStore.step === 'file-upload' || builderStore.step === 'html-editor') {
    return [
      {
        label: '파일 업로드',
        active: false,
        depth: 1,
        last: false,
        onClick: () => builderStore.setStep('pdf-image-upload')
      },
      ...uploadStepItems.value,
      {
        label: '디자인 시안 작성',
        active: false,
        depth: 1,
        last: true,
        onClick: () => builderStore.setStep('ai-design')
      }
    ]
  }

  if (builderStore.step === 'ai-design') {
    return [
      {
        label: '파일 업로드',
        active: false,
        depth: 1,
        last: false,
        onClick: () => builderStore.setStep('pdf-image-upload')
      },
      {
        label: '디자인 시안 작성',
        active: true,
        depth: 1,
        last: false,
        onClick: () => builderStore.setStep('ai-design')
      },
      ...designStepItems.value
    ]
  }

  if (builderStore.step === 'preview') {
    return [
      {
        label: '파일 업로드',
        active: false,
        depth: 1,
        last: false,
        onClick: () => builderStore.setStep('pdf-image-upload')
      },
      {
        label: '디자인 시안 작성',
        active: false,
        depth: 1,
        last: true,
        onClick: () => builderStore.setStep('ai-design')
      }
    ]
  }

  return []
})
</script>
