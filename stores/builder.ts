/**
 * 빌더 전체 Pinia store를 조립하는 진입점입니다.
 * 각 도메인별 상태 모듈을 합쳐 외부 컴포넌트에는 단일 store API를 제공합니다.
 */
import { useBuilderDesignState } from './builder/design'
import { useBuilderEditorState } from './builder/editor'
import { useBuilderStepState } from './builder/step'
import { useBuilderUploadState } from './builder/upload'
import { parseHtmlDocument, parseHtmlFile } from '~/services/html/parseHtmlDocument'
import type { BuilderDesignMethod, BuilderLayoutBlock, BuilderStep, BuilderUploadFileType } from './builder/type/types'
import type { DesignToHtmlResponse } from '~/types/builder/design-to-html'

export type {
  BuilderDesignMethod,
  BuilderLayoutBlock,
  BuilderLayoutBlockType,
  BuilderStep,
  BuilderUploadedFileSummary,
  BuilderUploadFileType,
  BuilderViewportMode
} from './builder/type/types'
export type {
  ParsedHtmlDocument,
  ParsedHtmlEditableElement,
  ParsedHtmlElementType
} from '~/services/html/parseHtmlDocument'

export const useBuilderStore = defineStore('builder', () => {
  const stepState = useBuilderStepState()
  const uploadState = useBuilderUploadState(stepState.step)
  const designState = useBuilderDesignState(stepState.step)
  const editorState = useBuilderEditorState()
  const designHtmlGenerationAbortController = shallowRef<AbortController | null>(null)

  async function startFileAnalysis() {
    if (!uploadState.startFileAnalysis()) return

    if (!uploadState.uploadedFile.value) return

    if (uploadState.selectedUploadFileType.value === '이미지') {
      uploadState.completeFileAnalysis()
      stepState.setStep('image-preview')
      return
    }

    if (uploadState.selectedUploadFileType.value === 'PDF') {
      uploadState.completeFileAnalysis()
      stepState.setStep('pdf-preview')
      return
    }

    if (uploadState.selectedUploadFileType.value !== 'HTML') {
      uploadState.failFileAnalysis('현재 편집 기능은 HTML 파일부터 지원합니다. 이미지/PDF 분석은 다음 단계에서 연결할 예정입니다.')
      return
    }

    try {
      const parsedDocument = await parseHtmlFile(uploadState.uploadedFile.value)

      editorState.setCurrentDocument(parsedDocument)
      editorState.markDirty(false)
      uploadState.completeFileAnalysis()
      stepState.setStep('html-editor')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'HTML 파일을 분석하는 중 문제가 발생했습니다.'

      uploadState.failFileAnalysis(message)
    }
  }

  async function generateHtmlFromUploadedImage() {
    if (!uploadState.uploadedFile.value) {
      uploadState.failFileAnalysis('HTML을 생성하려면 먼저 이미지 파일을 업로드해주세요.')
      return
    }

    cancelDesignHtmlGeneration()
    uploadState.startFileAnalysis()

    const abortController = new AbortController()
    designHtmlGenerationAbortController.value = abortController

    try {
      const formData = new FormData()
      formData.append('image', uploadState.uploadedFile.value)

      const response = await $fetch<DesignToHtmlResponse>('/api/builder/image-to-html', {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      })

      completeDesignHtmlGeneration(response)
    } catch (error) {
      if (isAbortError(error)) {
        uploadState.cancelFileAnalysis()
        return
      }

      const message = error instanceof Error
        ? error.message
        : '이미지 기반 HTML을 생성하는 중 문제가 발생했습니다.'

      uploadState.failFileAnalysis(message)
    } finally {
      if (designHtmlGenerationAbortController.value === abortController) {
        designHtmlGenerationAbortController.value = null
      }
    }
  }

  async function generateHtmlFromUploadedPdf() {
    if (!uploadState.uploadedFile.value) {
      uploadState.failFileAnalysis('HTML을 생성하려면 먼저 PDF 파일을 업로드해주세요.')
      return
    }

    cancelDesignHtmlGeneration()
    uploadState.startFileAnalysis()

    const abortController = new AbortController()
    designHtmlGenerationAbortController.value = abortController

    try {
      const formData = new FormData()
      formData.append('pdf', uploadState.uploadedFile.value)

      const response = await $fetch<DesignToHtmlResponse>('/api/builder/pdf-to-html', {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      })

      completeDesignHtmlGeneration(response)
    } catch (error) {
      if (isAbortError(error)) {
        uploadState.cancelFileAnalysis()
        return
      }

      const message = error instanceof Error
        ? error.message
        : 'PDF 기반 HTML을 생성하는 중 문제가 발생했습니다.'

      uploadState.failFileAnalysis(message)
    } finally {
      if (designHtmlGenerationAbortController.value === abortController) {
        designHtmlGenerationAbortController.value = null
      }
    }
  }

  function completeDesignHtmlGeneration(response: DesignToHtmlResponse) {
    const parsedDocument = parseHtmlDocument(response.html, {
      sourceName: response.title || `${uploadState.uploadedFile.value?.name || 'generated'}.html`
    })

    editorState.setCurrentDocument(parsedDocument)
    editorState.markDirty(false)
    uploadState.completeFileAnalysis()
    stepState.setStep('html-editor')
  }

  function generateHtmlFromLayoutDesign() {
    if (!designState.layoutBlocks.value.length) {
      uploadState.failFileAnalysis('HTML을 생성하려면 먼저 캔버스에 레이아웃 블록을 추가해주세요.')
      return
    }

    const html = createLayoutDesignHtml(designState.layoutBlocks.value)
    const parsedDocument = parseHtmlDocument(html, {
      sourceName: 'layout-design.html'
    })

    editorState.setCurrentDocument(parsedDocument)
    editorState.markDirty(false)
    uploadState.completeFileAnalysis()
    stepState.setStep('html-editor')
  }

  function cancelDesignHtmlGeneration() {
    if (!designHtmlGenerationAbortController.value) return

    designHtmlGenerationAbortController.value.abort()
    designHtmlGenerationAbortController.value = null
    uploadState.cancelFileAnalysis()
  }

  function cancelImageHtmlGeneration() {
    cancelDesignHtmlGeneration()
  }

  function cancelPdfHtmlGeneration() {
    cancelDesignHtmlGeneration()
  }

  function setStep(nextStep: BuilderStep) {
    if (nextStep === stepState.step.value) return true
    if (!confirmImageHtmlGenerationLeave()) return false

    stepState.setStep(nextStep)
    return true
  }

  function selectUploadFileType(fileType: BuilderUploadFileType) {
    if (!confirmImageHtmlGenerationLeave()) return false

    uploadState.selectUploadFileType(fileType)
    return true
  }

  function selectDesignMethod(method: BuilderDesignMethod) {
    if (!confirmImageHtmlGenerationLeave()) return false

    designState.selectDesignMethod(method)
    return true
  }

  function confirmImageHtmlGenerationLeave() {
    if (uploadState.importStatus.value !== 'importing') return true
    if (import.meta.server) return true

    const confirmed = window.confirm('AI가 HTML을 생성 중입니다. 정말 나가시겠습니까?')

    if (confirmed) {
      cancelDesignHtmlGeneration()
    }

    return confirmed
  }

  function isAbortError(error: unknown) {
    if (!error || typeof error !== 'object') return false

    const name = (error as { name?: unknown }).name
    const message = (error as { message?: unknown }).message

    return name === 'AbortError' || message === 'This operation was aborted'
  }

  return {
    ...stepState,
    ...uploadState,
    ...designState,
    ...editorState,
    setStep,
    selectUploadFileType,
    selectDesignMethod,
    startFileAnalysis,
    generateHtmlFromUploadedImage,
    generateHtmlFromUploadedPdf,
    generateHtmlFromLayoutDesign,
    cancelImageHtmlGeneration,
    cancelPdfHtmlGeneration
  }
})

function createLayoutDesignHtml(blocks: BuilderLayoutBlock[]) {
  const sortedBlocks = [...blocks].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
  const canvasWidth = 960
  const canvasHeight = Math.max(720, ...sortedBlocks.map((block) => block.y + block.height + 80))
  const blockMarkup = sortedBlocks.map((block) => createLayoutBlockMarkup(block)).join('\n')

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>레이아웃 작성 기반 HTML 초안</title>
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #eef1f8;
        color: #151827;
        font-family: Arial, "Noto Sans KR", sans-serif;
      }

      .page {
        width: min(${canvasWidth}px, 100%);
        min-height: ${canvasHeight}px;
        position: relative;
        margin: 0 auto;
        background: #ffffff;
        overflow: hidden;
      }

      .wire-block {
        position: absolute;
        display: grid;
        align-content: center;
        gap: 8px;
        border: 1px solid #d9deec;
        border-radius: 14px;
        background: #f8f9fd;
        padding: 20px;
      }

      .wire-shape {
        position: absolute;
        display: grid;
        place-items: center;
        border: 1px solid #d9deec;
        padding: 16px;
        text-align: center;
      }

      .wire-block h1,
      .wire-block h2,
      .wire-block p,
      .wire-shape h2,
      .wire-shape p {
        margin: 0;
      }

      .wire-block h1,
      .wire-shape h1 {
        font-size: 34px;
        line-height: 1.18;
      }

      .wire-block h2,
      .wire-shape h2 {
        font-size: 22px;
        line-height: 1.25;
      }

      .wire-block p,
      .wire-shape p {
        color: currentColor;
        font-size: 15px;
        line-height: 1.6;
        opacity: 0.78;
      }

      .wire-image {
        place-items: center;
        background: linear-gradient(135deg, #eef0ff, #f8f9fd);
        color: #626cff;
        text-align: center;
      }

      .wire-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 12px;
        background: #6168ff;
        color: #ffffff;
        font-size: 16px;
        font-weight: 800;
        text-decoration: none;
      }

      .wire-circle {
        border-radius: 999px;
      }

      .wire-triangle {
        clip-path: polygon(50% 0, 100% 100%, 0 100%);
      }

      .wire-line {
        border: 0;
        border-radius: 999px;
        padding: 0;
      }

      .wire-line > * {
        display: none;
      }

      .wire-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #ffffff;
      }

      @media (max-width: 760px) {
        .page {
          min-height: auto;
          display: grid;
          gap: 14px;
          padding: 18px;
        }

        .wire-block,
        .wire-button {
          position: static;
          width: 100% !important;
          min-height: 92px;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
${blockMarkup}
    </main>
  </body>
</html>`
}

function createLayoutBlockMarkup(block: BuilderLayoutBlock) {
  const backgroundColor = escapeHtml(block.backgroundColor)
  const textColor = getReadableTextColor(block.backgroundColor)
  const style = `left: ${block.x}px; top: ${block.y}px; z-index: ${block.zIndex || 1}; width: ${block.width}px; height: ${block.height}px; background: ${backgroundColor}; color: ${textColor};`
  const label = escapeHtml(block.label)
  const description = escapeHtml(block.description)

  if (block.type === 'rectangle') {
    return `      <section class="wire-shape" style="${style}">
        <h2>${label}</h2>
        <p>${description}</p>
      </section>`
  }

  if (block.type === 'circle') {
    return `      <section class="wire-shape wire-circle" style="${style}">
        <h2>${label}</h2>
        <p>${description}</p>
      </section>`
  }

  if (block.type === 'triangle') {
    return `      <section class="wire-shape wire-triangle" style="${style}">
        <h2>${label}</h2>
        <p>${description}</p>
      </section>`
  }

  if (block.type === 'line') {
    return `      <div class="wire-shape wire-line" style="${style}"></div>`
  }

  if (block.type === 'button') {
    return `      <a class="wire-button" href="#" style="${style}">${label}</a>`
  }

  if (block.type === 'image') {
    return `      <div class="wire-block wire-image" style="${style}">
        <h2>${label}</h2>
        <p>${description}</p>
      </div>`
  }

  if (block.type === 'header') {
    return `      <header class="wire-block wire-header" style="${style}">
        <h2>${label}</h2>
        <p>${description}</p>
      </header>`
  }

  if (block.type === 'banner') {
    return `      <section class="wire-block wire-banner" style="${style}">
        <h1>${label}</h1>
        <p>${description}</p>
      </section>`
  }

  return `      <section class="wire-block" style="${style}">
        <h2>${label}</h2>
        <p>${description}</p>
      </section>`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getReadableTextColor(backgroundColor: string) {
  const rgb = parseHexColor(backgroundColor)

  if (!rgb) return '#111827'

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255

  return luminance > 0.58 ? '#111827' : '#ffffff'
}

function parseHexColor(value: string) {
  const hex = value.trim().replace('#', '')
  const normalizedHex = hex.length === 3
    ? hex.split('').map((char) => `${char}${char}`).join('')
    : hex

  if (!/^[\da-f]{6}$/i.test(normalizedHex)) return null

  return {
    r: Number.parseInt(normalizedHex.slice(0, 2), 16),
    g: Number.parseInt(normalizedHex.slice(2, 4), 16),
    b: Number.parseInt(normalizedHex.slice(4, 6), 16)
  }
}
