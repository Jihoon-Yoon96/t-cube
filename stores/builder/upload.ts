/**
 * 템플릿 생성을 위한 파일 업로드 유형, 파일 검증, 업로드 상태를 관리
 */


import type { BuilderStep, BuilderUploadFileType, BuilderUploadedFileSummary } from './type/types'

export function useBuilderUploadState(step: Ref<BuilderStep>) {
  const selectedUploadFileType = ref<BuilderUploadFileType>('HTML')
  const uploadedFile = shallowRef<File | null>(null)
  const uploadError = ref('')
  const importStatus = ref<'idle' | 'ready' | 'importing' | 'complete' | 'error'>('idle')

  const uploadedFileSummary = computed<BuilderUploadedFileSummary | null>(() => {
    if (!uploadedFile.value) return null

    return {
      name: uploadedFile.value.name,
      size: uploadedFile.value.size,
      type: uploadedFile.value.type,
      extension: getFileExtension(uploadedFile.value.name)
    }
  })

  function selectUploadFileType(fileType: BuilderUploadFileType) {
    selectedUploadFileType.value = fileType
    clearUploadedFile()
    step.value = 'file-upload'
  }

  function uploadDesignFile(file: File) {
    const error = validateUploadFile(file)

    if (error) {
      uploadedFile.value = null
      uploadError.value = error
      importStatus.value = 'error'
      return false
    }

    uploadedFile.value = file
    uploadError.value = ''
    importStatus.value = 'ready'
    return true
  }

  function clearUploadedFile() {
    uploadedFile.value = null
    uploadError.value = ''
    importStatus.value = 'idle'
  }

  function startFileAnalysis() {
    if (!uploadedFile.value) {
      uploadError.value = '분석을 시작하려면 먼저 파일을 업로드해주세요.'
      importStatus.value = 'error'
      return
    }

    uploadError.value = ''
    importStatus.value = 'importing'
  }

  function validateUploadFile(file: File) {
    const extension = getFileExtension(file.name)
    const mimeType = file.type.toLowerCase()

    if (selectedUploadFileType.value === 'HTML') {
      if (extension === 'html' || extension === 'htm' || mimeType === 'text/html') return ''
      return 'HTML 파일만 업로드할 수 있습니다. .html 또는 .htm 파일을 선택해주세요.'
    }

    if (selectedUploadFileType.value === '이미지') {
      const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp']
      if (mimeType.startsWith('image/') || imageExtensions.includes(extension)) return ''
      return '이미지 파일만 업로드할 수 있습니다. PNG, JPG, JPEG, WEBP 등의 이미지 파일을 선택해주세요.'
    }

    if (extension === 'pdf' || mimeType === 'application/pdf') return ''
    return 'PDF 파일만 업로드할 수 있습니다. .pdf 파일을 선택해주세요.'
  }

  function getFileExtension(fileName: string) {
    const extension = fileName.split('.').pop()
    return extension ? extension.toLowerCase() : ''
  }

  return {
    selectedUploadFileType,
    uploadedFile,
    uploadedFileSummary,
    uploadError,
    importStatus,
    selectUploadFileType,
    uploadDesignFile,
    clearUploadedFile,
    startFileAnalysis
  }
}
