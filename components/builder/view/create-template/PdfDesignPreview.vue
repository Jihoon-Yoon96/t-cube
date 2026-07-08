<template>
  <section class="image-design-preview-screen">
    <div class="image-design-preview-header">
      <div>
        <span class="section-title">PDF DESIGN</span>
        <h1>업로드한 PDF 시안을 확인해주세요</h1>
        <p>PDF 시안을 기반으로 HTML 템플릿을 생성하기 전, 파일 정보와 화면을 확인할 수 있습니다.</p>
      </div>

      <div class="image-design-preview-actions">
        <button class="secondary-action" type="button" @click="handleSelectFileAgain">
          <TcubeIcon icon="ri-arrow-left-line" />
          <span>파일 다시 선택</span>
        </button>
        <button
          class="primary-action"
          :class="{ 'is-loading': builderUpload.importStatus === 'importing' }"
          type="button"
          :disabled="isGenerateButtonDisabled"
          @click="handleGenerateHtml"
        >
          <TcubeIcon
            :class="{ 'rotating-icon': builderUpload.importStatus === 'importing' }"
            :icon="builderUpload.importStatus === 'importing' ? 'ri-loader-4-line' : 'ri-code-s-slash-line'"
          />
          <span>{{ generateButtonLabel }}</span>
        </button>
      </div>
    </div>

    <p v-if="builderUpload.uploadError" class="upload-message error">
      {{ builderUpload.uploadError }}
    </p>
    <p v-else-if="pdfPageMessage" class="upload-message" :class="{ error: !canGenerateHtml }">
      {{ pdfPageMessage }}
    </p>

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
            <dd>{{ builderUpload.uploadedFileSummary?.name }}</dd>
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
            <dt>페이지 수</dt>
            <dd>{{ pdfPageCountLabel }}</dd>
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
import { useBuilderHtmlGeneration } from '~/composables/html/useBuilderHtmlGeneration'
import { useBuilderUpload } from '~/composables/upload/useBuilderUpload'
import { useBuilderView } from '~/composables/view/useBuilderView'

const builderUpload = useBuilderUpload()
const builderView = useBuilderView()
const builderHtmlGeneration = useBuilderHtmlGeneration()
const pdfUrl = ref('')
const pdfPageCount = ref(0)
const isCheckingPdfPageCount = ref(false)
const generationElapsedSeconds = ref(0)
let generationTimerId: ReturnType<typeof setInterval> | null = null

const generateButtonLabel = computed(() => {
  if (builderUpload.importStatus === 'importing') {
    return `HTML 생성 중 ${generationElapsedSeconds.value}s`
  }

  if (isCheckingPdfPageCount.value) return '페이지 확인 중'

  return 'HTML 생성'
})

const canGenerateHtml = computed(() => pdfPageCount.value === 1)
const isGenerateButtonDisabled = computed(() => (
  builderUpload.importStatus === 'importing'
  || isCheckingPdfPageCount.value
  || !canGenerateHtml.value
))

const pdfPageCountLabel = computed(() => {
  if (isCheckingPdfPageCount.value) return '확인 중'
  if (!pdfPageCount.value) return '-'

  return `${pdfPageCount.value}페이지`
})

const pdfPageMessage = computed(() => {
  if (isCheckingPdfPageCount.value) return 'PDF 페이지 수를 확인하고 있습니다.'
  if (!pdfPageCount.value) return ''
  if (pdfPageCount.value === 1) return ''

  return '현재는 1페이지 PDF만 HTML로 변환할 수 있습니다. 2페이지 이상인 PDF는 페이지 선택 기능을 연결한 뒤 지원할 예정입니다.'
})

const fileTypeLabel = computed(() => {
  const extension = builderUpload.uploadedFileSummary?.extension

  return extension ? `.${extension.toUpperCase()}` : 'PDF'
})

const fileSizeLabel = computed(() => {
  const size = builderUpload.uploadedFileSummary?.size

  if (!size) return '-'

  return formatFileSize(size)
})

/**
 * 업로드된 PDF 파일을 브라우저에서 표시할 수 있는 object URL로 변환
 */
function createPdfPreviewUrl() {
  revokePdfPreviewUrl()
  pdfPageCount.value = 0

  if (!builderUpload.uploadedFile) return

  pdfUrl.value = URL.createObjectURL(builderUpload.uploadedFile)
  readPdfPageCount(builderUpload.uploadedFile)
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
 * PDF 기반 HTML 생성 API를 호출하고 생성 결과를 HTML 편집기로 전달
 */
function handleGenerateHtml() {
  if (!canGenerateHtml.value) return

  builderHtmlGeneration.generateHtmlFromUploadedPdf()
}

/**
 * PDF 문서의 전체 페이지 수를 읽어 변환 가능 여부 판단에 사용
 *
 * @param file 페이지 수를 확인할 PDF 파일
 */
async function readPdfPageCount(file: File) {
  isCheckingPdfPageCount.value = true

  try {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()

    const loadingTask = pdfjs.getDocument({
      data: await file.arrayBuffer()
    })
    const pdfDocument = await loadingTask.promise

    pdfPageCount.value = pdfDocument.numPages
    await loadingTask.destroy()
  } catch {
    pdfPageCount.value = 0
  } finally {
    isCheckingPdfPageCount.value = false
  }
}

/**
 * HTML 생성 요청이 진행 중이면 확인 후 파일 업로드 단계로 이동
 */
function handleSelectFileAgain() {
  builderView.setView('file-upload')
}

/**
 * 브라우저 새로고침/탭 닫기 시 생성 중인 요청이 있으면 기본 이탈 확인창을 표시
 *
 * @param event 브라우저 이탈 직전에 발생하는 beforeunload 이벤트
 */
function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (builderUpload.importStatus !== 'importing') return

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
  () => builderUpload.uploadedFile,
  () => {
    createPdfPreviewUrl()
  }
)

watch(
  () => builderUpload.importStatus,
  (status) => {
    if (status === 'importing') {
      startGenerationTimer()
      return
    }

    stopGenerationTimer()
  }
)

onMounted(() => {
  createPdfPreviewUrl()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)

  if (builderUpload.importStatus === 'importing') {
    builderHtmlGeneration.cancelPdfHtmlGeneration()
  }

  stopGenerationTimer()
  revokePdfPreviewUrl()
})

onBeforeRouteLeave(() => {
  if (builderUpload.importStatus !== 'importing') return true

  const confirmed = window.confirm('AI가 HTML을 생성 중입니다. 정말 나가시겠습니까?')

  if (confirmed) {
    builderHtmlGeneration.cancelPdfHtmlGeneration()
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
