export type ParsedHtmlElementType = 'text' | 'image' | 'link' | 'picture' | 'video'

export type ParsedHtmlMediaSource = {
  selector: string
  label: string
  attribute: 'src' | 'srcset'
  src: string
  originalSrc: string
  media?: string
  mimeType?: string
}

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
  mediaSources?: ParsedHtmlMediaSource[]
}

export type ParsedHtmlLayoutNode = {
  id: string
  signature: string
  label: string
  tagName: string
  selector: string
  parentSelector: string
  depth: number
  childCount: number
  previewText: string
}

export type ParsedHtmlDocument = {
  id: string
  title: string
  sourceName: string
  rawHtml: string
  elements: ParsedHtmlEditableElement[]
  layoutNodes: ParsedHtmlLayoutNode[]
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
  'dt',
  'dd',
  'pre',
  'blockquote',
  'address',
  'div',
  'td',
  'th',
  'span',
  'strong',
  'em'
].join(',')

const IGNORED_TEXT_PARENT_SELECTOR = 'script, style'
const STRUCTURE_EXCLUDED_TAGS = new Set(['html', 'head', 'body', 'script', 'style', 'link', 'meta', 'title'])
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
  const mediaElements = extractMediaElements(root)
  const linkElements = extractLinkElements(root, [...textElements, ...imageElements, ...mediaElements])
  const elements = [...textElements, ...imageElements, ...mediaElements, ...linkElements]

  // 요소 유형과 관계없이 원본 HTML의 DOM 등장 순서 유지
  elements.sort((firstElement, secondElement) => {
    const firstDomElement = document.querySelector(firstElement.selector)
    const secondDomElement = document.querySelector(secondElement.selector)

    if (!firstDomElement || !secondDomElement) return 0

    const position = firstDomElement.compareDocumentPosition(secondDomElement)

    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1

    return 0
  })
  const layoutNodes = extractLayoutNodes(root)
  const sourceName = options.sourceName || 'HTML 문서'

  // 원본 HTML과 편집 가능 요소 목록을 포함한 문서 모델 구성
  return {
    id: createElementId('document', sourceName, html.length),
    title: normalizeText(document.title) || sourceName,
    sourceName,
    rawHtml: html,
    elements,
    layoutNodes
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

  const parsedDocument = createRenderedHtmlDocument(document)

  document.layoutNodes.forEach((layoutNode) => {
    const element = parsedDocument.querySelector<HTMLElement>(layoutNode.selector)

    if (!element) return

    element.dataset.tcubeLayoutId = layoutNode.id
  })

  injectEditorStyle(parsedDocument)

  return serializeHtmlDocument(parsedDocument)
}

/**
 * ?먮뵒???ㅽ??쇱쓣 ?쒓굅??理쒖쥌 HTML 臾몄꽌 臾몄옄???앹꽦
 *
 * @param document - ?몄쭛 媛?ν븳 HTML 臾몄꽌 紐⑤뜽
 * @returns ?몄쭛媛믪씠 諛섏쁺??理쒖쥌 HTML 臾몄옄??
 */
export function renderFinalHtmlDocument(document: ParsedHtmlDocument) {
  if (typeof DOMParser === 'undefined') {
    return document.rawHtml
  }

  return serializeHtmlDocument(createRenderedHtmlDocument(document))
}

/**
 * HTML ?덉씠?꾩썐 ?몃뱶瑜?媛숈? 遺紐? ?덉뿉???대룞
 *
 * @param document - ?꾩옱 ?몄쭛 臾몄꽌
 * @param sourceNodeId - ?대룞???덉씠?꾩썐 ?몃뱶 id
 * @param targetNodeId - 湲곗??덉씠?꾩썐 ?몃뱶 id
 * @param position - 湲곗??몃뱶 ?욎뿉 ?щ뒗吏 ?ㅼ뿉 ?щ뒗吏
 * @returns ?대룞???앷린硫?HTML 臾몄옄?? ?덉쟾?섏? ?딆쑝硫?null
 */
export function moveHtmlLayoutNode(
  document: ParsedHtmlDocument,
  sourceNodeId: string,
  targetNodeId: string,
  position: 'before' | 'after'
) {
  const sourceNode = document.layoutNodes.find((node) => node.id === sourceNodeId)
  const targetNode = document.layoutNodes.find((node) => node.id === targetNodeId)

  if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return null
  if (sourceNode.parentSelector !== targetNode.parentSelector) return null

  const parser = new DOMParser()
  const parsedDocument = parser.parseFromString(renderFinalHtmlDocument(document), 'text/html')
  const sourceElement = parsedDocument.querySelector<HTMLElement>(sourceNode.selector)
  const targetElement = parsedDocument.querySelector<HTMLElement>(targetNode.selector)

  if (!sourceElement || !targetElement) return null
  if (sourceElement.parentElement !== targetElement.parentElement) return null
  if (sourceElement.contains(targetElement) || targetElement.contains(sourceElement)) return null

  if (position === 'before') {
    targetElement.before(sourceElement)
  } else {
    targetElement.after(sourceElement)
  }

  return {
    html: serializeHtmlDocument(parsedDocument),
    movedSelector: createElementSelector(sourceElement)
  }
}

/**
 * ?몄쭛媛믪씠 諛섏쁺??DOM 臾몄꽌瑜??앹꽦
 *
 * @param document - ?몄쭛 媛?ν븳 HTML 臾몄꽌 紐⑤뜽
 * @returns content/src/href 蹂寃쎌씠 諛섏쁺??DOM 臾몄꽌
 */
function createRenderedHtmlDocument(document: ParsedHtmlDocument) {
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

    if (editableElement.type === 'picture' || editableElement.type === 'video') {
      editableElement.mediaSources?.forEach((mediaSource) => {
        if (mediaSource.src === mediaSource.originalSrc) return

        const sourceElement = parsedDocument.querySelector<HTMLElement>(mediaSource.selector)

        sourceElement?.setAttribute(mediaSource.attribute, mediaSource.src)
      })

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

  return parsedDocument
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
    .filter((element) => !element.closest('picture'))
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
 * picture/video 미디어 컨테이너 및 내부 source 목록 추출
 *
 * @param root 탐색 기준 DOM 루트
 * @returns 미디어 편집 대상 요소 목록
 */
function extractMediaElements(root: HTMLElement): ParsedHtmlEditableElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('picture, video'))
    .map((element, index) => {
      const isPicture = element.tagName.toLowerCase() === 'picture'
      const mediaSources = extractMediaSources(element, isPicture ? 'picture' : 'video')
      const linkElement = element.closest('a')
      const href = linkElement?.getAttribute('href')

      return {
        id: createElementId(isPicture ? 'picture' : 'video', index, createElementSelector(element)),
        type: isPicture ? 'picture' as const : 'video' as const,
        label: createElementLabel(element, index),
        tagName: element.tagName.toLowerCase(),
        selector: createElementSelector(element),
        mediaSources,
        href: href === null ? undefined : href,
        originalHref: href === null ? undefined : href
      }
    })
}

/**
 * 미디어 컨테이너의 source와 fallback URL 정보 추출
 *
 * @param element picture 또는 video 컨테이너 요소
 * @param type 컨테이너 미디어 유형
 * @returns URL 수정에 사용할 미디어 source 목록
 */
function extractMediaSources(element: HTMLElement, type: 'picture' | 'video'): ParsedHtmlMediaSource[] {
  const sources = Array.from(element.querySelectorAll<HTMLSourceElement>(':scope > source')).map((source, index) => {
    const attribute = type === 'picture' ? 'srcset' as const : 'src' as const
    const src = source.getAttribute(attribute) || ''

    return {
      selector: createElementSelector(source),
      label: `SOURCE ${index + 1}`,
      attribute,
      src,
      originalSrc: src,
      media: source.getAttribute('media') || undefined,
      mimeType: source.getAttribute('type') || undefined
    }
  })

  if (type === 'picture') {
    const fallbackImage = element.querySelector<HTMLImageElement>('img')

    if (fallbackImage) {
      const src = fallbackImage.getAttribute('src') || ''

      sources.push({
        selector: createElementSelector(fallbackImage),
        label: 'IMG fallback',
        attribute: 'src',
        src,
        originalSrc: src
      })
    }
  } else if (element.hasAttribute('src')) {
    const src = element.getAttribute('src') || ''

    sources.unshift({
      selector: createElementSelector(element),
      label: 'VIDEO src',
      attribute: 'src',
      src,
      originalSrc: src,
      mimeType: element.getAttribute('type') || undefined
    })
  }

  return sources
}

/**
 * HTML ?몄뒪?앺꽣???쒖떆???덉씠?꾩썐 ?몃뱶 異붿텧
 *
 * @param root - ?먯깋 湲곗? DOM 猷⑦듃
 * @returns ?쒓렇, depth, 遺紐? ?뺣낫瑜??ы븿???덉씠?꾩썐 ?몃뱶 紐⑸줉
 */
function extractLayoutNodes(root: HTMLElement): ParsedHtmlLayoutNode[] {
  return Array.from(root.querySelectorAll<HTMLElement>('*'))
    .filter((element) => isMovableLayoutElement(element))
    .map((element, index) => {
      const selector = createElementSelector(element)
      const label = createLayoutNodeLabel(element, index)
      const tagName = element.tagName.toLowerCase()
      const previewText = normalizeText(element.textContent || '').slice(0, 48)

      return {
        id: createElementId('layout', selector, index),
        signature: createElementId('layout-signature', tagName, label, previewText),
        label,
        tagName,
        selector,
        parentSelector: element.parentElement ? createElementSelector(element.parentElement) : '',
        depth: getLayoutNodeDepth(element),
        childCount: element.children.length,
        previewText
      }
    })
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
 * ?몄뒪?앺꽣???쒖떆???덉씠?꾩썐 ?몃뱶 ?쇰꺼 ?앹꽦
 *
 * @param element - ?쇰꺼 ?앹꽦 ????붿냼
 * @param index - ?덉씠?꾩썐 ?몃뱶 ?쒕쾲
 * @returns ?쒓렇紐?湲곕컲 ?쇰꺼
 */
function createLayoutNodeLabel(element: Element, index: number) {
  const tagName = element.tagName.toUpperCase()
  const className = element.getAttribute('class')?.split(/\s+/).filter(Boolean)[0]
  const id = element.getAttribute('id')

  if (id) return `${tagName}#${id}`
  if (className) return `${tagName}.${className}`

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
 * ?덉씠?꾩썐 ?몃뱶 ?대룞 媛???щ? ?먯젙
 *
 * @param element - ?대룞 ????붿냼
 * @returns ?몄뒪?앺꽣 ?대룞 ??곸쑝濡??덉쟾?섎㈃ true
 */
function isMovableLayoutElement(element: HTMLElement) {
  if (!element.parentElement) return false

  return !STRUCTURE_EXCLUDED_TAGS.has(element.tagName.toLowerCase())
}

/**
 * body 湲곗??덉씠?꾩썐 ?몃뱶 湲딆씠 怨꾩궛
 *
 * @param element - 湲딆씠瑜?怨꾩궛???붿냼
 * @returns body ?먯떇 湲곗? depth
 */
function getLayoutNodeDepth(element: HTMLElement) {
  let depth = 0
  let current = element.parentElement

  while (current && current.tagName.toLowerCase() !== 'body' && current.tagName.toLowerCase() !== 'html') {
    depth += 1
    current = current.parentElement
  }

  return depth
}

/**
 * DOM 臾몄꽌瑜?doctype ?ы븿 HTML 臾몄옄?대줈 蹂??
 *
 * @param document - 臾몄옄?대줈 蹂?섑븷 DOM 臾몄꽌
 * @returns HTML 臾몄옄??
 */
function serializeHtmlDocument(document: Document) {
  return `<!doctype html>\n${document.documentElement.outerHTML}`
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
    html[data-tcube-inspector-mode="elements"] [data-tcube-editable-id] {
      outline: 2px solid transparent !important;
      outline-offset: 3px !important;
      transition: outline-color 120ms ease, box-shadow 120ms ease !important;
    }

    html[data-tcube-inspector-mode="elements"] [data-tcube-editable-id][data-tcube-hovered="true"] {
      outline-color: rgba(101, 108, 255, 0.72) !important;
      box-shadow: 0 0 0 4px rgba(101, 108, 255, 0.16) !important;
    }

    html[data-tcube-inspector-mode="elements"] [data-tcube-editable-id][data-tcube-selected="true"] {
      outline-color: #656cff !important;
      box-shadow: 0 0 0 5px rgba(101, 108, 255, 0.2) !important;
    }

    html[data-tcube-inspector-mode="elements"] [data-tcube-editable-id][data-tcube-editing="true"] {
      outline-color: #8b91ff !important;
      box-shadow: 0 0 0 5px rgba(139, 145, 255, 0.28) !important;
    }

    html[data-tcube-inspector-mode="elements"] [data-tcube-editable-id][contenteditable="true"] {
      cursor: text !important;
    }

    html[data-tcube-inspector-mode="layout"] [data-tcube-layout-id] {
      cursor: pointer !important;
    }

    html[data-tcube-inspector-mode="layout"] [data-tcube-layout-id][data-tcube-hovered="true"] {
      outline: 2px dashed rgba(59, 210, 131, 0.72) !important;
      outline-offset: 7px !important;
      box-shadow: 0 0 0 5px rgba(59, 210, 131, 0.12) !important;
    }

    html[data-tcube-inspector-mode="layout"] [data-tcube-layout-id][data-tcube-layout-selected="true"] {
      outline: 2px dashed rgba(59, 210, 131, 0.9) !important;
      outline-offset: 7px !important;
      box-shadow: 0 0 0 5px rgba(59, 210, 131, 0.16) !important;
    }
  `

  document.head.appendChild(style)
}
