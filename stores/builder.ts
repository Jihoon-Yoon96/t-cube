export type BuilderStep =
  | 'start'
  | 'html-upload'
  | 'pdf-image-upload'
  | 'file-upload'
  | 'ai-design'
  | 'editor'
  | 'preview'

export type BuilderViewportMode = 'desktop' | 'tablet' | 'mobile'
export type BuilderUploadFileType = 'HTML' | '이미지' | 'PDF'
export type BuilderDesignMethod = 'layout' | 'ai-prompt'

export const useBuilderStore = defineStore('builder', () => {
  const step = ref<BuilderStep>('start')
  const activeViewport = ref<BuilderViewportMode>('desktop')
  const selectedUploadFileType = ref<BuilderUploadFileType>('HTML')
  const selectedDesignMethod = ref<BuilderDesignMethod | null>(null)
  const selectedElementId = ref<string | null>('headline')
  const dirty = ref(false)
  const currentDocument = ref<Record<string, unknown> | null>(null)
  const importStatus = ref<'idle' | 'ready' | 'importing' | 'complete' | 'error'>('idle')
  const aiStatus = ref<'idle' | 'generating' | 'complete' | 'error'>('idle')

  function setStep(nextStep: BuilderStep) {
    step.value = nextStep
  }

  function setActiveViewport(nextViewport: BuilderViewportMode) {
    activeViewport.value = nextViewport
  }

  function selectUploadFileType(fileType: BuilderUploadFileType) {
    selectedUploadFileType.value = fileType
    step.value = 'file-upload'
  }

  function selectDesignMethod(method: BuilderDesignMethod) {
    selectedDesignMethod.value = method
    step.value = 'ai-design'
  }

  function startEditor() {
    step.value = 'editor'
  }

  function selectElement(elementId: string | null) {
    selectedElementId.value = elementId
  }

  function markDirty(value = true) {
    dirty.value = value
  }

  function setCurrentDocument(document: Record<string, unknown> | null) {
    currentDocument.value = document
  }

  return {
    step,
    activeViewport,
    selectedUploadFileType,
    selectedDesignMethod,
    selectedElementId,
    dirty,
    currentDocument,
    importStatus,
    aiStatus,
    setStep,
    setActiveViewport,
    selectUploadFileType,
    selectDesignMethod,
    startEditor,
    selectElement,
    markDirty,
    setCurrentDocument
  }
})
