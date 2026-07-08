<template>
  <section class="creation-start file-upload-screen">
    <div class="creation-intro">
      <h1>{{ builderUpload.selectedUploadFileType }} 파일을 업로드 해주세요</h1>
    </div>

    <BuilderFileDropzone />
  </section>
</template>

<script setup lang="ts">
import BuilderFileDropzone from '../../upload/FileDropzone.vue'
import { useBuilderUpload } from '~/composables/upload/useBuilderUpload'

const builderUpload = useBuilderUpload()
</script>
