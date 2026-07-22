<template>
  <section class="layout-info-screen">
    <header class="layout-info-header">
      <span class="section-title">LAYOUT DESIGN · STEP 1</span>
      <h1>만들고 싶은 웹페이지 정보를 입력해주세요</h1>
      <p>화면의 성격과 목적을 입력하면 다음 단계에서 레이아웃을 구성할 수 있습니다.</p>
    </header>

    <div class="layout-info-content">
      <form class="layout-info-form" @submit.prevent="submitInformation">
      <div class="layout-info-field-grid">
        <label class="layout-info-field">
          <span>카테고리/브랜드 <em>필수</em></span>
          <input v-model="category" type="text" placeholder="예: 쇼핑몰, 은행" autocomplete="off">
          <small>제작할 서비스나 비즈니스 분야</small>
        </label>

        <label class="layout-info-field">
          <span>목적 <em>필수</em></span>
          <textarea v-model="purpose" rows="4" placeholder="예: 신상품 홍보용 랜딩페이지" />
          <small>화면을 통해 달성하려는 핵심 목표</small>
        </label>
      </div>

      <label class="layout-info-field layout-info-field-wide">
        <span>URL <small>선택</small></span>
        <input
          v-model="referenceUrl"
          type="url"
          placeholder="예: https://www.example.com"
          autocomplete="url"
        >
        <small>참고할 웹페이지의 톤앤매너와 디자인 맥락을 AI가 분석합니다.</small>
      </label>

      <fieldset class="layout-info-design-field">
        <legend>디자인값 <small>선택</small></legend>
        <p>입력한 색상만 AI 웹페이지 생성에 반영됩니다.</p>
        <div class="layout-info-color-grid">
          <label v-for="option in colorOptions" :key="option.key" class="layout-info-color-field">
            <span>{{ option.label }}</span>
            <div class="layout-info-color-control">
              <input
                class="layout-info-color-picker"
                :class="{ 'is-empty': !designColors[option.key].trim() }"
                type="color"
                :value="getColorPickerValue(designColors[option.key])"
                :aria-label="`${option.label} 선택`"
                @input="handleColorPickerInput($event, option.key)"
              >
              <input
                v-model="designColors[option.key]"
                type="text"
                :placeholder="option.placeholder"
                maxlength="40"
                autocomplete="off"
              >
              <button
                v-if="designColors[option.key].trim()"
                type="button"
                :aria-label="`${option.label} 초기화`"
                @click="designColors[option.key] = ''"
              >
                <TcubeIcon icon="ri-close-line" />
              </button>
            </div>
          </label>
        </div>
      </fieldset>

      <fieldset class="layout-info-viewport-field">
        <legend>화면 <em>필수</em></legend>
        <div class="layout-info-viewport-options">
          <button
            v-for="option in viewportOptions"
            :key="option.value"
            class="layout-info-viewport-option"
            :class="{ 'is-selected': viewport === option.value }"
            type="button"
            :aria-pressed="viewport === option.value"
            @click="viewport = option.value"
          >
            <TcubeIcon :icon="option.icon" />
            <span>
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </span>
          </button>
        </div>
      </fieldset>

      <div class="layout-info-attachment-field">
        <div class="layout-info-attachment-heading">
          <span>첨부자료 <small>선택</small></span>
          <p>디자인 참고용 기획안 PDF 파일</p>
        </div>

        <input
          ref="fileInputRef"
          class="layout-info-file-input"
          type="file"
          accept=".pdf,application/pdf"
          @change="handleFileInputChange"
        >

        <div
          class="layout-info-dropzone"
          :class="{ 'is-dragging': isDraggingFile, 'has-file': planningFile }"
          role="button"
          tabindex="0"
          @click="openFilePicker"
          @keydown.enter.prevent="openFilePicker"
          @keydown.space.prevent="openFilePicker"
          @dragenter.prevent="isDraggingFile = true"
          @dragover.prevent="isDraggingFile = true"
          @dragleave.prevent="isDraggingFile = false"
          @drop.prevent="handleFileDrop"
        >
          <TcubeIcon :icon="planningFile ? 'ri-file-pdf-2-line' : 'ri-upload-cloud-2-line'" />
          <span v-if="planningFile">
            <strong>{{ planningFile.name }}</strong>
            <small>{{ formatFileSize(planningFile.size) }} · 클릭하거나 드래그해 교체</small>
          </span>
          <span v-else>
            <strong>기획안 PDF 업로드</strong>
            <small>파일을 드래그하거나 클릭해서 선택</small>
          </span>
          <button
            v-if="planningFile"
            type="button"
            aria-label="첨부 파일 삭제"
            @click.stop="clearPlanningFile"
          >
            <TcubeIcon icon="ri-close-line" />
          </button>
        </div>
        <p v-if="fileError" class="layout-info-file-error">{{ fileError }}</p>
      </div>

        <footer class="layout-info-actions">
          <span><em>*</em> 표시 항목은 필수 입력입니다.</span>
          <button class="primary-action" type="submit" :disabled="!canProceed">
            <span>다음</span>
            <TcubeIcon icon="ri-arrow-right-line" />
          </button>
        </footer>
      </form>

      <aside class="layout-info-pdf-preview">
        <div class="layout-info-pdf-preview-heading">
          <span>기획안 미리보기</span>
          <small>PDF</small>
        </div>

        <iframe
          v-if="pdfPreviewUrl"
          :src="pdfPreviewUrl"
          title="업로드한 기획안 PDF 미리보기"
        />
        <div v-else class="layout-info-pdf-preview-empty">
          <TcubeIcon icon="ri-file-pdf-2-line" />
          <strong>미리볼 기획안이 없습니다</strong>
          <span>왼쪽 첨부자료 영역에서 PDF 파일을 업로드해주세요.</span>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import type {
  BuilderLayoutDesignBrief,
  BuilderLayoutDesignColors,
  BuilderLayoutViewport
} from '~/types/builder/layout-design'

const props = defineProps<{
  initialBrief: BuilderLayoutDesignBrief | null
}>()

const emit = defineEmits<{
  submit: [brief: BuilderLayoutDesignBrief]
}>()

const category = ref(props.initialBrief?.category ?? '')
const purpose = ref(props.initialBrief?.purpose ?? '')
const referenceUrl = ref(props.initialBrief?.referenceUrl ?? '')
const designColors = reactive<BuilderLayoutDesignColors>({
  main: props.initialBrief?.designColors?.main ?? '',
  sub: props.initialBrief?.designColors?.sub ?? '',
  background: props.initialBrief?.designColors?.background ?? '',
  accent: props.initialBrief?.designColors?.accent ?? ''
})
const viewport = ref<BuilderLayoutViewport | ''>(props.initialBrief?.viewport ?? '')
const planningFile = shallowRef<File | null>(props.initialBrief?.planningFile ?? null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const fileError = ref('')
const isDraggingFile = ref(false)
const pdfPreviewUrl = ref('')

const viewportOptions: Array<{
  value: BuilderLayoutViewport
  label: string
  description: string
  icon: string
}> = [
  { value: 'pc', label: 'PC', description: '데스크톱 화면 기준', icon: 'ri-computer-line' },
  { value: 'mobile', label: 'Mobile', description: '모바일 화면 기준', icon: 'ri-smartphone-line' },
  { value: 'responsive', label: '반응형', description: '화면 크기에 맞춰 대응', icon: 'ri-responsive-line' }
]

const colorOptions: Array<{
  key: keyof BuilderLayoutDesignColors
  label: string
  placeholder: string
}> = [
  { key: 'main', label: '메인 컬러', placeholder: '예: #675CFF' },
  { key: 'sub', label: '서브 컬러', placeholder: '예: #AEB7E8' },
  { key: 'background', label: '배경 컬러', placeholder: '예: #0D1020' },
  { key: 'accent', label: '강조 컬러', placeholder: '예: #FFB547' }
]

/** 필수 정보 입력 완료 여부 */
const canProceed = computed(() => (
  Boolean(category.value.trim())
  && Boolean(purpose.value.trim())
  && Boolean(viewport.value)
))

/**
 * 색상 선택기에 표시할 유효한 HEX 색상 반환
 *
 * @param value 현재 색상 입력값
 * @returns 유효한 6자리 HEX 또는 기본 색상
 */
function getColorPickerValue(value: string) {
  const normalizedValue = value.trim()

  return /^#[\da-f]{6}$/i.test(normalizedValue) ? normalizedValue : '#675cff'
}

/**
 * 네이티브 색상 선택값을 해당 디자인 색상 상태에 반영
 *
 * @param event 색상 input 이벤트
 * @param key 변경할 디자인 색상 항목
 */
function handleColorPickerInput(event: Event, key: keyof BuilderLayoutDesignColors) {
  designColors[key] = (event.target as HTMLInputElement).value.toUpperCase()
}

/** 로컬 PDF 파일 선택 창 열기 */
function openFilePicker() {
  fileInputRef.value?.click()
}

/**
 * 파일 input에서 선택된 PDF 반영
 *
 * @param event 파일 input change 이벤트
 */
function handleFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) setPlanningFile(file)
  input.value = ''
}

/**
 * 드롭한 PDF 파일 반영
 *
 * @param event 파일을 포함한 drop 이벤트
 */
function handleFileDrop(event: DragEvent) {
  isDraggingFile.value = false

  const file = event.dataTransfer?.files?.[0]

  if (file) setPlanningFile(file)
}

/**
 * 선택 파일의 PDF 형식 검증 및 상태 반영
 *
 * @param file 검증할 로컬 파일
 */
function setPlanningFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension !== 'pdf' && file.type.toLowerCase() !== 'application/pdf') {
    planningFile.value = null
    fileError.value = 'PDF 파일만 첨부할 수 있습니다.'
    return
  }

  planningFile.value = file
  fileError.value = ''
  createPdfPreviewUrl(file)
}

/** 선택한 기획안 파일 및 오류 초기화 */
function clearPlanningFile() {
  planningFile.value = null
  fileError.value = ''
  revokePdfPreviewUrl()
}

/**
 * 선택한 PDF 파일의 브라우저 미리보기 URL 생성
 *
 * @param file 미리보기로 표시할 PDF 파일
 */
function createPdfPreviewUrl(file: File) {
  revokePdfPreviewUrl()
  pdfPreviewUrl.value = URL.createObjectURL(file)
}

/** PDF 미리보기에 사용한 object URL 해제 */
function revokePdfPreviewUrl() {
  if (!pdfPreviewUrl.value) return

  URL.revokeObjectURL(pdfPreviewUrl.value)
  pdfPreviewUrl.value = ''
}

/** 필수 정보 정리 후 레이아웃 만들기 단계로 전달 */
function submitInformation() {
  if (!canProceed.value || !viewport.value) return

  emit('submit', {
    category: category.value.trim(),
    purpose: purpose.value.trim(),
    viewport: viewport.value,
    referenceUrl: referenceUrl.value.trim(),
    designColors: {
      main: designColors.main.trim(),
      sub: designColors.sub.trim(),
      background: designColors.background.trim(),
      accent: designColors.accent.trim()
    },
    planningFile: planningFile.value
  })
}

/**
 * 파일 크기를 화면 표시용 단위로 변환
 *
 * @param size 바이트 단위 파일 크기
 * @returns B, KB, MB 단위 파일 크기
 */
function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`

  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

/** 정보 수정 진입 시 기존 첨부 PDF 미리보기 복원 */
onMounted(() => {
  if (planningFile.value) createPdfPreviewUrl(planningFile.value)
})

/** 컴포넌트 해제 시 PDF 미리보기 URL 정리 */
onBeforeUnmount(() => {
  revokePdfPreviewUrl()
})
</script>

<style scoped>
.layout-info-screen {
  min-height: calc(100vh - 142px);
  display: grid;
  align-content: start;
  gap: 28px;
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.035));
  padding: 36px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
}

.layout-info-header h1 {
  margin: 6px 0 0;
  color: var(--text-strong);
  font-size: 31px;
  line-height: 1.2;
  font-weight: 900;
}

.layout-info-header p,
.layout-info-attachment-heading p {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
  font-weight: 700;
}

.layout-info-content {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 920px) minmax(280px, 1fr);
  align-items: start;
  gap: 24px;
}

.layout-info-form {
  min-width: 0;
  display: grid;
  gap: 26px;
}

.layout-info-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.layout-info-field {
  display: grid;
  align-content: start;
  gap: 9px;
}

.layout-info-field > span,
.layout-info-viewport-field legend,
.layout-info-design-field legend,
.layout-info-attachment-heading > span {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 900;
}

.layout-info-field > span small,
.layout-info-design-field legend small {
  margin-left: 4px;
  color: var(--text-secondary);
  font-size: 10px;
}

.layout-info-field-wide {
  grid-column: 1 / -1;
}

.layout-info-field em,
.layout-info-viewport-field em,
.layout-info-actions em {
  color: #9ca2ff;
  font-size: 11px;
  font-style: normal;
}

.layout-info-field input,
.layout-info-field textarea {
  width: 100%;
  border: 1px solid rgba(174, 183, 232, 0.14);
  border-radius: 10px;
  background: rgba(13, 16, 32, 0.72);
  color: var(--text-primary);
  padding: 12px 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  outline: none;
}

.layout-info-field input {
  height: 46px;
}

.layout-info-field textarea {
  min-height: 104px;
  resize: vertical;
}

.layout-info-field input:focus,
.layout-info-field textarea:focus {
  border-color: rgba(139, 145, 255, 0.68);
  box-shadow: 0 0 0 3px rgba(139, 145, 255, 0.1);
}

.layout-info-field > small {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.layout-info-design-field {
  min-width: 0;
  display: grid;
  gap: 10px;
  margin: 0;
  border: 0;
  padding: 0;
}

.layout-info-design-field > p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.layout-info-color-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.layout-info-color-field {
  min-width: 0;
  display: grid;
  gap: 8px;
}

.layout-info-color-field > span {
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 800;
}

.layout-info-color-control {
  min-width: 0;
  height: 46px;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid rgba(174, 183, 232, 0.14);
  border-radius: 10px;
  background: rgba(13, 16, 32, 0.72);
  padding: 6px 10px;
}

.layout-info-color-control:focus-within {
  border-color: rgba(139, 145, 255, 0.68);
  box-shadow: 0 0 0 3px rgba(139, 145, 255, 0.1);
}

.layout-info-color-control .layout-info-color-picker {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 7px;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.layout-info-color-control .layout-info-color-picker.is-empty {
  opacity: 0.36;
  filter: grayscale(1);
}

.layout-info-color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.layout-info-color-picker::-webkit-color-swatch {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 7px;
}

.layout-info-color-control input[type='text'] {
  min-width: 0;
  height: 100%;
  flex: 1 1 auto;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  padding: 0;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  outline: none;
}

.layout-info-color-control button {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 0;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  padding: 0;
  cursor: pointer;
}

.layout-info-viewport-field {
  min-width: 0;
  margin: 0;
  border: 0;
  padding: 0;
}

.layout-info-viewport-field legend {
  margin-bottom: 10px;
}

.layout-info-viewport-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.layout-info-viewport-option {
  min-width: 0;
  min-height: 82px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(174, 183, 232, 0.14);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.045);
  color: var(--text-primary);
  padding: 14px;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.layout-info-viewport-option:hover,
.layout-info-viewport-option.is-selected {
  border-color: rgba(139, 145, 255, 0.64);
  background: rgba(139, 145, 255, 0.14);
}

.layout-info-viewport-option.is-selected {
  box-shadow: inset 0 0 0 1px rgba(139, 145, 255, 0.22);
}

.layout-info-viewport-option > i {
  flex: 0 0 auto;
  color: var(--accent);
  font-size: 24px;
}

.layout-info-viewport-option > span {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.layout-info-viewport-option strong {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 900;
}

.layout-info-viewport-option small {
  overflow-wrap: anywhere;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.35;
  font-weight: 700;
}

.layout-info-attachment-field {
  display: grid;
  gap: 10px;
}

.layout-info-attachment-heading > span small {
  margin-left: 4px;
  color: var(--text-secondary);
  font-size: 10px;
}

.layout-info-file-input {
  display: none;
}

.layout-info-dropzone {
  min-height: 92px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px dashed rgba(174, 183, 232, 0.26);
  border-radius: 11px;
  background: rgba(13, 16, 32, 0.38);
  color: var(--text-primary);
  padding: 16px 18px;
  cursor: pointer;
}

.layout-info-dropzone:hover,
.layout-info-dropzone.is-dragging,
.layout-info-dropzone.has-file {
  border-color: rgba(139, 145, 255, 0.62);
  background: rgba(139, 145, 255, 0.09);
}

.layout-info-dropzone > i {
  flex: 0 0 auto;
  color: var(--accent);
  font-size: 28px;
}

.layout-info-dropzone > span {
  min-width: 0;
  display: grid;
  flex: 1 1 auto;
  gap: 5px;
}

.layout-info-dropzone strong,
.layout-info-dropzone small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-info-dropzone strong {
  color: var(--text-strong);
  font-size: 13px;
}

.layout-info-dropzone small {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.layout-info-dropzone button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  padding: 0;
  cursor: pointer;
}

.layout-info-file-error {
  margin: 0;
  color: #ff879b;
  font-size: 11px;
  font-weight: 800;
}

.layout-info-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid rgba(174, 183, 232, 0.1);
  padding-top: 20px;
}

.layout-info-actions > span {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.layout-info-pdf-preview {
  min-width: 0;
  display: grid;
  grid-template-rows: auto minmax(420px, calc(100vh - 330px));
  overflow: hidden;
  border: 1px solid rgba(174, 183, 232, 0.12);
  border-radius: 12px;
  background: rgba(13, 16, 32, 0.42);
}

.layout-info-pdf-preview-heading {
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(174, 183, 232, 0.1);
  padding: 0 15px;
}

.layout-info-pdf-preview-heading span {
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 900;
}

.layout-info-pdf-preview-heading small {
  border-radius: 999px;
  background: rgba(139, 145, 255, 0.12);
  color: var(--accent);
  padding: 4px 7px;
  font-size: 9px;
  font-weight: 900;
}

.layout-info-pdf-preview iframe {
  width: 100%;
  height: 100%;
  border: 0;
  background: #ffffff;
}

.layout-info-pdf-preview-empty {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 9px;
  color: var(--text-secondary);
  padding: 28px;
  text-align: center;
}

.layout-info-pdf-preview-empty i {
  color: var(--accent);
  font-size: 38px;
}

.layout-info-pdf-preview-empty strong {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 900;
}

.layout-info-pdf-preview-empty span {
  max-width: 240px;
  font-size: 11px;
  line-height: 1.5;
  font-weight: 700;
}

@media (max-width: 1180px) {
  .layout-info-content {
    grid-template-columns: 1fr;
  }

  .layout-info-pdf-preview {
    grid-template-rows: auto 480px;
  }
}

@media (max-width: 760px) {
  .layout-info-screen {
    padding: 24px 18px;
  }

  .layout-info-field-grid,
  .layout-info-color-grid,
  .layout-info-viewport-options {
    grid-template-columns: 1fr;
  }

  .layout-info-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .layout-info-actions .primary-action {
    justify-content: center;
  }

  .layout-info-pdf-preview {
    grid-template-rows: auto 380px;
  }
}
</style>
