<template>
  <section class="image-design-preview-screen">
    <div class="image-design-preview-header">
      <div>
        <span class="section-title">IMAGE DESIGN</span>
        <h1>업로드한 디자인 시안을 확인해주세요</h1>
        <p>이미지 시안을 기반으로 HTML 템플릿을 생성하기 전, 파일 정보와 화면을 확인할 수 있습니다.</p>
      </div>

      <div class="image-design-preview-actions">
        <button class="secondary-action" type="button" @click="handleSelectFileAgain">
          <TcubeIcon icon="ri-arrow-left-line" />
          <span>파일 다시 선택</span>
        </button>
        <button
          class="primary-action"
          :class="{ 'is-loading': builderStore.importStatus === 'importing' }"
          type="button"
          :disabled="builderStore.importStatus === 'importing'"
          @click="handleGenerateHtml"
        >
          <TcubeIcon
            :class="{ 'rotating-icon': builderStore.importStatus === 'importing' }"
            :icon="builderStore.importStatus === 'importing' ? 'ri-loader-4-line' : 'ri-code-s-slash-line'"
          />
          <span>{{ generateButtonLabel }}</span>
        </button>
      </div>
    </div>

    <p v-if="builderStore.uploadError" class="upload-message error">
      {{ builderStore.uploadError }}
    </p>

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
const generationElapsedSeconds = ref(0)
let generationTimerId: ReturnType<typeof setInterval> | null = null

const generateButtonLabel = computed(() => {
  if (builderStore.importStatus === 'importing') {
    return `HTML 생성 중 ${generationElapsedSeconds.value}s`
  }

  return 'HTML 생성'
})

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
 * 이미지 기반 HTML 생성 API를 호출하고 생성 결과를 HTML 편집기로 전달
 */
function handleGenerateHtml() {
  builderStore.generateHtmlFromUploadedImage()
}

/**
 * HTML 생성 요청이 진행 중이면 취소한 뒤 파일 업로드 단계로 이동
 */
function handleSelectFileAgain() {
  builderStore.setStep('file-upload')
}

/**
 * 브라우저 새로고침/탭 닫기 시 생성 중인 요청이 있으면 기본 이탈 확인창을 표시
 *
 * @param event 브라우저 이탈 직전에 발생하는 beforeunload 이벤트
 */
function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (builderStore.importStatus !== 'importing') return

  event.preventDefault()
  event.returnValue = ''
}

/**
 * HTML 생성 응답을 기다리는 동안 버튼에 표시할 경과 시간을 1초 단위로 갱신
 */
function startGenerationTimer() {
  stopGenerationTimer()
  generationElapsedSeconds.value = 0
  generationTimerId = setInterval(() => {
    generationElapsedSeconds.value += 1
  }, 1000)
}

/**
 * HTML 생성 대기 시간 타이머를 정리하고 경과 시간을 초기화
 */
function stopGenerationTimer() {
  if (generationTimerId) {
    clearInterval(generationTimerId)
    generationTimerId = null
  }

  generationElapsedSeconds.value = 0
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

watch(
  () => builderStore.importStatus,
  (status) => {
    if (status === 'importing') {
      startGenerationTimer()
      return
    }

    stopGenerationTimer()
  }
)

onMounted(() => {
  createImagePreviewUrl()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)

  if (builderStore.importStatus === 'importing') {
    builderStore.cancelImageHtmlGeneration()
  }

  stopGenerationTimer()
  revokeImagePreviewUrl()
})

onBeforeRouteLeave(() => {
  if (builderStore.importStatus !== 'importing') return true

  const confirmed = window.confirm('AI가 HTML을 생성 중입니다. 정말 나가시겠습니까?')

  if (confirmed) {
    builderStore.cancelImageHtmlGeneration()
  }

  return confirmed
})
</script>

<style scoped>
.primary-action.is-loading {
  cursor: progress;
}

.rotating-icon {
  animation: html-generation-spin 0.8s linear infinite;
}

@keyframes html-generation-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
