export type ParsedHtmlElementType = 'text' | 'image' | 'link'

export type ParsedHtmlEditableElement = {
  id: string
  type: ParsedHtmlElementType
  label: string
  tagName: string
  selector: string
  content?: string
  originalContent?: string
  src?: string
  originalSrc?: string
  alt?: string
  originalAlt?: string
  href?: string
  originalHref?: string
}

export type ParsedHtmlDocument = {
  id: string
  title: string
  sourceName: string
  rawHtml: string
  elements: ParsedHtmlEditableElement[]
}

type ParseHtmlDocumentOptions = {
  sourceName?: string
}

const TEXT_SELECTOR = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'a',
  'button',
  'li',
  'div',
  'td',
  'th',
  'span',
  'strong',
  'em'
].join(',')

const IGNORED_TEXT_PARENT_SELECTOR = 'script, style, noscript, template, svg'
const MAX_TEXT_ELEMENT_COUNT = 80
const MAX_IMAGE_ELEMENT_COUNT = 40

/**
 * HTML 파일 텍스트 읽기 및 문서 파싱
 *
 * @param file - 업로드된 HTML 파일
 * @returns 파싱된 편집 가능 HTML 문서
 */
export async function parseHtmlFile(file: File) {
  const html = await file.text()

  return parseHtmlDocument(html, {
    sourceName: file.name
  })
}

/**
 * HTML 문자열에서 편집 가능한 텍스트, 이미지, 링크 요소 추출
 *
 * @param html - 파싱할 HTML 문자열
 * @param options - 문서 출처 이름 옵션
 * @returns 에디터에서 사용할 수 있는 HTML 문서 모델
 */
export function parseHtmlDocument(html: string, options: ParseHtmlDocumentOptions = {}): ParsedHtmlDocument {
  // 브라우저 DOM 파서 사용 가능 여부 확인
  if (typeof DOMParser === 'undefined') {
    throw new Error('HTML 파서는 브라우저 환경에서만 사용할 수 있습니다.')
  }

  // HTML 문자열을 브라우저 DOM 문서로 변환
  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')
  const parseError = document.querySelector('parsererror')

  // 파싱 실패 노드 기준 오류 감지
  if (parseError) {
    throw new Error('HTML 파일을 파싱할 수 없습니다. 파일 내용을 확인해주세요.')
  }

  // 편집 대상에서 제외할 실행/메타성 노드 제거
  document.querySelectorAll(IGNORED_TEXT_PARENT_SELECTOR).forEach((node) => node.remove())

  // 본문 루트 기준 편집 가능 요소 수집
  const root = document.body || document.documentElement
  const textElements = extractTextElements(root)
  const imageElements = extractImageElements(root)
  const linkElements = extractLinkElements(root, [...textElements, ...imageElements])
  const sourceName = options.sourceName || 'HTML 문서'

  // 원본 HTML과 편집 가능 요소 목록을 포함한 문서 모델 구성
  return {
    id: createElementId('document', sourceName, html.length),
    title: normalizeText(document.title) || sourceName,
    sourceName,
    rawHtml: html,
    elements: [...textElements, ...imageElements, ...linkElements]
  }
}

/**
 * 편집 상태가 반영된 HTML 문서 문자열 생성
 *
 * @param document - 편집 가능한 HTML 문서 모델
 * @returns 에디터 스타일과 편집값이 반영된 HTML 문자열
 */
export function renderEditableHtmlDocument(document: ParsedHtmlDocument) {
  if (typeof DOMParser === 'undefined') {
    return document.rawHtml
  }

  const parser = new DOMParser()
  const parsedDocument = parser.parseFromString(document.rawHtml, 'text/html')

  document.elements.forEach((editableElement) => {
    const element = parsedDocument.querySelector<HTMLElement>(editableElement.selector)

    if (!element) return

    element.dataset.tcubeEditableId = editableElement.id
    element.dataset.tcubeEditableType = editableElement.type
    element.style.cursor = 'pointer'

    if (editableElement.type === 'text') {
      if (editableElement.content !== editableElement.originalContent) {
        element.textContent = editableElement.content || ''
      }
      if (element instanceof HTMLAnchorElement) {
        if (editableElement.href !== editableElement.originalHref) {
          element.href = editableElement.href || '#'
        }
      }
      return
    }

    if (editableElement.type === 'image' && element instanceof HTMLImageElement) {
      if (editableElement.src !== editableElement.originalSrc) {
        element.src = editableElement.src || ''
      }
      if (editableElement.alt !== editableElement.originalAlt) {
        element.alt = editableElement.alt || ''
      }
      if (editableElement.href !== editableElement.originalHref) {
        const linkElement = element.closest('a')
        if (linkElement) {
          linkElement.href = editableElement.href || '#'
        }
      }
    }

    if (editableElement.type === 'link' && element instanceof HTMLAnchorElement) {
      if (editableElement.href !== editableElement.originalHref) {
        element.href = editableElement.href || '#'
      }
    }
  })

  injectEditorStyle(parsedDocument)

  return `<!doctype html>\n${parsedDocument.documentElement.outerHTML}`
}

/**
 * 텍스트 편집 대상 요소 추출
 *
 * @param root - 탐색 기준 DOM 루트
 * @returns 텍스트 편집 요소 목록
 */
function extractTextElements(root: HTMLElement): ParsedHtmlEditableElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TEXT_SELECTOR))
    .map((element, index) => {
      const content = getEditableTextContent(element)

      if (!content) return null

      return {
        id: createElementId('text', index, content),
        type: 'text' as const,
        label: createElementLabel(element, index),
        tagName: element.tagName.toLowerCase(),
        selector: createElementSelector(element),
        content,
        originalContent: content,
        href: element instanceof HTMLAnchorElement ? element.getAttribute('href') || '' : undefined,
        originalHref: element instanceof HTMLAnchorElement ? element.getAttribute('href') || '' : undefined
      }
    })
    .filter((element): element is ParsedHtmlEditableElement => Boolean(element))
    .slice(0, MAX_TEXT_ELEMENT_COUNT)
}

/**
 * 텍스트/이미지로 이미 등록되지 않은 링크 요소 추출
 *
 * @param root - 탐색 기준 DOM 루트
 * @param existingElements - 중복 제외 기준 편집 요소 목록
 * @returns 링크 편집 요소 목록
 */
function extractLinkElements(root: HTMLElement, existingElements: ParsedHtmlEditableElement[]): ParsedHtmlEditableElement[] {
  const existingSelectors = new Set(existingElements.map((element) => element.selector))

  return Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .filter((element) => !existingSelectors.has(createElementSelector(element)))
    .map((element, index) => ({
      id: createElementId('link', index, element.getAttribute('href') || ''),
      type: 'link' as const,
      label: createElementLabel(element, index),
      tagName: element.tagName.toLowerCase(),
      selector: createElementSelector(element),
      href: element.getAttribute('href') || '',
      originalHref: element.getAttribute('href') || ''
    }))
}

/**
 * 이미지 편집 대상 요소 추출
 *
 * @param root - 탐색 기준 DOM 루트
 * @returns 이미지 편집 요소 목록
 */
function extractImageElements(root: HTMLElement): ParsedHtmlEditableElement[] {
  return Array.from(root.querySelectorAll<HTMLImageElement>('img'))
    .map((element, index) => {
      const linkElement = element.closest('a')
      const href = linkElement?.getAttribute('href')

      return {
        id: createElementId('image', index, element.currentSrc || element.src || element.alt || ''),
        type: 'image' as const,
        label: createElementLabel(element, index),
        tagName: element.tagName.toLowerCase(),
        selector: createElementSelector(element),
        src: element.getAttribute('src') || '',
        originalSrc: element.getAttribute('src') || '',
        alt: element.getAttribute('alt') || '',
        originalAlt: element.getAttribute('alt') || '',
        href: href === null ? undefined : href,
        originalHref: href === null ? undefined : href
      }
    })
    .slice(0, MAX_IMAGE_ELEMENT_COUNT)
}

/**
 * 편집 요소 표시용 라벨 생성
 *
 * @param element - 라벨 생성 대상 요소
 * @param index - 동일 타입 내 순번
 * @returns 태그명 기반 라벨
 */
function createElementLabel(element: Element, index: number) {
  const tagName = element.tagName.toUpperCase()

  return `${tagName} ${index + 1}`
}

/**
 * 원본 문서 내 요소 재탐색용 CSS 선택자 생성
 *
 * @param element - 선택자 생성 대상 요소
 * @returns 루트부터 대상까지의 CSS 선택자 경로
 */
function createElementSelector(element: Element) {
  const paths: string[] = []
  let current: Element | null = element

  while (current && current.tagName.toLowerCase() !== 'html') {
    const tagName = current.tagName.toLowerCase()
    const sameTagSiblings = current.parentElement
      ? Array.from(current.parentElement.children).filter((child) => child.tagName === current?.tagName)
      : []
    const siblingIndex = sameTagSiblings.indexOf(current) + 1

    paths.unshift(sameTagSiblings.length > 1 ? `${tagName}:nth-of-type(${siblingIndex})` : tagName)
    current = current.parentElement
  }

  return paths.join(' > ')
}

/**
 * 공백 문자를 단일 공백으로 정규화
 *
 * @param value - 정규화할 문자열
 * @returns 앞뒤 공백이 제거된 문자열
 */
function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * 요소에서 편집 가능한 텍스트 콘텐츠 추출
 *
 * @param element - 텍스트 추출 대상 요소
 * @returns 편집 가능한 텍스트 또는 빈 문자열
 */
function getEditableTextContent(element: HTMLElement) {
  if (element instanceof HTMLAnchorElement && !isTextEditableAnchor(element)) {
    return ''
  }

  const directText = Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || '')
    .join(' ')

  const normalizedDirectText = normalizeText(directText)

  if (normalizedDirectText) return normalizedDirectText

  if (element.matches('a, button, span, strong, em, h1, h2, h3, h4, h5, h6, p, li')) {
    return normalizeText(element.textContent || '')
  }

  return ''
}

/**
 * 링크 요소의 텍스트 직접 편집 가능 여부 판정
 *
 * @param element - 판정 대상 링크 요소
 * @returns 텍스트 편집 가능 여부
 */
function isTextEditableAnchor(element: HTMLAnchorElement) {
  if (element.querySelector('img, picture, svg, video, table')) return false
  if (element.querySelectorAll('div').length > 1) return false

  const elementChildren = Array.from(element.children)

  if (elementChildren.length === 0) return true
  if (elementChildren.length > 2) return false

  return elementChildren.every((child) => {
    const tagName = child.tagName.toLowerCase()
    if (!['span', 'strong', 'em', 'b', 'i', 'small', 'div'].includes(tagName)) return false
    if (child.querySelector('img, picture, svg, video, table, div')) return false

    return Boolean(normalizeText(child.textContent || ''))
  })
}

/**
 * 편집 요소 식별용 안정 해시 ID 생성
 *
 * @param parts - ID 생성에 사용할 문자열 또는 숫자 조각
 * @returns html 접두사가 포함된 요소 ID
 */
function createElementId(...parts: Array<string | number>) {
  const source = parts.join('-')
  let hash = 0

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index)
    hash |= 0
  }

  return `html-${Math.abs(hash).toString(36)}`
}

/**
 * 편집 가능 요소 강조 스타일 주입
 *
 * @param document - 스타일을 주입할 HTML 문서
 */
function injectEditorStyle(document: Document) {
  const style = document.createElement('style')

  style.textContent = `
    [data-tcube-editable-id] {
      outline: 2px solid transparent !important;
      outline-offset: 3px !important;
      transition: outline-color 120ms ease, box-shadow 120ms ease !important;
    }

    [data-tcube-editable-id]:hover {
      outline-color: rgba(101, 108, 255, 0.72) !important;
      box-shadow: 0 0 0 4px rgba(101, 108, 255, 0.16) !important;
    }

    [data-tcube-editable-id][data-tcube-selected="true"] {
      outline-color: #656cff !important;
      box-shadow: 0 0 0 5px rgba(101, 108, 255, 0.2) !important;
    }

    [data-tcube-editable-id][data-tcube-editing="true"] {
      outline-color: #8b91ff !important;
      box-shadow: 0 0 0 5px rgba(139, 145, 255, 0.28) !important;
    }

    [data-tcube-editable-id][contenteditable="true"] {
      cursor: text !important;
    }
  `

  document.head.appendChild(style)
}
