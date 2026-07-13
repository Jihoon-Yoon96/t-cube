/**
 * HTML 미리보기 요소 편집 흐름
 * 텍스트, 링크, 이미지, picture, video 편집 상태와 사용자 동작 관리
 */
import type { ComputedRef, Ref } from 'vue'
import type { ParsedHtmlDocument, ParsedHtmlEditableElement } from '~/services/html/parseHtmlDocument'
import type {
  HtmlElementEditPopoverState,
  HtmlInspectorMode
} from '~/types/builder/html-document-editor'
import { useBuilderEditor } from '~/composables/editor/useBuilderEditor'

type HtmlElementEditingOptions = {
  currentDocument: ComputedRef<ParsedHtmlDocument>
  inspectorMode: ComputedRef<HtmlInspectorMode>
  previewFrame: Ref<HTMLIFrameElement | null>
  previewWrap: Ref<HTMLElement | null>
  scrollPreviewElementIntoView: (previewElement: HTMLElement, onScrolled: () => void) => void
}

/**
 * HTML 요소 편집 상태와 동작 구성
 *
 * @param options 현재 문서, iframe 참조와 미리보기 스크롤 API
 * @returns 요소 편집 상태와 이벤트 처리 API
 */
export function useHtmlElementEditing(options: HtmlElementEditingOptions) {
  const builderEditor = useBuilderEditor()
  const imageInput = ref<HTMLInputElement | null>(null)
  const selectedImageElementId = ref('')
  const selectedMediaSourceSelector = ref('')
  const selectedMediaInputType = ref<'image' | 'video'>('image')
  let pendingImageMenuElementId = ''
  const linkMenu = reactive<HtmlElementEditPopoverState>({
    visible: false,
    mode: 'menu',
    targetType: 'link',
    hasLink: false,
    elementId: '',
    href: '',
    mediaSources: [],
    x: 0,
    y: 0
  })

  /**
   * iframe의 편집 가능 요소 클릭 처리
   *
   * @param element 편집 가능 속성이 연결된 iframe 요소
   * @param event iframe 요소 click 이벤트
   * @returns 없음
   */
  function handleEditableElementClick(element: HTMLElement, event: MouseEvent) {
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
      selectPreviewEditableElement(elementId)
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

    if (isMediaElement(element)) {
      openMediaMenu(element, event)
      return
    }

    closeLinkMenu()
  }

  /**
   * iframe 문서의 편집 요소 또는 빈 영역 클릭 처리
   *
   * @param event iframe document click 이벤트
   * @returns 없음
   */
  function handlePreviewDocumentClick(event: MouseEvent) {
    const clickedElement = event.target as HTMLElement | null
    const editableElement = clickedElement?.closest<HTMLElement>('[data-tcube-editable-id]')
    const clickedLink = clickedElement?.closest<HTMLAnchorElement>('a')

    if (isMediaElement(editableElement)) {
      event.preventDefault()
      event.stopPropagation()
      if (editableElement.dataset.tcubeEditableId) {
        selectPreviewEditableElement(editableElement.dataset.tcubeEditableId)
      }
      openMediaMenu(editableElement, event)
      return
    }

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
        selectPreviewEditableElement(editableElement.dataset.tcubeEditableId)
      }
      openImageMenu(editableElement, event)
      return
    }

    closeLinkMenu()
  }

  /**
   * blur 저장으로 iframe이 교체되기 전에 클릭 대상 이미지 id 보관
   *
   * @param event iframe document pointerdown 이벤트
   * @returns 없음
   */
  function handlePreviewImagePointerDown(event: PointerEvent) {
    if (options.inspectorMode.value !== 'elements') {
      pendingImageMenuElementId = ''
      return
    }

    const clickedElement = event.target as HTMLElement | null
    const imageElement = clickedElement?.closest<HTMLImageElement>(
      'img[data-tcube-editable-id][data-tcube-editable-type="image"]'
    )

    pendingImageMenuElementId = imageElement?.dataset.tcubeEditableId || ''
  }

  /**
   * iframe 재로드로 소실된 이미지 클릭 팝오버 복원
   *
   * @returns 없음
   */
  function restorePendingImageMenu() {
    const elementId = pendingImageMenuElementId
    pendingImageMenuElementId = ''

    if (!elementId || options.inspectorMode.value !== 'elements') return

    const previewElement = getPreviewElement(elementId)

    if (!isImageElement(previewElement)) return

    selectPreviewEditableElement(elementId)
    options.scrollPreviewElementIntoView(previewElement, () => {
      if (options.inspectorMode.value !== 'elements') return

      const restoredPreviewElement = getPreviewElement(elementId)

      if (isImageElement(restoredPreviewElement)) {
        openImageMenuAtElement(restoredPreviewElement)
      }
    })
  }

  /**
   * 요소 목록에서 선택한 편집 요소를 미리보기에서 편집
   *
   * @param element 목록에서 선택한 파싱 요소
   * @returns 없음
   */
  function focusEditableElement(element: ParsedHtmlEditableElement) {
    if (options.inspectorMode.value !== 'elements') return

    builderEditor.selectElement(element.id)
    closeLinkMenu()

    const previewElement = getPreviewElement(element.id)

    if (!previewElement) return

    options.scrollPreviewElementIntoView(previewElement, () => {
      if (options.inspectorMode.value !== 'elements') return

      const scrolledPreviewElement = getPreviewElement(element.id)

      if (!scrolledPreviewElement) return

      if (element.type === 'image') {
        if (isImageElement(scrolledPreviewElement)) {
          openImageMenuAtElement(scrolledPreviewElement)
          return
        }

        closeLinkMenu()
        return
      }

      if ((element.type === 'picture' || element.type === 'video') && isMediaElement(scrolledPreviewElement)) {
        openMediaMenuAtElement(scrolledPreviewElement)
        return
      }

      if (element.type === 'link' || element.tagName === 'a') {
        openAnchorToolbarAtElement(scrolledPreviewElement)
        return
      }

      startTextEdit(scrolledPreviewElement)
    })
  }

  /**
   * 미리보기 바깥 영역 클릭 시 편집 팝오버 닫기
   *
   * @param event 상위 document click 이벤트
   * @returns 없음
   */
  function handleOuterDocumentClick(event: MouseEvent) {
    if (!linkMenu.visible) return

    const target = event.target

    if (target instanceof Node && options.previewWrap.value?.contains(target)) return

    closeLinkMenu()
  }

  /**
   * ESC 입력 시 편집 팝오버 닫기
   *
   * @param event document 또는 iframe keydown 이벤트
   * @returns 없음
   */
  function handleCloseMenuKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') closeLinkMenu()
  }

  /**
   * 텍스트 요소를 contenteditable 상태로 전환하고 blur 시 내용 저장
   *
   * @param element 텍스트 수정 대상 iframe 요소
   * @returns 없음
   */
  function startTextEdit(element: HTMLElement) {
    closeLinkMenu()

    const initialContent = element.textContent || ''

    element.contentEditable = 'true'
    element.dataset.tcubeEditing = 'true'
    element.focus()
    placeCaretAtEnd(element)

    /** 텍스트 편집 종료 시 현재 내용을 store에 저장하고 임시 이벤트 해제 */
    const commitEdit = () => {
      const elementId = element.dataset.tcubeEditableId
      const nextContent = element.textContent || ''

      element.contentEditable = 'false'
      delete element.dataset.tcubeEditing

      if (elementId && nextContent !== initialContent) {
        builderEditor.updateCurrentDocumentElement(elementId, {
          content: nextContent
        })
      }

      element.removeEventListener('blur', commitEdit)
      element.removeEventListener('keydown', handleKeydown)
    }

    /**
     * ESC 입력 시 텍스트 편집을 blur로 종료
     *
     * @param event 편집 중인 요소의 keydown 이벤트
     * @returns 없음
     */
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') element.blur()
    }

    element.addEventListener('blur', commitEdit)
    element.addEventListener('keydown', handleKeydown)
  }

  /**
   * 링크 클릭 위치에 편집 팝오버 표시
   *
   * @param element 편집할 anchor 요소
   * @param event 위치 계산에 사용할 마우스 이벤트
   * @param targetType 링크 내부 편집 대상 유형
   * @returns 없음
   */
  function openLinkMenu(
    element: HTMLAnchorElement,
    event: MouseEvent,
    targetType: 'link' | 'text' | 'image' = 'text'
  ) {
    const elementId = element.dataset.tcubeEditableId

    if (!elementId) return

    const position = getPopoverPosition(event)

    linkMenu.visible = true
    linkMenu.mode = 'menu'
    linkMenu.targetType = targetType
    linkMenu.elementId = elementId
    linkMenu.href = element.getAttribute('href') || ''
    linkMenu.x = position.x
    linkMenu.y = position.y
  }

  /**
   * 링크 요소 위치에 편집 팝오버 표시
   *
   * @param element 편집할 anchor 요소
   * @param targetType 링크 내부 편집 대상 유형
   * @returns 없음
   */
  function openLinkMenuAtElement(
    element: HTMLAnchorElement,
    targetType: 'link' | 'text' | 'image' = 'text'
  ) {
    const elementId = element.dataset.tcubeEditableId

    if (!elementId) return

    const position = getPopoverPositionByElement(element)

    linkMenu.visible = true
    linkMenu.mode = 'menu'
    linkMenu.targetType = targetType
    linkMenu.elementId = elementId
    linkMenu.href = element.getAttribute('href') || ''
    linkMenu.x = position.x
    linkMenu.y = position.y
  }

  /**
   * anchor 내부 구조에 맞는 링크, 텍스트 또는 미디어 편집 팝오버 표시
   *
   * @param anchorElement 클릭 대상과 연결된 anchor 요소
   * @param clickedElement 실제 클릭된 요소
   * @param event 위치 계산에 사용할 마우스 이벤트
   * @returns 없음
   */
  function openAnchorToolbar(anchorElement: HTMLAnchorElement, clickedElement: HTMLElement, event: MouseEvent) {
    const imageElement = clickedElement.closest<HTMLImageElement>('img[data-tcube-editable-id]')
      || anchorElement.querySelector<HTMLImageElement>('img[data-tcube-editable-id]')

    if (imageElement) {
      if (imageElement.dataset.tcubeEditableId) {
        selectPreviewEditableElement(imageElement.dataset.tcubeEditableId)
      }
      openImageMenu(imageElement, event)
      return
    }

    const mediaElement = clickedElement.closest<HTMLElement>('[data-tcube-editable-type="picture"], [data-tcube-editable-type="video"]')
      || anchorElement.querySelector<HTMLElement>('[data-tcube-editable-type="picture"], [data-tcube-editable-type="video"]')

    if (isMediaElement(mediaElement)) {
      if (mediaElement.dataset.tcubeEditableId) {
        selectPreviewEditableElement(mediaElement.dataset.tcubeEditableId)
      }
      openMediaMenu(mediaElement, event)
      return
    }

    const targetType = isSimpleTextAnchor(anchorElement) ? 'text' : 'link'
    const elementId = anchorElement.dataset.tcubeEditableId

    if (elementId) {
      selectPreviewEditableElement(elementId)
      openLinkMenu(anchorElement, event, targetType)
    }
  }

  /**
   * 미리보기 요소 위치에 anchor 편집 팝오버 표시
   *
   * @param element anchor 또는 anchor 하위 미리보기 요소
   * @returns 없음
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
   * 이미지 클릭 위치에 이미지 편집 팝오버 표시
   *
   * @param element 편집할 이미지 요소
   * @param event 위치 계산에 사용할 마우스 이벤트
   * @returns 없음
   */
  function openImageMenu(element: HTMLImageElement, event: MouseEvent) {
    const elementId = element.dataset.tcubeEditableId
    const linkElement = element.closest<HTMLAnchorElement>('a')

    if (!elementId) return

    pendingImageMenuElementId = ''

    const position = getPopoverPosition(event)

    setMediaMenuState(elementId, 'image', linkElement, position)
  }

  /**
   * 이미지 요소 위치에 이미지 편집 팝오버 표시
   *
   * @param element 편집할 이미지 요소
   * @returns 없음
   */
  function openImageMenuAtElement(element: HTMLImageElement) {
    const elementId = element.dataset.tcubeEditableId
    const linkElement = element.closest<HTMLAnchorElement>('a')

    if (!elementId) return

    pendingImageMenuElementId = ''
    setMediaMenuState(elementId, 'image', linkElement, getPopoverPositionByElement(element))
  }

  /**
   * picture 또는 video 클릭 위치에 미디어 편집 팝오버 표시
   *
   * @param element 편집할 미디어 요소
   * @param event 위치 계산에 사용할 마우스 이벤트
   * @returns 없음
   */
  function openMediaMenu(element: HTMLPictureElement | HTMLVideoElement, event: MouseEvent) {
    const elementId = element.dataset.tcubeEditableId
    const linkElement = element.closest<HTMLAnchorElement>('a')

    if (!elementId) return

    const targetType = element.tagName.toLowerCase() === 'picture' ? 'picture' : 'video'

    setMediaMenuState(elementId, targetType, linkElement, getPopoverPosition(event))
  }

  /**
   * picture 또는 video 요소 위치에 미디어 편집 팝오버 표시
   *
   * @param element 편집할 미디어 요소
   * @returns 없음
   */
  function openMediaMenuAtElement(element: HTMLPictureElement | HTMLVideoElement) {
    const elementId = element.dataset.tcubeEditableId
    const linkElement = element.closest<HTMLAnchorElement>('a')

    if (!elementId) return

    const targetType = element.tagName.toLowerCase() === 'picture' ? 'picture' : 'video'

    setMediaMenuState(elementId, targetType, linkElement, getPopoverPositionByElement(element))
  }

  /**
   * 이미지 또는 미디어 편집 팝오버 공통 상태 설정
   *
   * @param elementId 편집 요소 id
   * @param targetType 편집 대상 유형
   * @param linkElement 연결된 anchor 요소
   * @param position 팝오버 표시 위치
   * @returns 없음
   */
  function setMediaMenuState(
    elementId: string,
    targetType: 'image' | 'picture' | 'video',
    linkElement: HTMLAnchorElement | null,
    position: { x: number, y: number }
  ) {
    linkMenu.visible = true
    linkMenu.mode = 'menu'
    linkMenu.targetType = targetType
    linkMenu.hasLink = Boolean(linkElement)
    linkMenu.elementId = elementId
    linkMenu.href = linkElement?.getAttribute('href') || ''
    linkMenu.x = position.x
    linkMenu.y = position.y
  }

  /** 선택 미디어의 URL 및 업로드 편집 화면 열기 */
  function openSelectedMediaSrcEdit() {
    linkMenu.mediaSources = getMediaSources(linkMenu.elementId)
    linkMenu.mode = 'media-src'
    nextTick(() => {
      options.previewWrap.value?.querySelector<HTMLInputElement>('.html-media-source-input')?.focus()
    })
  }

  /**
   * 미디어 source 파일 선택 창 열기
   *
   * @param mediaSourceSelector 업로드 대상 source selector
   * @returns 없음
   */
  function openMediaSourcePicker(mediaSourceSelector: string) {
    selectedImageElementId.value = linkMenu.elementId
    selectedMediaSourceSelector.value = mediaSourceSelector
    selectedMediaInputType.value = linkMenu.targetType === 'video' ? 'video' : 'image'
    imageInput.value?.click()
  }

  /**
   * 팝오버의 미디어 source 주소 변경
   *
   * @param mediaSourceSelector 수정할 source selector
   * @param src 변경한 source 주소
   * @returns 없음
   */
  function updateLinkMenuMediaSource(mediaSourceSelector: string, src: string) {
    const mediaSource = linkMenu.mediaSources.find((source) => source.selector === mediaSourceSelector)

    if (mediaSource) mediaSource.src = src
  }

  /** media source URL 수정 내용을 iframe과 문서 모델에 반영 */
  function applySelectedMediaSources() {
    const editableElement = getEditableElement(linkMenu.elementId)

    if (!editableElement) return

    const mediaSources = linkMenu.mediaSources.map((mediaSource) => ({ ...mediaSource }))
    const frameDocument = options.previewFrame.value?.contentDocument

    mediaSources.forEach((mediaSource) => {
      frameDocument?.querySelector<HTMLElement>(mediaSource.selector)?.setAttribute(mediaSource.attribute, mediaSource.src)
    })

    if (editableElement.type === 'image') {
      builderEditor.updateCurrentDocumentElement(linkMenu.elementId, { src: mediaSources[0]?.src || '' })
      closeLinkMenu()
      return
    }

    if (editableElement.type !== 'picture' && editableElement.type !== 'video') return

    builderEditor.updateCurrentDocumentElement(linkMenu.elementId, { mediaSources })
    closeLinkMenu()
  }

  /** 선택 링크 요소를 텍스트 직접 편집 상태로 전환 */
  function startSelectedLinkTextEdit() {
    const element = getPreviewElement(linkMenu.elementId)

    if (element) startTextEdit(element)
  }

  /** 선택 링크의 href 입력 화면 열기 */
  function openSelectedLinkHrefEdit() {
    linkMenu.mode = 'href'
    nextTick(() => {
      const input = options.previewWrap.value?.querySelector<HTMLInputElement>('.html-link-edit-popover input')

      input?.focus()
      input?.select()
    })
  }

  /** 선택 링크의 href를 iframe과 문서 모델에 반영 */
  function applySelectedLinkHref() {
    const previewElement = getPreviewElement(linkMenu.elementId)
    const linkElement = isAnchorElement(previewElement)
      ? previewElement
      : previewElement?.closest('a')

    if (isAnchorElement(linkElement)) {
      linkElement.setAttribute('href', linkMenu.href)
    }

    builderEditor.updateCurrentDocumentElement(linkMenu.elementId, {
      href: linkMenu.href
    })
    closeLinkMenu()
  }

  /**
   * 선택 파일을 data URL로 읽어 iframe과 문서 모델에 반영
   *
   * @param event 파일 input change 이벤트
   * @returns 없음
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

      if (selectedMediaSourceSelector.value) {
        const editableElement = getEditableElement(elementId)

        if (editableElement?.type === 'picture' || editableElement?.type === 'video') {
          const mediaSources = (editableElement.mediaSources || []).map((mediaSource) => {
            return mediaSource.selector === selectedMediaSourceSelector.value
              ? { ...mediaSource, src }
              : mediaSource
          })
          const mediaSource = mediaSources.find((source) => source.selector === selectedMediaSourceSelector.value)

          if (mediaSource) {
            options.previewFrame.value?.contentDocument
              ?.querySelector<HTMLElement>(mediaSource.selector)
              ?.setAttribute(mediaSource.attribute, src)
            builderEditor.updateCurrentDocumentElement(elementId, { mediaSources })
            linkMenu.mediaSources = mediaSources.map((source) => ({ ...source }))
          }

          selectedMediaSourceSelector.value = ''
          input.value = ''
          return
        }
      }

      if (isImageElement(imageElement)) imageElement.src = src

      builderEditor.updateCurrentDocumentElement(elementId, { src })
      linkMenu.mediaSources = linkMenu.mediaSources.map((mediaSource) => {
        return mediaSource.selector === selectedMediaSourceSelector.value
          ? { ...mediaSource, src }
          : mediaSource
      })
      selectedMediaSourceSelector.value = ''
      input.value = ''
    }

    reader.readAsDataURL(file)
  }

  /** 링크와 미디어 편집 팝오버 상태 초기화 */
  function closeLinkMenu() {
    linkMenu.visible = false
    linkMenu.mode = 'menu'
    linkMenu.targetType = 'link'
    linkMenu.hasLink = false
    linkMenu.href = ''
    linkMenu.mediaSources = []
  }

  /** pending 이미지 선택과 편집 팝오버 상태 초기화 */
  function resetElementEditing() {
    pendingImageMenuElementId = ''
    closeLinkMenu()
  }

  /**
   * 편집 요소 id로 현재 문서 모델 조회
   *
   * @param elementId 편집 요소 id
   * @returns 편집 요소 모델 또는 null
   */
  function getEditableElement(elementId: string) {
    return options.currentDocument.value.elements.find((element) => element.id === elementId) || null
  }

  /**
   * 편집 요소의 URL 수정용 source 목록 복제
   *
   * @param elementId 편집 요소 id
   * @returns URL 편집에 사용할 source 목록
   */
  function getMediaSources(elementId: string) {
    const editableElement = getEditableElement(elementId)

    if (editableElement?.type === 'image') {
      return [{
        selector: editableElement.selector,
        label: 'IMG',
        attribute: 'src' as const,
        src: editableElement.src || '',
        originalSrc: editableElement.originalSrc || ''
      }]
    }

    if (editableElement?.type !== 'picture' && editableElement?.type !== 'video') return []

    return (editableElement.mediaSources || []).map((mediaSource) => ({ ...mediaSource }))
  }

  /**
   * 편집 요소 id에 해당하는 iframe 요소 조회
   *
   * @param elementId 편집 요소 id
   * @returns iframe 편집 요소 또는 null
   */
  function getPreviewElement(elementId: string) {
    return options.previewFrame.value?.contentDocument?.querySelector<HTMLElement>(
      `[data-tcube-editable-id="${elementId}"]`
    ) || null
  }

  /**
   * 편집 요소 선택
   *
   * @param elementId 선택할 편집 요소 id
   * @returns 없음
   */
  function selectPreviewEditableElement(elementId: string) {
    builderEditor.selectElement(elementId)
  }

  /**
   * iframe 요소의 이미지 여부 확인
   *
   * @param element 확인할 DOM 요소
   * @returns img 태그이면 true
   */
  function isImageElement(element: Element | null): element is HTMLImageElement {
    return Boolean(element && element.tagName.toLowerCase() === 'img')
  }

  /**
   * iframe 요소의 picture 또는 video 여부 확인
   *
   * @param element 확인할 DOM 요소
   * @returns picture 또는 video 태그이면 true
   */
  function isMediaElement(element: Element | null): element is HTMLPictureElement | HTMLVideoElement {
    const tagName = element?.tagName.toLowerCase()

    return tagName === 'picture' || tagName === 'video'
  }

  /**
   * iframe 요소의 anchor 여부 확인
   *
   * @param element 확인할 DOM 요소
   * @returns a 태그이면 true
   */
  function isAnchorElement(element: Element | null): element is HTMLAnchorElement {
    return Boolean(element && element.tagName.toLowerCase() === 'a')
  }

  /**
   * iframe 클릭 좌표를 미리보기 기준 팝오버 좌표로 변환
   *
   * @param event iframe 마우스 이벤트
   * @returns 팝오버 x, y 좌표
   */
  function getPopoverPosition(event: MouseEvent) {
    const frameRect = options.previewFrame.value?.getBoundingClientRect()
    const wrapRect = options.previewWrap.value?.getBoundingClientRect()

    if (!frameRect || !wrapRect) return { x: 16, y: 16 }

    return {
      x: Math.min(frameRect.left - wrapRect.left + event.clientX + 12, wrapRect.width - 260),
      y: Math.max(12, frameRect.top - wrapRect.top + event.clientY + 12)
    }
  }

  /**
   * iframe 요소 위치를 미리보기 기준 팝오버 좌표로 변환
   *
   * @param element 팝오버 기준 요소
   * @returns 팝오버 x, y 좌표
   */
  function getPopoverPositionByElement(element: HTMLElement) {
    const elementRect = element.getBoundingClientRect()
    const frameRect = options.previewFrame.value?.getBoundingClientRect()
    const wrapRect = options.previewWrap.value?.getBoundingClientRect()

    if (!frameRect || !wrapRect) return { x: 16, y: 16 }

    return {
      x: Math.min(frameRect.left - wrapRect.left + elementRect.left + 12, wrapRect.width - 260),
      y: Math.max(12, frameRect.top - wrapRect.top + elementRect.bottom + 12)
    }
  }

  /**
   * contenteditable 커서를 텍스트 끝으로 이동
   *
   * @param element 커서를 이동할 요소
   * @returns 없음
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
   * anchor가 텍스트 직접 편집에 적합한 단순 구조인지 확인
   *
   * @param element 구조를 확인할 anchor 요소
   * @returns 단순 텍스트 링크이면 true
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

  return {
    imageInput,
    linkMenu,
    selectedMediaInputType,
    applySelectedLinkHref,
    applySelectedMediaSources,
    closeLinkMenu,
    focusEditableElement,
    getPreviewElement,
    handleCloseMenuKeydown,
    handleEditableElementClick,
    handleImageInputChange,
    handleOuterDocumentClick,
    handlePreviewDocumentClick,
    handlePreviewImagePointerDown,
    openMediaSourcePicker,
    openSelectedLinkHrefEdit,
    openSelectedMediaSrcEdit,
    resetElementEditing,
    restorePendingImageMenu,
    startSelectedLinkTextEdit,
    updateLinkMenuMediaSource
  }
}
