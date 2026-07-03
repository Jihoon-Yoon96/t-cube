<template>
  <section class="image-design-preview-screen">
    <div class="image-design-preview-header">
      <div>
        <span class="section-title">IMAGE DESIGN</span>
        <h1>업로드한 디자인 시안을 확인해주세요</h1>
        <p>이미지 시안을 기반으로 HTML 템플릿을 생성하기 전, 파일 정보와 화면을 확인할 수 있습니다.</p>
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

    <div v-if="imageUrl" class="image-design-preview-layout">
      <div class="image-design-preview-canvas">
        <img
          :src="imageUrl"
          alt="업로드한 디자인 시안 미리보기"
          @load="handleImageLoad"
        >
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
          <div>
            <dt>이미지 해상도</dt>
            <dd>{{ imageSizeLabel }}</dd>
          </div>
        </dl>
      </aside>
    </div>

    <div v-else class="body-placeholder">
      <span class="section-title">IMAGE DESIGN</span>
      <h1>미리볼 이미지 파일이 없습니다</h1>
      <p>이미지 파일을 다시 업로드해주세요.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useBuilderStore } from '~/stores/builder'

const builderStore = useBuilderStore()
const imageUrl = ref('')
const imageWidth = ref(0)
const imageHeight = ref(0)

const fileTypeLabel = computed(() => {
  const extension = builderStore.uploadedFileSummary?.extension

  return extension ? `.${extension.toUpperCase()}` : '이미지'
})

const fileSizeLabel = computed(() => {
  const size = builderStore.uploadedFileSummary?.size

  if (!size) return '-'

  return formatFileSize(size)
})

const imageSizeLabel = computed(() => {
  if (!imageWidth.value || !imageHeight.value) return '확인 중'

  return `${imageWidth.value} x ${imageHeight.value}px`
})

/**
 * 업로드된 이미지 파일을 브라우저에서 표시할 수 있는 object URL로 변환
 */
function createImagePreviewUrl() {
  revokeImagePreviewUrl()

  if (!builderStore.uploadedFile) return

  imageUrl.value = URL.createObjectURL(builderStore.uploadedFile)
}

/**
 * 이미지 미리보기에 사용한 object URL을 해제
 */
function revokeImagePreviewUrl() {
  if (!imageUrl.value) return

  URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = ''
}

/**
 * 이미지 로드 후 원본 해상도 정보를 저장
 *
 * @param event 이미지 로드가 완료된 img 요소의 load 이벤트
 */
function handleImageLoad(event: Event) {
  const imageElement = event.target as HTMLImageElement

  imageWidth.value = imageElement.naturalWidth
  imageHeight.value = imageElement.naturalHeight
}

/**
 * 다음 단계의 이미지 기반 HTML 생성 기능 진입점을 준비
 */
function handleGenerateHtml() {
  builderStore.failFileAnalysis('이미지 기반 HTML 생성 기능은 다음 단계에서 연결할 예정입니다.')
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
    imageWidth.value = 0
    imageHeight.value = 0
    createImagePreviewUrl()
  }
)

onMounted(() => {
  createImagePreviewUrl()
})

onBeforeUnmount(() => {
  revokeImagePreviewUrl()
})
</script>
