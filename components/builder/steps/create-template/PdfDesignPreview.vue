<template>
  <section class="image-design-preview-screen">
    <div class="image-design-preview-header">
      <div>
        <span class="section-title">PDF DESIGN</span>
        <h1>업로드한 PDF 시안을 확인해주세요</h1>
        <p>PDF 시안을 기반으로 HTML 템플릿을 생성하기 전, 파일 정보와 화면을 확인할 수 있습니다.</p>
      </div>

      <div class="image-design-preview-actions">
        <button class="secondary-action" type="button" @click="builderStore.setStep('file-upload')">
          <TcubeIcon icon="ri-arrow-left-line" />
          <span>파일 다시 선택</span>
        </button>
        <button class="primary-action" type="button" @click="handleGenerateHtml">
          <TcubeIcon icon="ri-code-s-slash-line" />
          <span>HTML 생성</span>
        </button>
      </div>
    </div>

    <div v-if="pdfUrl" class="image-design-preview-layout">
      <div class="image-design-preview-canvas pdf-design-preview-canvas">
        <iframe
          :src="pdfUrl"
          title="업로드한 PDF 시안 미리보기"
        />
      </div>

      <aside class="image-design-preview-info">
        <strong>파일 정보</strong>
        <dl>
          <div>
            <dt>파일명</dt>
            <dd>{{ builderStore.uploadedFileSummary?.name }}</dd>
          </div>
          <div>
            <dt>파일 형식</dt>
            <dd>{{ fileTypeLabel }}</dd>
          </div>
          <div>
            <dt>파일 크기</dt>
            <dd>{{ fileSizeLabel }}</dd>
          </div>
        </dl>
      </aside>
    </div>

    <div v-else class="body-placeholder">
      <span class="section-title">PDF DESIGN</span>
      <h1>미리볼 PDF 파일이 없습니다</h1>
      <p>PDF 파일을 다시 업로드해주세요.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useBuilderStore } from '~/stores/builder'

const builderStore = useBuilderStore()
const pdfUrl = ref('')

const fileTypeLabel = computed(() => {
  const extension = builderStore.uploadedFileSummary?.extension

  return extension ? `.${extension.toUpperCase()}` : 'PDF'
})

const fileSizeLabel = computed(() => {
  const size = builderStore.uploadedFileSummary?.size

  if (!size) return '-'

  return formatFileSize(size)
})

/**
 * 업로드된 PDF 파일을 브라우저에서 표시할 수 있는 object URL로 변환
 */
function createPdfPreviewUrl() {
  revokePdfPreviewUrl()

  if (!builderStore.uploadedFile) return

  pdfUrl.value = URL.createObjectURL(builderStore.uploadedFile)
}

/**
 * PDF 미리보기에 사용한 object URL을 해제
 */
function revokePdfPreviewUrl() {
  if (!pdfUrl.value) return

  URL.revokeObjectURL(pdfUrl.value)
  pdfUrl.value = ''
}

/**
 * 다음 단계의 PDF 기반 HTML 생성 기능 진입점을 준비
 */
function handleGenerateHtml() {
  builderStore.failFileAnalysis('PDF 기반 HTML 생성 기능은 다음 단계에서 연결할 예정입니다.')
}

/**
 * 파일 크기를 UI에 표시하기 쉬운 단위 문자열로 변환
 *
 * @param size 바이트 단위의 파일 크기
 * @returns B, KB, MB 단위로 변환된 파일 크기 문자열
 */
function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`

  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

watch(
  () => builderStore.uploadedFile,
  () => {
    createPdfPreviewUrl()
  }
)

onMounted(() => {
  createPdfPreviewUrl()
})

onBeforeUnmount(() => {
  revokePdfPreviewUrl()
})
</script>
