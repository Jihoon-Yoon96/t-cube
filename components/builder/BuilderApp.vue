<template>
  <section v-if="builderStore.step === 'start'" class="creation-start">
      <div class="creation-intro">
        <h1>템플릿 생성 방식을 선택해주세요</h1>
        <p>준비된 시안 파일이 있다면 업로드하고, 아직 시안이 없다면 직접 작성하거나 AI의 도움을 받아 만들어보세요.</p>
      </div>

      <div class="creation-options">
        <button class="creation-card" type="button" @click="builderStore.setStep('pdf-image-upload')">
          <TcubeIcon icon="ri-upload-cloud-2-line" />
          <strong>디자인 시안 파일 업로드</strong>
          <span>HTML, PDF, 이미지 파일을 기반으로<br>템플릿을 생성합니다.</span>
        </button>

        <button class="creation-card" type="button" @click="builderStore.setStep('ai-design')">
          <TcubeIcon icon="ri-edit-box-line" />
          <strong>디자인 시안 작성</strong>
          <span>레이아웃, 기획안 또는 AI 프롬프트를 통해<br>새로운 시안을 작성합니다.</span>
        </button>
      </div>
  </section>

  <section v-else-if="builderStore.step === 'pdf-image-upload'" class="creation-start">
      <div class="creation-intro">
        <h1>디자인 시안 파일 유형을 선택해주세요</h1>
        <p>HTML, 이미지, PDF 파일을 업로드하면 시안의 구조와 디자인 요소를 분석해 템플릿 생성을 시작합니다.</p>
      </div>

      <div class="upload-options">
        <button
          v-for="option in uploadOptions"
          :key="option.label"
          class="creation-card upload-card"
          type="button"
          @click="builderStore.selectUploadFileType(option.fileType)"
        >
          <TcubeIcon :icon="option.icon" />
          <strong>{{ option.label }}</strong>
        </button>
      </div>
  </section>

  <section v-else-if="builderStore.step === 'file-upload'" class="creation-start file-upload-screen">
      <div class="creation-intro">
        <h1>{{ builderStore.selectedUploadFileType }} 파일을 업로드 해주세요</h1>
      </div>

      <div class="dropzone-wrap">
        <label class="file-dropzone">
          <input
            class="file-input"
            type="file"
            :accept="selectedUploadAccept"
          >
          <TcubeIcon icon="ri-upload-2-line" />
          <span>
            {{ builderStore.selectedUploadFileType }} 파일을 드래그하거나
            <strong>파일 선택</strong>
          </span>
          <small>{{ selectedUploadExtension }} 파일만 업로드 가능합니다</small>
        </label>
      </div>
  </section>

  <section v-else-if="builderStore.step === 'ai-design'" class="creation-start">
      <div class="creation-intro">
        <h1>시안 작성 방식을 선택해주세요</h1>
        <p>템플릿 생성에 사용할 디자인 시안을 직접 만들거나 AI로 생성해주세요.</p>
      </div>

      <div class="creation-options">
        <button
          v-for="option in designOptions"
          :key="option.label"
          class="creation-card"
          type="button"
          @click="builderStore.selectDesignMethod(option.method)"
        >
          <TcubeIcon :icon="option.icon" />
          <strong>{{ option.label }}</strong>
          <span>{{ option.description }}</span>
        </button>
      </div>
  </section>

  <section v-else-if="builderStore.step === 'editor'" class="template-list-screen">
      <div class="template-list-header">
        <span class="section-title">SAVED TEMPLATES</span>
        <h1>수정할 템플릿을 선택해주세요</h1>
      </div>

      <div class="template-grid">
        <article
          v-for="template in savedTemplates"
          :key="template.id"
          class="template-card"
        >
          <div class="template-preview">
            <span :class="['template-badge', template.badgeClass]">{{ template.badge }}</span>
            <TcubeIcon :icon="template.icon" />
          </div>

          <div class="template-info">
            <strong>{{ template.name }}</strong>
            <span>{{ template.description }}</span>
          </div>

          <div class="template-meta">
            <span>{{ template.size }}</span>
            <span>{{ template.updatedAt }}</span>
          </div>

          <button class="template-action" type="button">
            <TcubeIcon icon="ri-edit-line" />
            <span>수정하기</span>
          </button>
        </article>
      </div>
  </section>

  <div v-else class="body-placeholder">
      <span class="section-title">WORKSPACE</span>
      <h1>{{ stageTitle }}</h1>
      <p>{{ stageSubtitle }}</p>
  </div>
</template>

<script setup lang="ts">
import { useBuilderStore } from '~/stores/builder'

const builderStore = useBuilderStore()

const pages = [
  { id: 'page-home', name: 'Main canvas', width: 960, height: 540 }
]

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

const designOptions = [
  {
    label: '레이아웃 작성',
    description: '화면 구조와 콘텐츠 배치를 직접 입력합니다.',
    method: 'layout',
    icon: 'ri-layout-2-line'
  },
  {
    label: 'AI 프롬프트 작성',
    description: '프롬프트를 입력해 디자인 시안 초안을 생성합니다.',
    method: 'ai-prompt',
    icon: 'ri-sparkling-2-line'
  }
] as const

const savedTemplates = [
  {
    id: 'template-summer-sale',
    name: '여름 프로모션 배너',
    description: '메인 랜딩 상단에 사용하는 시즌 프로모션 템플릿',
    size: 'PC / Mobile',
    updatedAt: '2026.07.01',
    badge: 'Banner',
    badgeClass: 'purple',
    icon: 'ri-layout-top-line'
  },
  {
    id: 'template-event-bridge',
    name: '이벤트 브릿지 페이지',
    description: '캠페인 안내와 CTA 영역이 포함된 브릿지 페이지',
    size: 'PC',
    updatedAt: '2026.06.28',
    badge: 'Page',
    badgeClass: 'green',
    icon: 'ri-pages-line'
  },
  {
    id: 'template-product-card',
    name: '상품 소개 카드',
    description: '상품 이미지와 핵심 문구를 강조하는 카드형 템플릿',
    size: 'Tablet / Mobile',
    updatedAt: '2026.06.20',
    badge: 'Card',
    badgeClass: 'orange',
    icon: 'ri-bank-card-line'
  },
  {
    id: 'template-newsletter',
    name: '뉴스레터 파셜 HTML',
    description: 'CMS 본문에 삽입 가능한 뉴스레터 섹션 템플릿',
    size: 'Responsive',
    updatedAt: '2026.06.14',
    badge: 'HTML',
    badgeClass: 'blue',
    icon: 'ri-html5-line'
  }
]

const activePageId = ref(pages[0].id)

const activePage = computed(() => pages.find((page) => page.id === activePageId.value))
const selectedUploadAccept = computed(() => {
  if (builderStore.selectedUploadFileType === 'HTML') return '.html,.htm,text/html'
  if (builderStore.selectedUploadFileType === '이미지') return 'image/*'

  return '.pdf,application/pdf'
})
const selectedUploadExtension = computed(() => {
  if (builderStore.selectedUploadFileType === 'HTML') return '.html'
  if (builderStore.selectedUploadFileType === '이미지') return '이미지'

  return '.pdf'
})
const stageTitle = computed(() => {
  if (builderStore.step === 'editor') return '템플릿 수정'
  if (builderStore.step === 'preview') return '미리보기'

  return '템플릿 생성'
})

const stageSubtitle = computed(() => {
  if (builderStore.step === 'editor' && activePage.value) {
    return `${activePage.value.width} x ${activePage.value.height}`
  }

  return '바디 영역은 다음 단계에서 정리합니다.'
})
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.creation-start {
  min-height: calc(100vh - 142px);
  display: grid;
  grid-template-rows: auto auto 1fr;
  align-content: start;
  gap: 32px;
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.035));
  padding: 38px 28px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
}

.creation-intro {
  max-width: 760px;
  justify-self: center;
  text-align: center;
}

.creation-intro h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 31px;
  line-height: 1.2;
  font-weight: 900;
}

.creation-intro p {
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.55;
  font-weight: 600;
}

.creation-options {
  justify-self: center;
  margin-top: 40px;
  width: min(1080px, 100%);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
}

.upload-options {
  justify-self: center;
  margin-top: 40px;
  width: min(1180px, 100%);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.creation-card {
  min-height: 300px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 16px;
  border: 1px solid rgba(174, 183, 232, 0.12);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.04));
  color: var(--text-primary);
  padding: 44px;
  font: inherit;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);
}

.creation-card:hover {
  border-color: rgba(139, 145, 255, 0.42);
  background: linear-gradient(180deg, rgba(139, 145, 255, 0.18), rgba(139, 145, 255, 0.08));
}

.creation-card i {
  width: 86px;
  height: 86px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(139, 145, 255, 0.16);
  color: var(--accent);
  font-size: 44px;
}

.creation-card strong {
  color: var(--text-strong);
  font-size: 21px;
  line-height: 1.35;
  font-weight: 900;
}

.creation-card span {
  max-width: 360px;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.45;
  font-weight: 700;
}

.upload-card {
  min-height: 280px;
}

.file-upload-screen {
  gap: 32px;
}

.dropzone-wrap {
  justify-self: center;
  margin-top: 36px;
  width: min(1120px, 100%);
}

.file-dropzone {
  min-height: 460px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 18px;
  border: 2px dashed var(--accent-3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-secondary);
  padding: 96px 24px;
  cursor: pointer;
}

.file-dropzone:hover {
  background: rgba(139, 145, 255, 0.07);
  border-color: var(--accent);
}

.file-dropzone > i {
  color: var(--text-muted);
  font-size: 66px;
}

.file-dropzone span {
  color: var(--text-secondary);
  font-size: 21px;
  line-height: 1.4;
  font-weight: 600;
}

.file-dropzone span strong {
  color: var(--accent-3);
  font-weight: 900;
}

.file-dropzone small {
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1.4;
  font-weight: 600;
}

.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.template-list-screen {
  min-height: calc(100vh - 142px);
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.035));
  padding: 28px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
}

.template-list-header {
  margin-bottom: 24px;
}

.template-list-header h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 31px;
  line-height: 1.2;
  font-weight: 900;
}

.template-list-header p {
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.55;
  font-weight: 600;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.template-card {
  min-height: 294px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.035));
  overflow: hidden;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.16);
}

.template-card:hover {
  border-color: rgba(139, 145, 255, 0.34);
}

.template-preview {
  position: relative;
  height: 132px;
  display: grid;
  place-items: center;
  background:
    linear-gradient(135deg, rgba(139, 145, 255, 0.16), rgba(255, 255, 255, 0.025)),
    var(--surface-soft);
}

.template-preview i {
  color: var(--accent);
  font-size: 42px;
}

.template-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  height: 24px;
  border-radius: 999px;
  padding: 0 10px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
}

.template-badge.purple {
  background: rgba(139, 145, 255, 0.72);
}

.template-badge.green {
  background: rgba(59, 210, 131, 0.72);
}

.template-badge.orange {
  background: rgba(255, 184, 107, 0.78);
}

.template-badge.blue {
  background: rgba(93, 170, 255, 0.72);
}

.template-info {
  display: grid;
  gap: 8px;
  padding: 16px 16px 10px;
}

.template-info strong {
  color: var(--text-strong);
  font-size: 15px;
  line-height: 1.35;
  font-weight: 900;
}

.template-info span {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
  font-weight: 600;
}

.template-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding: 0 16px 14px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
}

.template-action {
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-top: 1px solid rgba(174, 183, 232, 0.1);
  background: rgba(139, 145, 255, 0.1);
  color: var(--text-primary);
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.template-action:hover {
  background: rgba(139, 145, 255, 0.18);
  color: #ffffff;
}

.body-placeholder {
  min-height: calc(100vh - 142px);
  border: 1px solid rgba(174, 183, 232, 0.1);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.035));
  padding: 28px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
}

.section-title {
  display: block;
  margin-bottom: 14px;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.8px;
}

.body-placeholder h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 31px;
  line-height: 1;
  font-weight: 900;
}

.body-placeholder p {
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .creation-options {
    width: min(860px, 100%);
    gap: 20px;
  }

  .upload-options {
    width: min(860px, 100%);
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .creation-card {
    min-height: 230px;
    padding: 34px;
  }

  .creation-card i {
    width: 72px;
    height: 72px;
    font-size: 36px;
  }

  .creation-card strong {
    font-size: 18px;
  }

  .creation-card span {
    max-width: 280px;
    font-size: 13px;
  }

  .dropzone-wrap {
    width: min(860px, 100%);
  }

  .template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .creation-start {
    min-height: 420px;
    padding: 28px 18px;
    gap: 24px;
  }

  .creation-intro h1 {
    font-size: 28px;
  }

  .creation-options {
    grid-template-columns: 1fr;
  }

  .upload-options {
    grid-template-columns: 1fr;
  }

  .creation-card {
    min-height: 170px;
    padding: 24px;
  }

  .creation-card i {
    width: 58px;
    height: 58px;
    font-size: 28px;
  }

  .file-upload-screen {
    gap: 24px;
  }

  .file-dropzone {
    min-height: 320px;
    padding: 60px 18px;
  }

  .file-dropzone > i {
    font-size: 48px;
  }

  .file-dropzone span {
    font-size: 17px;
  }

  .file-dropzone small {
    font-size: 13px;
  }

  .template-list-screen {
    min-height: 420px;
    padding: 22px;
  }

  .template-list-header h1 {
    font-size: 28px;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }

  .body-placeholder {
    min-height: 420px;
  }
}
</style>

