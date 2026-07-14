import type { BuilderLayoutViewport } from '~/types/builder/layout-design'
import type { BuilderViewportMode } from '~/stores/builder'

type DesignRenderViewport = BuilderLayoutViewport | BuilderViewportMode

type RenderedDesign = {
  dataUrl: string
  width: number
  height: number
}

/**
 * 생성 HTML을 PNG 파일로 렌더링 후 다운로드
 *
 * @param html AI가 생성한 전체 HTML 문서
 * @param fileName 다운로드 파일 기본 이름
 * @param viewport 생성 기준 화면 유형
 * @returns 다운로드 완료 Promise
 */
export async function downloadGeneratedDesignImage(
  html: string,
  fileName: string,
  viewport: DesignRenderViewport
) {
  const rendered = await renderHtmlToPng(html, viewport)

  downloadDataUrl(rendered.dataUrl, `${createSafeFileName(fileName)}.png`)
}

/**
 * 생성 HTML을 PDF 파일로 렌더링 후 다운로드
 * 긴 문서는 동일 이미지를 페이지별 위치로 이동해 분할
 *
 * @param html AI가 생성한 전체 HTML 문서
 * @param fileName 다운로드 파일 기본 이름
 * @param viewport 생성 기준 화면 유형
 * @returns 다운로드 완료 Promise
 */
export async function downloadGeneratedDesignPdf(
  html: string,
  fileName: string,
  viewport: DesignRenderViewport
) {
  const rendered = await renderHtmlToPng(html, viewport)
  const { jsPDF } = await import('jspdf')
  const pageWidth = 794
  const pageHeight = 1123
  const renderedHeight = rendered.height * (pageWidth / rendered.width)
  const pageCount = Math.max(1, Math.ceil(renderedHeight / pageHeight))
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [pageWidth, pageHeight],
    hotfixes: ['px_scaling']
  })

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) pdf.addPage([pageWidth, pageHeight], 'portrait')

    pdf.addImage(
      rendered.dataUrl,
      'PNG',
      0,
      -(pageIndex * pageHeight),
      pageWidth,
      renderedHeight,
      undefined,
      'FAST'
    )
  }

  pdf.save(`${createSafeFileName(fileName)}.pdf`)
}

/**
 * 격리 iframe에서 HTML을 렌더링해 PNG 데이터 URL 생성
 *
 * @param html 렌더링할 전체 HTML 문서
 * @param viewport 생성 기준 화면 유형
 * @returns PNG 데이터 URL과 실제 렌더링 크기
 */
async function renderHtmlToPng(html: string, viewport: DesignRenderViewport): Promise<RenderedDesign> {
  const iframe = document.createElement('iframe')
  const viewportWidth = viewport === 'mobile'
    ? 390
    : viewport === 'tablet'
      ? 768
      : ['pc', 'desktop'].includes(viewport)
        ? 1440
        : 1200

  iframe.style.position = 'fixed'
  iframe.style.left = '-100000px'
  iframe.style.top = '0'
  iframe.style.width = `${viewportWidth}px`
  iframe.style.height = '900px'
  iframe.style.border = '0'
  iframe.style.pointerEvents = 'none'
  iframe.setAttribute('aria-hidden', 'true')
  document.body.appendChild(iframe)

  try {
    await loadIframeHtml(iframe, html)

    const iframeDocument = iframe.contentDocument
    const renderTarget = iframeDocument?.documentElement

    if (!iframeDocument || !renderTarget) {
      throw new Error('생성 결과를 렌더링할 수 없습니다.')
    }

    await waitForDocumentAssets(iframeDocument)

    const width = Math.max(viewportWidth, renderTarget.scrollWidth, iframeDocument.body.scrollWidth)
    const height = Math.max(1, renderTarget.scrollHeight, iframeDocument.body.scrollHeight)
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(renderTarget, {
      cacheBust: true,
      pixelRatio: 1,
      width,
      height,
      canvasWidth: width,
      canvasHeight: height
    })

    return { dataUrl, width, height }
  } finally {
    iframe.remove()
  }
}

/**
 * iframe srcdoc 로드 완료 대기
 *
 * @param iframe 렌더링용 iframe
 * @param html 주입할 전체 HTML 문서
 * @returns load 이벤트 완료 Promise
 */
function loadIframeHtml(iframe: HTMLIFrameElement, html: string) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error('생성 결과 렌더링 시간이 초과되었습니다.')), 10_000)

    iframe.addEventListener('load', () => {
      window.clearTimeout(timeoutId)
      resolve()
    }, { once: true })
    iframe.srcdoc = html
  })
}

/**
 * iframe 내부 폰트와 이미지 로드 완료 대기
 *
 * @param iframeDocument 생성 HTML document
 * @returns asset 로드 완료 Promise
 */
async function waitForDocumentAssets(iframeDocument: Document) {
  await iframeDocument.fonts?.ready

  const pendingImages = Array.from(iframeDocument.images)
    .filter((image) => !image.complete)
    .map((image) => new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    }))

  await Promise.all(pendingImages)
}

/**
 * 데이터 URL 브라우저 다운로드 실행
 *
 * @param dataUrl 다운로드할 데이터 URL
 * @param fileName 저장 파일명
 */
function downloadDataUrl(dataUrl: string, fileName: string) {
  const anchor = document.createElement('a')

  anchor.href = dataUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

/**
 * 사용자 입력 제목을 안전한 다운로드 파일명으로 변환
 *
 * @param value 원본 파일명
 * @returns 특수문자를 제거한 파일명
 */
function createSafeFileName(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'generated-design'
}
