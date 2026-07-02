<template>
  <div
    v-if="createStepItems.length"
    class="step-tree"
    aria-label="템플릿 생성 단계"
  >
    <button
      v-for="stepItem in createStepItems"
      :key="stepItem.label"
      class="step-tree-item"
      :class="{
        active: stepItem.active,
        child: stepItem.depth === 2,
        'is-last': stepItem.last
      }"
      type="button"
      @click="stepItem.onClick"
    >
      <span class="tree-branch" aria-hidden="true"></span>
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
    active: builderStore.step === 'file-upload' && builderStore.selectedUploadFileType === 'HTML',
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

  if (builderStore.step === 'file-upload') {
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

<style scoped>
.step-tree {
  position: relative;
  display: grid;
  margin: 0 0 6px 24px;
  padding: 0 0 0 12px;
}

.step-tree::before {
  position: absolute;
  top: 0;
  bottom: 14px;
  left: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.28);
  content: "";
}

.step-tree-item {
  position: relative;
  width: 100%;
  height: 28px;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.74);
  padding: 0 8px 0 0;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.step-tree-item.child {
  margin-left: 18px;
  width: calc(100% - 18px);
}

.step-tree-item::after {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -12px;
  width: 1px;
  background: rgba(255, 255, 255, 0.28);
  content: "";
}

.step-tree-item.is-last::after {
  bottom: 14px;
}

.step-tree-item.child::after {
  left: -30px;
}

.tree-branch {
  position: absolute;
  top: 50%;
  left: -12px;
  width: 12px;
  height: 1px;
  flex: 0 0 auto;
  background: rgba(255, 255, 255, 0.28);
  transform: translateY(-50%);
}

.step-tree-item.child .tree-branch {
  left: -30px;
  width: 30px;
}

.step-tree-item span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-tree-item.active {
  color: #ffffff;
  font-weight: 900;
}

.step-tree-item:hover {
  color: #ffffff;
}
</style>
