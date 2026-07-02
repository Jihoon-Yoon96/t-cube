<template>
  <section class="html-editor-screen">
    <div
      v-if="currentDocument"
      class="html-editor-layout"
      :class="{ 'show-element-list': showElementList }"
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
          @click="builderStore.selectElement(element.id)"
        >
          <TcubeIcon :icon="element.type === 'image' ? 'ri-image-line' : 'ri-text'" />
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
              <button type="button" @click.stop="startSelectedLinkTextEdit">
                <TcubeIcon icon="ri-text" />
                <span>텍스트 수정</span>
              </button>
              <button type="button" @click.stop="openSelectedLinkHrefEdit">
                <TcubeIcon icon="ri-link" />
                <span>링크 수정</span>
              </button>
            </template>

            <template v-else>
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
const showElementList = ref(false)
const linkMenu = reactive({
  visible: false,
  mode: 'menu' as 'menu' | 'href',
  elementId: '',
  href: '',
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
      const clickedLink = clickedElement.closest<HTMLAnchorElement>('a[data-tcube-editable-id]')
      const elementId = element.dataset.tcubeEditableId

      if (clickedLink) {
        const linkElementId = clickedLink.dataset.tcubeEditableId

        if (linkElementId) {
          builderStore.selectElement(linkElementId)
          openLinkMenu(clickedLink, event)
        }
        return
      }

      if (elementId) {
        builderStore.selectElement(elementId)
      }

      if (element.dataset.tcubeEditableType === 'text') {
        startTextEdit(element)
        return
      }

      closeLinkMenu()
    })
  })

  syncPreviewSelection()
}

function handlePreviewDocumentClick() {
  closeLinkMenu()
}

function handleOuterDocumentClick(event: MouseEvent) {
  if (!linkMenu.visible) return

  const target = event.target

  if (target instanceof Node && previewWrap.value?.contains(target)) return

  closeLinkMenu()
}

function handleCloseMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeLinkMenu()
  }
}

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

function startTextEdit(element: HTMLElement) {
  closeLinkMenu()

  element.contentEditable = 'true'
  element.dataset.tcubeEditing = 'true'
  element.focus()
  placeCaretAtEnd(element)

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

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      element.blur()
    }
  }

  element.addEventListener('blur', commitEdit)
  element.addEventListener('keydown', handleKeydown)
}

function openLinkMenu(element: HTMLAnchorElement, event: MouseEvent) {
  const elementId = element.dataset.tcubeEditableId

  if (!elementId) return

  const position = getPopoverPosition(event)

  linkMenu.visible = true
  linkMenu.mode = 'menu'
  linkMenu.elementId = elementId
  linkMenu.href = element.getAttribute('href') || ''
  linkMenu.x = position.x
  linkMenu.y = position.y
}

function startSelectedLinkTextEdit() {
  const element = getPreviewElement(linkMenu.elementId)

  if (element) {
    startTextEdit(element)
  }
}

function openSelectedLinkHrefEdit() {
  linkMenu.mode = 'href'
  nextTick(() => {
    const input = previewWrap.value?.querySelector<HTMLInputElement>('.html-link-edit-popover input')
    input?.focus()
    input?.select()
  })
}

function applySelectedLinkHref() {
  const linkElement = getPreviewElement(linkMenu.elementId)

  if (linkElement instanceof HTMLAnchorElement) {
    linkElement.setAttribute('href', linkMenu.href)
  }

  builderStore.updateCurrentDocumentElement(linkMenu.elementId, {
    href: linkMenu.href
  })
  closeLinkMenu()
}

function closeLinkMenu() {
  linkMenu.visible = false
  linkMenu.mode = 'menu'
}

function getPreviewElement(elementId: string) {
  return previewFrame.value?.contentDocument?.querySelector<HTMLElement>(
    `[data-tcube-editable-id="${elementId}"]`
  ) || null
}

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

function placeCaretAtEnd(element: HTMLElement) {
  const selection = element.ownerDocument.getSelection()
  const range = element.ownerDocument.createRange()

  range.selectNodeContents(element)
  range.collapse(false)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

function getElementPreview(element: ParsedHtmlEditableElement) {
  const value = element.type === 'image'
    ? element.alt || element.src || '이미지'
    : element.content || '텍스트'

  return value.length > 36 ? `${value.slice(0, 36)}...` : value
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
