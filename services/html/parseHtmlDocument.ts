export type ParsedHtmlElementType = 'text' | 'image'

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

export async function parseHtmlFile(file: File) {
  const html = await file.text()

  return parseHtmlDocument(html, {
    sourceName: file.name
  })
}

export function parseHtmlDocument(html: string, options: ParseHtmlDocumentOptions = {}): ParsedHtmlDocument {
  if (typeof DOMParser === 'undefined') {
    throw new Error('HTML 파서는 브라우저 환경에서만 사용할 수 있습니다.')
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')
  const parseError = document.querySelector('parsererror')

  if (parseError) {
    throw new Error('HTML 파일을 파싱할 수 없습니다. 파일 내용을 확인해주세요.')
  }

  document.querySelectorAll(IGNORED_TEXT_PARENT_SELECTOR).forEach((node) => node.remove())

  const root = document.body || document.documentElement
  const textElements = extractTextElements(root)
  const imageElements = extractImageElements(root)
  const sourceName = options.sourceName || 'HTML 문서'

  return {
    id: createElementId('document', sourceName, html.length),
    title: normalizeText(document.title) || sourceName,
    sourceName,
    rawHtml: html,
    elements: [...textElements, ...imageElements]
  }
}

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
    }
  })

  injectEditorStyle(parsedDocument)

  return `<!doctype html>\n${parsedDocument.documentElement.outerHTML}`
}

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

function extractImageElements(root: HTMLElement): ParsedHtmlEditableElement[] {
  return Array.from(root.querySelectorAll<HTMLImageElement>('img'))
    .map((element, index) => ({
      id: createElementId('image', index, element.currentSrc || element.src || element.alt || ''),
      type: 'image' as const,
      label: createElementLabel(element, index),
      tagName: element.tagName.toLowerCase(),
      selector: createElementSelector(element),
      src: element.getAttribute('src') || '',
      originalSrc: element.getAttribute('src') || '',
      alt: element.getAttribute('alt') || '',
      originalAlt: element.getAttribute('alt') || ''
    }))
    .slice(0, MAX_IMAGE_ELEMENT_COUNT)
}

function createElementLabel(element: Element, index: number) {
  const tagName = element.tagName.toUpperCase()

  return `${tagName} ${index + 1}`
}

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

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function getEditableTextContent(element: HTMLElement) {
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

function createElementId(...parts: Array<string | number>) {
  const source = parts.join('-')
  let hash = 0

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index)
    hash |= 0
  }

  return `html-${Math.abs(hash).toString(36)}`
}

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
