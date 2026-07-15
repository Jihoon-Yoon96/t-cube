<template>
  <section class="creation-start">
    <div class="creation-intro">
      <h1>웹페이지 파일 유형을 선택해주세요</h1>
      <p>HTML, 이미지, PDF 파일을 업로드하면 구조와 디자인 요소를 분석해 웹페이지 생성을 시작합니다.</p>
    </div>

    <div class="upload-options">
      <button
        v-for="option in uploadOptions"
        :key="option.label"
        class="creation-card upload-card"
        type="button"
        @click="builderUpload.selectUploadFileType(option.fileType)"
      >
        <TcubeIcon :icon="option.icon" />
        <strong>{{ option.label }}</strong>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useBuilderUpload } from '~/composables/upload/useBuilderUpload'

const builderUpload = useBuilderUpload()

const uploadOptions = [
  {
    label: 'HTML 업로드',
    fileType: 'HTML',
    icon: 'ri-html5-line'
  },
  {
    label: '이미지 업로드',
    fileType: '이미지',
    icon: 'ri-image-line'
  },
  {
    label: 'PDF 업로드',
    fileType: 'PDF',
    icon: 'ri-file-pdf-2-line'
  }
] as const
</script>
