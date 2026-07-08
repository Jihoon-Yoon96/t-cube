<template>
  <section class="creation-start">
    <div class="creation-intro">
      <h1>시안 작성 방식을 선택해주세요</h1>
      <p>템플릿 생성에 사용할 디자인 시안을 직접 만들거나 AI로 생성해주세요.</p>
    </div>

    <div class="creation-options">
      <button
        v-for="option in designOptions"
        :key="option.label"
        class="creation-card"
        type="button"
        @click="builderView.selectDesignMethod(option.method)"
      >
        <TcubeIcon :icon="option.icon" />
        <strong>{{ option.label }}</strong>
        <span>{{ option.description }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useBuilderView } from '~/composables/view/useBuilderView'

const builderView = useBuilderView()

const designOptions = [
  {
    label: '레이아웃 작성',
    description: '화면 구조와 콘텐츠 배치를 직접 입력합니다.',
    method: 'layout',
    icon: 'ri-layout-2-line'
  },
  {
    label: 'AI 프롬프트 작성',
    description: '프롬프트를 입력해 디자인 시안 초안을 생성합니다.',
    method: 'ai-prompt',
    icon: 'ri-sparkling-2-line'
  }
] as const
</script>
