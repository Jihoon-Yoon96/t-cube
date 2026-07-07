<template>
  <section class="creation-start">
    <div class="creation-intro">
      <h1>템플릿 생성 방식을 선택해주세요</h1>
      <p>준비된 시안 파일이 있다면 업로드하고, 아직 시안이 없다면 직접 작성하거나 AI의 도움을 받아 만들어보세요.</p>
    </div>

    <div class="creation-options">
      <button class="creation-card" type="button" @click="builderStore.setView('pdf-image-upload')">
        <TcubeIcon icon="ri-upload-cloud-2-line" />
        <strong>디자인 시안 파일 업로드</strong>
        <span>HTML, PDF, 이미지 파일을 기반으로<br>템플릿을 생성합니다.</span>
      </button>

      <button class="creation-card" type="button" @click="builderStore.setView('ai-design')">
        <TcubeIcon icon="ri-edit-box-line" />
        <strong>디자인 시안 작성</strong>
        <span>레이아웃, 기획안 또는 AI 프롬프트를 통해<br>새로운 시안을 작성합니다.</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useBuilderStore } from '~/stores/builder'

const builderStore = useBuilderStore()
</script>

