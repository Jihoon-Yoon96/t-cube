<template>
  <section class="creation-start">
    <div class="creation-intro">
      <h1>웹페이지 생성 방식을 선택해주세요</h1>
      <p>준비된 파일을 업로드하거나, 화면 정보와 레이아웃을 구성해 AI로 새로운 웹페이지를 만들어보세요.</p>
    </div>

    <div class="creation-options">
      <button class="creation-card" type="button" @click="builderView.moveToView('pdf-image-upload')">
        <TcubeIcon icon="ri-upload-cloud-2-line" />
        <strong>웹페이지 파일 업로드</strong>
        <span>HTML, PDF, 이미지 파일을 기반으로<br>웹페이지를 생성합니다.</span>
      </button>

      <button class="creation-card" type="button" @click="builderView.moveToView('layout-design')">
        <TcubeIcon icon="ri-edit-box-line" />
        <strong>AI 웹페이지 만들기</strong>
        <span>화면 정보와 레이아웃을 구성해<br>AI로 웹페이지를 생성합니다.</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useBuilderView } from '~/composables/view/useBuilderView'

const builderView = useBuilderView()
</script>
