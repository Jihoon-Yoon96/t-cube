/**
 * 레이아웃 빌더 블록 데이터를 HTML 문서 문자열로 변환하는 서비스
 * Pinia 상태 변경 없이 순수 변환 로직만 관리
 */
import type { BuilderLayoutBlock } from '~/stores/builder/type/types'

/**
 * 레이아웃 블록 목록을 HTML 문서 문자열로 변환
 * 캔버스 좌표, 크기, 배경색, 레이어 순서를 inline style로 보존
 *
 * @param blocks HTML로 변환할 레이아웃 블록 목록
 * @returns 완성된 HTML 문서 문자열
 */
export function createLayoutDesignHtml(blocks: BuilderLayoutBlock[]) {
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

      .wire-text {
        position: absolute;
        display: flex;
        align-items: center;
        border: 0;
        background: transparent !important;
        padding: 0;
        font-size: 22px;
        line-height: 1.4;
        font-weight: 800;
      }

      @media (max-width: 760px) {
        .page {
          min-height: auto;
          display: grid;
          gap: 14px;
          padding: 18px;
        }

        .wire-block,
        .wire-button,
        .wire-text {
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

/**
 * 단일 레이아웃 블록을 HTML 조각으로 변환
 * 블록 타입별 태그/클래스 선택 및 캔버스 시각 속성 보존
 *
 * @param block HTML 조각으로 변환할 레이아웃 블록
 * @returns 블록 하나에 해당하는 HTML 문자열
 */
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

  if (block.type === 'text') {
    return `      <p class="wire-text" style="${style}">${label}</p>`
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

/**
 * HTML에 삽입되는 사용자 입력값 escape 처리
 * 라벨, 설명, 색상값이 마크업을 깨뜨리지 않도록 보호
 *
 * @param value escape 처리할 원본 문자열
 * @returns HTML 엔티티로 변환된 문자열
 */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 배경색 밝기에 따른 텍스트 색상 계산
 * 검은색과 흰색 중 하나만 선택해 대비를 단순하고 예측 가능하게 유지
 *
 * @param backgroundColor 대비를 계산할 CSS hex 색상값
 * @returns 어두운 배경이면 흰색, 밝은 배경이면 검은색
 */
function getReadableTextColor(backgroundColor: string) {
  const rgb = parseHexColor(backgroundColor)

  if (!rgb) return '#111827'

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255

  return luminance > 0.58 ? '#111827' : '#ffffff'
}

/**
 * 3자리 또는 6자리 hex 색상 문자열을 RGB 값으로 변환
 * hex 형식이 아니면 null을 반환해 기본 텍스트 색상으로 fallback
 *
 * @param value 변환할 hex 색상 문자열
 * @returns 변환된 RGB 값, 변환할 수 없으면 null
 */
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
