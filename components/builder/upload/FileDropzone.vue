<template>
  <div class="dropzone-wrap">
    <input
      ref="fileInput"
      class="file-input"
      type="file"
      :accept="selectedUploadAccept"
      @change="handleFileInputChange"
    >

    <div
      class="file-dropzone"
      :class="{
        dragging: isDraggingFile,
        ready: Boolean(builderStore.uploadedFileSummary),
        error: Boolean(builderStore.uploadError)
      }"
      role="button"
      tabindex="0"
      @click="openFilePicker"
      @keydown.enter.prevent="openFilePicker"
      @keydown.space.prevent="openFilePicker"
      @dragenter.prevent="handleDragEnter"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
	  <!-- 파일 업로드 validation 통과할 때 -->
      <template v-if="builderStore.uploadedFileSummary">
        <TcubeIcon icon="ri-file-check-line" />
        <span>
          <strong>{{ builderStore.uploadedFileSummary.name }}</strong>
        </span>
        <small>{{ uploadedFileMeta }} · 클릭하거나 드래그해서 파일을 교체할 수 있습니다.</small>
      </template>

	  <!-- 파일 업로드 validation 통과 못할 때 -->
      <template v-else>
        <TcubeIcon icon="ri-upload-2-line" />
        <span>
          {{ builderStore.selectedUploadFileType }} 파일을 드래그하거나
          <strong>파일 선택</strong>
        </span>
        <small>{{ selectedUploadExtension }} 파일만 업로드 가능합니다</small>
      </template>
    </div>

	<!-- 파일 업로드 validation 통과 못할 때 -->
    <p v-if="builderStore.uploadError" class="upload-message error">
      {{ builderStore.uploadError }}
    </p>
	<!-- 파일 업로드 validation 통과할 때 -->
    <p v-else-if="builderStore.uploadedFileSummary" class="upload-message success">
      파일 업로드가 완료되었습니다.
    </p>

    <div class="upload-actions">
      <button
        class="secondary-action"
        type="button"
        :disabled="!builderStore.uploadedFileSummary"
        @click="clearUploadedFile"
      >
        <TcubeIcon icon="ri-refresh-line" />
        <span>다시 선택</span>
      </button>
      <button
        class="primary-action"
        type="button"
        :disabled="!builderStore.uploadedFileSummary"
        @click="builderStore.startFileAnalysis()"
      >
        <TcubeIcon icon="ri-search-eye-line" />
        <span>{{ analysisButtonLabel }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBuilderStore } from '~/stores/builder'

const builderStore = useBuilderStore()
const fileInput = ref<HTMLInputElement | null>(null)

/**
 * 현재 드래그 중인 파일이 드롭존 안에 있는지 체크
 */
const isDraggingFile = ref(false)

/**
 * 드롭존 내부 자식 요소 사이를 이동할 때 발생하는 중첩 dragenter/dragleave를 추적
 * 이 값으로 드래그 활성 상태가 깜빡이지 않도록 제어
 */
let dragDepth = 0


/**
 * 업로드 허용 파일 유형 정리
 * */
const selectedUploadAccept = computed(() => {
  if (builderStore.selectedUploadFileType === 'HTML') return '.html,.htm,text/html'
  if (builderStore.selectedUploadFileType === '이미지') return 'image/*'

  return '.pdf,application/pdf'
})

/**
 * 현재 선택된 업로드 유형에 맞춰 사용자에게 안내할 허용 확장자 문구 반환
 *
 * @returns 드롭존 하단에 표시할 파일 확장자 안내 문자열
 */
const selectedUploadExtension = computed(() => {
  if (builderStore.selectedUploadFileType === 'HTML') return '.html, .htm'
  if (builderStore.selectedUploadFileType === '이미지') return '이미지'

  return '.pdf'
})

/**
 * 업로드된 파일의 확장자와 용량을 UI 표시용 메타 문자열로 변환
 *
 * @returns 업로드된 파일이 있으면 확장자와 용량 문자열, 없으면 빈 문자열 반환
 */
const uploadedFileMeta = computed(() => {
  if (!builderStore.uploadedFileSummary) return ''

  const extension = builderStore.uploadedFileSummary.extension
    ? `.${builderStore.uploadedFileSummary.extension.toUpperCase()}`
    : '파일'

  return `${extension} · ${formatFileSize(builderStore.uploadedFileSummary.size)}`
})

const analysisButtonLabel = computed(() => {
  if (builderStore.importStatus === 'importing') return '분석 준비 중'

  return '분석 시작'
})

function openFilePicker() {
  fileInput.value?.click()
}

/**
 * 파일 선택 창에서 선택된 첫 번째 파일을 업로드 검증 흐름으로 전달
 *
 * @param event 파일 input의 change 이벤트입니다.
 */
function handleFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    builderStore.uploadDesignFile(file)
  }

  input.value = ''
}

/**
 * 파일이 드롭존 위로 진입했을 때 드래그 세션을 시작하거나 유지
 */
function handleDragEnter() {
  dragDepth += 1
  isDraggingFile.value = true
}

/**
 * 브라우저가 dragover 이벤트를 반복해서 발생시키는 동안 드래그 활성 상태를 유지
 */
function handleDragOver() {
  isDraggingFile.value = true
}

/**
 * 커서가 드롭존 전체를 벗어났을 때만 드래그 활성 상태를 종료
 */
function handleDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) {
    isDraggingFile.value = false
  }
}

/**
 * 드롭된 로컬 파일 중 첫 번째 파일을 공통 업로드 검증 흐름으로 전달
 *
 * @param event 드롭된 파일 목록을 포함하는 DragEvent
 */
function handleDrop(event: DragEvent) {
  dragDepth = 0
  isDraggingFile.value = false

  const file = event.dataTransfer?.files?.[0]
  if (file) {
    builderStore.uploadDesignFile(file)
  }
}

/**
 * store에 저장된 업로드 파일 상태 및 실제 input 값을 초기화
 */
function clearUploadedFile() {
  builderStore.clearUploadedFile()
  if (fileInput.value) {
    fileInput.value.value = ''
  }
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
</script>
