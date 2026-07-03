<template>
  <section class="html-editor-screen">
    <div
      v-if="currentDocument"
      class="html-editor-layout"
      :class="{ 'show-element-list': showElementList }"
    >
      <input
        ref="imageInput"
        class="html-image-input"
        type="file"
        accept="image/*"
        @change="handleImageInputChange"
      >

      <aside v-if="showElementList" class="html-editor-panel element-list-panel">
        <div class="html-editor-panel-title">
          <strong>편집 요소</strong>
          <span>{{ currentDocument.elements.length }}개</span>
        </div>

        <button
          v-for="element in currentDocument.elements"
          :key="element.id"
          class="element-list-item"
          :class="{ active: builderStore.selectedElementId === element.id }"
          type="button"
          @click.stop="handleElementListClick(element)"
        >
          <TcubeIcon :icon="getElementIcon(element)" />
          <span>
            <strong>{{ element.label }}</strong>
            <small>{{ getElementPreview(element) }}</small>
          </span>
        </button>
      </aside>

      <main class="html-editor-preview">
        <div class="html-editor-preview-toolbar">
          <div class="html-editor-preview-title">
            <button
              class="html-editor-panel-toggle"
              type="button"
              :aria-label="showElementList ? '편집 요소 숨기기' : '편집 요소 보이기'"
              :aria-pressed="showElementList"
              @click="showElementList = !showElementList"
            >
              <TcubeIcon :icon="showElementList ? 'ri-side-bar-fill' : 'ri-side-bar-line'" />
            </button>
            <strong>미리보기</strong>
          </div>
        </div>

        <div ref="previewWrap" class="html-browser-preview">
          <iframe
            ref="previewFrame"
            class="html-browser-frame"
            :style="{ width: previewFrameWidth }"
            title="HTML 미리보기"
            sandbox="allow-same-origin allow-popups allow-forms"
            :srcdoc="previewHtml"
            @load="handlePreviewLoad"
          />

          <div
            v-if="linkMenu.visible"
            class="html-link-edit-popover"
            :style="{ left: `${linkMenu.x}px`, top: `${linkMenu.y}px` }"
            @click.stop
            @keydown.esc.stop.prevent="closeLinkMenu"
          >
            <template v-if="linkMenu.mode === 'menu'">
              <button v-if="linkMenu.targetType !== 'image' || linkMenu.hasLink" type="button" @click.stop="openSelectedLinkHrefEdit">
                <TcubeIcon icon="ri-link" />
                <span>링크 수정</span>
              </button>
              <button v-if="linkMenu.targetType === 'text'" type="button" @click.stop="startSelectedLinkTextEdit">
                <TcubeIcon icon="ri-text" />
                <span>텍스트 수정</span>
              </button>
              <button v-if="linkMenu.targetType === 'image'" type="button" @click.stop="startSelectedImageEdit">
                <TcubeIcon icon="ri-upload-cloud-2-line" />
                <span>이미지 업로드</span>
              </button>
              <button v-if="linkMenu.targetType === 'image'" type="button" @click.stop="openSelectedImageSrcEdit">
                <TcubeIcon icon="ri-links-line" />
                <span>이미지 url 수정</span>
              </button>
            </template>

            <template v-else-if="linkMenu.mode === 'href'">
              <label>
                <span>링크 주소</span>
                <input
                  v-model="linkMenu.href"
                  type="text"
                  placeholder="https://..."
                  @keydown.enter.prevent="applySelectedLinkHref"
                  @keydown.esc.prevent="closeLinkMenu"
                >
              </label>
              <div class="html-link-edit-actions">
                <button type="button" @click.stop="closeLinkMenu">취소</button>
                <button type="button" @click.stop="applySelectedLinkHref">적용</button>
              </div>
            </template>

            <template v-else>
              <label>
                <span>이미지 URL</span>
                <input
                  v-model="linkMenu.src"
                  type="text"
                  placeholder="https://..."
                  @keydown.enter.prevent="applySelectedImageSrc"
                  @keydown.esc.prevent="closeLinkMenu"
                >
              </label>
              <div class="html-link-edit-actions">
                <button type="button" @click.stop="closeLinkMenu">취소</button>
                <button type="button" @click.stop="applySelectedImageSrc">적용</button>
              </div>
            </template>
          </div>
        </div>
      </main>
    </div>

    <div v-else class="body-placeholder">
      <span class="section-title">HTML EDITOR</span>
      <h1>편집할 HTML 문서가 없습니다</h1>
      <p>HTML 파일을 업로드하고 분석을 시작해주세요.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ParsedHtmlEditableElement } from '~/stores/builder'
import { useBuilderStore } from '~/stores/builder'
import { renderEditableHtmlDocument } from '~/services/html/parseHtmlDocument'

const builderStore = useBuilderStore()
const previewFrame = ref<HTMLIFrameElement | null>(null)
const previewWrap = ref<HTMLElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const showElementList = ref(false)
const selectedImageElementId = ref('')
const linkMenu = reactive({
  visible: false,
  mode: 'menu' as 'menu' | 'href' | 'image-src',
  targetType: 'link' as 'link' | 'text' | 'image',
  hasLink: false,
  elementId: '',
  href: '',
  src: '',
  x: 0,
  y: 0
})

const currentDocument = computed(() => builderStore.currentDocument)
const previewHtml = computed(() => currentDocument.value ? renderEditableHtmlDocument(currentDocument.value) : '')
const previewFrameWidth = computed(() => {
  if (builderStore.activeViewport === 'tablet') return '768px'
  if (builderStore.activeViewport === 'mobile') return '390px'

  return '100%'
})

/**
 * iframe 미리보기 로드가 끝난 뒤 편집 가능한 요소에 클릭/키보드 이벤트를 연결
 */
function handlePreviewLoad() {
  const frameDocument = previewFrame.value?.contentDocument

  if (!frameDocument) return

  frameDocument.addEventListener('click', handlePreviewDocumentClick)
  frameDocument.addEventListener('keydown', handleCloseMenuKeydown)
  frameDocument.addEventListener('scroll', closeLinkMenu, true)

  frameDocument.querySelectorAll<HTMLElement>('[data-tcube-editable-id]').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()

      const clickedElement = event.target instanceof HTMLElement ? event.target : element
      const clickedLink = clickedElement.closest<HTMLAnchorElement>('a')
      const elementId = element.dataset.tcubeEditableId

      if (clickedLink) {
        openAnchorToolbar(clickedLink, clickedElement, event)
        return
      }

      if (elementId) {
        builderStore.selectElement(elementId)
      }

      if (element.dataset.tcubeEditableType === 'text') {
        startTextEdit(element)
        return
      }

      if (element.dataset.tcubeEditableType === 'image') {
        if (isImageElement(element)) {
          openImageMenu(element, event)
          return
        }

        closeLinkMenu()
        return
      }

      closeLinkMenu()
    })
  })

  syncPreviewSelection()
}

/**
 * iframe 문서의 빈 영역 또는 편집 요소 클릭을 처리
 * 개별 요소 이벤트가 누락되는 경우에도 이미지/링크 툴바를 열 수 있도록 보정
 *
 * @param event iframe 문서에서 발생한 click 이벤트
 */
function handlePreviewDocumentClick(event: MouseEvent) {
  const clickedElement = event.target instanceof HTMLElement ? event.target : null
  const editableElement = clickedElement?.closest<HTMLElement>('[data-tcube-editable-id]')
  const clickedLink = clickedElement?.closest<HTMLAnchorElement>('a')

  if (clickedLink && clickedElement) {
    event.preventDefault()
    event.stopPropagation()
    openAnchorToolbar(clickedLink, clickedElement, event)
    return
  }

  if (editableElement?.dataset.tcubeEditableType === 'image' && isImageElement(editableElement)) {
    event.preventDefault()
    event.stopPropagation()
    if (editableElement.dataset.tcubeEditableId) {
      builderStore.selectElement(editableElement.dataset.tcubeEditableId)
    }
    openImageMenu(editableElement, event)
    return
  }

  closeLinkMenu()
}

/**
 * 미리보기 바깥 영역을 클릭했을 때 열려있는 툴바를 닫음
 *
 * @param event 상위 document에서 발생한 click 이벤트
 */
function handleOuterDocumentClick(event: MouseEvent) {
  if (!linkMenu.visible) return

  const target = event.target

  if (target instanceof Node && previewWrap.value?.contains(target)) return

  closeLinkMenu()
}

/**
 * ESC 키 입력 시 열려있는 툴바 또는 편집 상태를 종료
 *
 * @param event document 또는 iframe 문서에서 발생한 keydown 이벤트
 */
function handleCloseMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeLinkMenu()
  }
}

/**
 * store의 선택 요소 상태를 iframe 미리보기의 data 속성으로 동기화
 */
function syncPreviewSelection() {
  const frameDocument = previewFrame.value?.contentDocument

  if (!frameDocument) return

  frameDocument.querySelectorAll<HTMLElement>('[data-tcube-selected]').forEach((element) => {
    delete element.dataset.tcubeSelected
  })

  if (!builderStore.selectedElementId) return

  const selectedPreviewElement = frameDocument.querySelector<HTMLElement>(
    `[data-tcube-editable-id="${builderStore.selectedElementId}"]`
  )

  if (selectedPreviewElement) {
    selectedPreviewElement.dataset.tcubeSelected = 'true'
    selectedPreviewElement.scrollIntoView({ block: 'center', inline: 'center' })
  }
}

/**
 * 텍스트 요소를 contenteditable 상태로 전환하고 blur 시 수정 내용을 저장
 *
 * @param element 텍스트 수정 대상으로 선택된 미리보기 HTMLElement
 */
function startTextEdit(element: HTMLElement) {
  closeLinkMenu()

  element.contentEditable = 'true'
  element.dataset.tcubeEditing = 'true'
  element.focus()
  placeCaretAtEnd(element)

  /**
   * 텍스트 편집 종료 시 현재 내용을 store에 저장하고 임시 이벤트를 해제
   */
  const commitEdit = () => {
    const elementId = element.dataset.tcubeEditableId

    element.contentEditable = 'false'
    delete element.dataset.tcubeEditing

    if (elementId) {
      builderStore.updateCurrentDocumentElement(elementId, {
        content: element.textContent || ''
      })
    }

    element.removeEventListener('blur', commitEdit)
    element.removeEventListener('keydown', handleKeydown)
  }

  /**
   * ESC 입력 시 텍스트 편집을 blur로 종료
   *
   * @param event 편집 중인 요소에서 발생한 keydown 이벤트
   */
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      element.blur()
    }
  }

  element.addEventListener('blur', commitEdit)
  element.addEventListener('keydown', handleKeydown)
}

/**
 * 좌측 편집 요소 목록에서 항목을 클릭했을 때 해당 미리보기 요소로 이동하고 편집 UI를 실행
 *
 * @param element 목록에서 선택된 파싱 요소 정보
 */
function handleElementListClick(element: ParsedHtmlEditableElement) {
  builderStore.selectElement(element.id)
  closeLinkMenu()

  const previewElement = getPreviewElement(element.id)

  if (!previewElement) return

  previewElement.scrollIntoView({ block: 'center', inline: 'center' })

  if (element.type === 'image') {
    if (isImageElement(previewElement)) {
      openImageMenuAtElement(previewElement)
      return
    }

    closeLinkMenu()
    return
  }

  if (element.type === 'link' || element.tagName === 'a') {
    openAnchorToolbarAtElement(previewElement)
    return
  }

  startTextEdit(previewElement)
}

/**
 * 링크 요소 클릭 위치에 링크 편집 툴바를 표시
 *
 * @param element 툴바를 연결할 anchor 요소
 * @param event 툴바 위치 계산에 사용할 마우스 이벤트
 * @param targetType 링크 내부에서 편집 가능한 대상 유형
 */
function openLinkMenu(element: HTMLAnchorElement, event: MouseEvent, targetType: 'link' | 'text' | 'image' = 'text') {
  const elementId = element.dataset.tcubeEditableId

  if (!elementId) return

  const position = getPopoverPosition(event)

  linkMenu.visible = true
  linkMenu.mode = 'menu'
  linkMenu.targetType = targetType
  linkMenu.hasLink = true
  linkMenu.elementId = elementId
  linkMenu.href = element.getAttribute('href') || ''
  linkMenu.x = position.x
  linkMenu.y = position.y
}

/**
 * 링크 요소의 현재 위치를 기준으로 링크 편집 툴바를 표시
 *
 * @param element 툴바를 연결할 anchor 요소
 * @param targetType 링크 내부에서 편집 가능한 대상 유형
 */
function openLinkMenuAtElement(element: HTMLAnchorElement, targetType: 'link' | 'text' | 'image' = 'text') {
  const elementId = element.dataset.tcubeEditableId

  if (!elementId) return

  const position = getPopoverPositionByElement(element)

  linkMenu.visible = true
  linkMenu.mode = 'menu'
  linkMenu.targetType = targetType
  linkMenu.hasLink = true
  linkMenu.elementId = elementId
  linkMenu.href = element.getAttribute('href') || ''
  linkMenu.x = position.x
  linkMenu.y = position.y
}

/**
 * anchor 클릭 대상의 내부 구조를 판별해 링크/텍스트/이미지 툴바 중 알맞은 툴바를 표시
 *
 * @param anchorElement 클릭된 대상과 연결된 anchor 요소
 * @param clickedElement 실제 클릭 이벤트가 발생한 요소
 * @param event 툴바 위치 계산에 사용할 마우스 이벤트
 */
function openAnchorToolbar(anchorElement: HTMLAnchorElement, clickedElement: HTMLElement, event: MouseEvent) {
  const imageElement = clickedElement.closest<HTMLImageElement>('img[data-tcube-editable-id]')
    || anchorElement.querySelector<HTMLImageElement>('img[data-tcube-editable-id]')

  if (imageElement) {
    openImageMenu(imageElement, event)
    return
  }

  const targetType = isSimpleTextAnchor(anchorElement) ? 'text' : 'link'
  const elementId = anchorElement.dataset.tcubeEditableId

  if (elementId) {
    builderStore.selectElement(elementId)
    openLinkMenu(anchorElement, event, targetType)
  }
}

/**
 * 특정 미리보기 요소 위치를 기준으로 anchor 편집 툴바를 표시
 *
 * @param element anchor 자체이거나 anchor 하위에 포함된 미리보기 요소
 */
function openAnchorToolbarAtElement(element: HTMLElement) {
  const anchorElement = isAnchorElement(element) ? element : element.closest<HTMLAnchorElement>('a')

  if (!anchorElement) return

  const imageElement = anchorElement.querySelector<HTMLImageElement>('img[data-tcube-editable-id]')

  if (imageElement) {
    openImageMenuAtElement(imageElement)
    return
  }

  openLinkMenuAtElement(anchorElement, isSimpleTextAnchor(anchorElement) ? 'text' : 'link')
}

/**
 * 이미지 클릭 위치에 이미지 편집 툴바를 표시
 * 이미지가 링크 내부에 있으면 링크 수정 항목도 함께 노출
 *
 * @param element 툴바를 연결할 이미지 요소
 * @param event 툴바 위치 계산에 사용할 마우스 이벤트
 */
function openImageMenu(element: HTMLImageElement, event: MouseEvent) {
  const elementId = element.dataset.tcubeEditableId
  const linkElement = getImageLinkElement(element)

  if (!elementId) return

  const position = getPopoverPosition(event)

  linkMenu.visible = true
  linkMenu.mode = 'menu'
  linkMenu.targetType = 'image'
  linkMenu.hasLink = Boolean(linkElement)
  linkMenu.elementId = elementId
  linkMenu.href = linkElement?.getAttribute('href') || ''
  linkMenu.src = element.getAttribute('src') || ''
  linkMenu.x = position.x
  linkMenu.y = position.y
}

/**
 * 이미지 요소의 현재 위치를 기준으로 이미지 편집 툴바를 표시
 *
 * @param element 툴바를 연결할 이미지 요소
 */
function openImageMenuAtElement(element: HTMLImageElement) {
  const elementId = element.dataset.tcubeEditableId
  const linkElement = getImageLinkElement(element)

  if (!elementId) return

  const position = getPopoverPositionByElement(element)

  linkMenu.visible = true
  linkMenu.mode = 'menu'
  linkMenu.targetType = 'image'
  linkMenu.hasLink = Boolean(linkElement)
  linkMenu.elementId = elementId
  linkMenu.href = linkElement?.getAttribute('href') || ''
  linkMenu.src = element.getAttribute('src') || ''
  linkMenu.x = position.x
  linkMenu.y = position.y
}

/**
 * 현재 선택된 링크 요소를 텍스트 직접 편집 상태로 전환
 */
function startSelectedLinkTextEdit() {
  const element = getPreviewElement(linkMenu.elementId)

  if (element) {
    startTextEdit(element)
  }
}

/**
 * 현재 선택된 링크의 href 입력 모드로 툴바를 전환하고 input에 포커싱
 */
function openSelectedLinkHrefEdit() {
  linkMenu.mode = 'href'
  nextTick(() => {
    const input = previewWrap.value?.querySelector<HTMLInputElement>('.html-link-edit-popover input')
    input?.focus()
    input?.select()
  })
}

/**
 * 현재 선택된 이미지의 src 입력 모드로 툴바를 전환하고 input에 포커싱
 */
function openSelectedImageSrcEdit() {
  const previewElement = getPreviewElement(linkMenu.elementId)

  if (isImageElement(previewElement)) {
    linkMenu.src = previewElement.getAttribute('src') || ''
  }

  linkMenu.mode = 'image-src'
  nextTick(() => {
    const input = previewWrap.value?.querySelector<HTMLInputElement>('.html-link-edit-popover input')
    input?.focus()
    input?.select()
  })
}

/**
 * 현재 선택된 이미지의 로컬 파일 선택 창을 실행
 */
function startSelectedImageEdit() {
  openImagePicker(linkMenu.elementId)
  closeLinkMenu()
}

/**
 * 툴바에서 입력한 링크 주소를 미리보기와 store에 반영
 */
function applySelectedLinkHref() {
  const previewElement = getPreviewElement(linkMenu.elementId)
  const linkElement = isAnchorElement(previewElement)
    ? previewElement
    : previewElement?.closest('a')

  if (isAnchorElement(linkElement)) {
    linkElement.setAttribute('href', linkMenu.href)
  }

  builderStore.updateCurrentDocumentElement(linkMenu.elementId, {
    href: linkMenu.href
  })
  closeLinkMenu()
}

/**
 * 툴바에서 입력한 이미지 URL을 미리보기와 store에 반영
 */
function applySelectedImageSrc() {
  const previewElement = getPreviewElement(linkMenu.elementId)

  if (isImageElement(previewElement)) {
    previewElement.src = linkMenu.src
    previewElement.setAttribute('src', linkMenu.src)
  }

  builderStore.updateCurrentDocumentElement(linkMenu.elementId, {
    src: linkMenu.src
  })
  closeLinkMenu()
}

/**
 * 이미지 파일 선택 input을 열기 위해 선택 이미지 id를 저장
 *
 * @param elementId 로컬 이미지로 교체할 파싱 요소 id
 */
function openImagePicker(elementId: string) {
  selectedImageElementId.value = elementId
  imageInput.value?.click()
}

/**
 * 파일 선택 창에서 선택된 이미지를 data URL로 읽어 미리보기와 store에 반영
 *
 * @param event 이미지 파일 input의 change 이벤트
 */
function handleImageInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const elementId = selectedImageElementId.value

  if (!file || !elementId) {
    input.value = ''
    return
  }

  const reader = new FileReader()

  reader.onload = () => {
    const src = typeof reader.result === 'string' ? reader.result : ''
    const imageElement = getPreviewElement(elementId)

    if (isImageElement(imageElement)) {
      imageElement.src = src
    }

    builderStore.updateCurrentDocumentElement(elementId, { src })
    input.value = ''
  }

  reader.readAsDataURL(file)
}

/**
 * 링크/이미지 툴바 상태를 초기값으로 되돌리고 화면에서 숨김
 */
function closeLinkMenu() {
  linkMenu.visible = false
  linkMenu.mode = 'menu'
  linkMenu.targetType = 'link'
  linkMenu.hasLink = false
  linkMenu.src = ''
}

/**
 * 파싱 요소 id에 해당하는 iframe 내부 미리보기 요소를 조회
 *
 * @param elementId 조회할 파싱 요소 id
 * @returns iframe 내부의 편집 가능 HTMLElement 또는 없으면 null
 */
function getPreviewElement(elementId: string) {
  return previewFrame.value?.contentDocument?.querySelector<HTMLElement>(
    `[data-tcube-editable-id="${elementId}"]`
  ) || null
}

/**
 * 이미지가 링크 내부에 포함되어 있는지 확인하고 부모 anchor 요소를 반환
 *
 * @param element 링크 부모를 찾을 이미지 요소
 * @returns 이미지와 가장 가까운 부모 anchor 요소 또는 없으면 null
 */
function getImageLinkElement(element: HTMLImageElement) {
  return element.closest<HTMLAnchorElement>('a')
}

/**
 * iframe 내부 요소도 안정적으로 판별할 수 있도록 tagName 기준으로 이미지 여부를 확인
 *
 * @param element 이미지 여부를 확인할 DOM 요소
 * @returns img 태그이면 true, 아니면 false
 */
function isImageElement(element: Element | null): element is HTMLImageElement {
  return Boolean(element && element.tagName.toLowerCase() === 'img')
}

/**
 * iframe 내부 요소도 안정적으로 판별할 수 있도록 tagName 기준으로 링크 여부를 확인
 *
 * @param element 링크 여부를 확인할 DOM 요소
 * @returns a 태그이면 true, 아니면 false
 */
function isAnchorElement(element: Element | null): element is HTMLAnchorElement {
  return Boolean(element && element.tagName.toLowerCase() === 'a')
}

/**
 * iframe 클릭 좌표를 미리보기 래퍼 기준의 툴바 표시 좌표로 변환
 *
 * @param event iframe 내부에서 발생한 마우스 이벤트
 * @returns 툴바를 표시할 x, y 좌표
 */
function getPopoverPosition(event: MouseEvent) {
  const frameRect = previewFrame.value?.getBoundingClientRect()
  const wrapRect = previewWrap.value?.getBoundingClientRect()

  if (!frameRect || !wrapRect) {
    return { x: 16, y: 16 }
  }

  return {
    x: Math.min(frameRect.left - wrapRect.left + event.clientX + 12, wrapRect.width - 260),
    y: Math.max(12, frameRect.top - wrapRect.top + event.clientY + 12)
  }
}

/**
 * 특정 요소의 화면 위치를 미리보기 래퍼 기준의 툴바 표시 좌표로 변환
 *
 * @param element 툴바를 배치할 기준 HTMLElement
 * @returns 툴바를 표시할 x, y 좌표
 */
function getPopoverPositionByElement(element: HTMLElement) {
  const elementRect = element.getBoundingClientRect()
  const frameRect = previewFrame.value?.getBoundingClientRect()
  const wrapRect = previewWrap.value?.getBoundingClientRect()

  if (!frameRect || !wrapRect) {
    return { x: 16, y: 16 }
  }

  return {
    x: Math.min(frameRect.left - wrapRect.left + elementRect.left + 12, wrapRect.width - 260),
    y: Math.max(12, frameRect.top - wrapRect.top + elementRect.bottom + 12)
  }
}

/**
 * contenteditable 요소의 커서를 텍스트 끝으로 이동
 *
 * @param element 커서를 이동할 HTMLElement
 */
function placeCaretAtEnd(element: HTMLElement) {
  const selection = element.ownerDocument.getSelection()
  const range = element.ownerDocument.createRange()

  range.selectNodeContents(element)
  range.collapse(false)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

/**
 * 좌측 편집 요소 목록에 표시할 미리보기 문자열을 생성
 *
 * @param element 목록에 표시할 파싱 요소 정보
 * @returns 최대 36자로 줄인 요소 미리보기 문자열
 */
function getElementPreview(element: ParsedHtmlEditableElement) {
  const value = element.type === 'image'
    ? element.alt || element.src || '이미지'
    : element.type === 'link'
      ? element.href || '링크'
    : element.content || '텍스트'

  return value.length > 36 ? `${value.slice(0, 36)}...` : value
}

/**
 * 편집 요소 유형에 맞는 remix icon 클래스를 반환
 *
 * @param element 아이콘을 결정할 파싱 요소 정보
 * @returns 요소 유형에 맞는 아이콘 클래스명
 */
function getElementIcon(element: ParsedHtmlEditableElement) {
  if (element.type === 'image') return 'ri-image-line'
  if (element.type === 'link') return 'ri-link'

  return 'ri-text'
}

/**
 * anchor 내부 구조가 텍스트 직접 편집에 적합한 단순 구조인지 판별
 *
 * @param element 구조를 판별할 anchor 요소
 * @returns 단순 텍스트 링크이면 true, 복잡한 구조이면 false
 */
function isSimpleTextAnchor(element: HTMLAnchorElement) {
  if (element.querySelector('img, picture, svg, video, table')) return false
  if (element.querySelectorAll('div').length > 1) return false

  const elementChildren = Array.from(element.children)

  if (elementChildren.length === 0) return true
  if (elementChildren.length > 2) return false

  return elementChildren.every((child) => {
    const tagName = child.tagName.toLowerCase()
    if (!['span', 'strong', 'em', 'b', 'i', 'small', 'div'].includes(tagName)) return false
    if (child.querySelector('img, picture, svg, video, table, div')) return false

    return Boolean((child.textContent || '').replace(/\s+/g, ' ').trim())
  })
}

watch(previewHtml, () => {
  closeLinkMenu()
})

watch(
  () => builderStore.selectedElementId,
  () => {
    syncPreviewSelection()
  }
)

onMounted(() => {
  document.addEventListener('click', handleOuterDocumentClick)
  document.addEventListener('keydown', handleCloseMenuKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOuterDocumentClick)
  document.removeEventListener('keydown', handleCloseMenuKeydown)
})
</script>
