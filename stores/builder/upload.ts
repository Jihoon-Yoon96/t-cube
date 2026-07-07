/**
 * 템플릿 생성을 위한 파일 업로드 유형, 파일 검증, 업로드 상태를 관리
 */


import type { BuilderView, BuilderUploadFileType, BuilderUploadedFileSummary } from './type/types'

/**
 * 파일 업로드 상태 구성
 * 선택 파일 유형, 업로드 파일, 분석 상태 관리
 *
 * @param currentView 현재 빌더 화면 ref
 * @returns 파일 업로드 상태와 분석 상태 변경 API
 */
export function useBuilderUploadState(currentView: Ref<BuilderView>) {
  const selectedUploadFileType = ref<BuilderUploadFileType>('HTML')
  const uploadedFile = shallowRef<File | null>(null)
  const uploadError = ref('')
  const importStatus = ref<'idle' | 'ready' | 'importing' | 'complete' | 'error'>('idle')

  /**
   * 업로드 파일 요약 정보
   *
   * @returns 업로드 파일이 있으면 파일명/크기/형식/확장자, 없으면 null
   */
  const uploadedFileSummary = computed<BuilderUploadedFileSummary | null>(() => {
    if (!uploadedFile.value) return null

    return {
      name: uploadedFile.value.name,
      size: uploadedFile.value.size,
      type: uploadedFile.value.type,
      extension: getFileExtension(uploadedFile.value.name)
    }
  })

  /**
   * 업로드 파일 유형 선택
   * 기존 업로드 파일 초기화 및 파일 업로드 화면 진입
   *
   * @param fileType 선택할 업로드 파일 유형
   */
  function selectUploadFileType(fileType: BuilderUploadFileType) {
    selectedUploadFileType.value = fileType
    clearUploadedFile()
    currentView.value = 'file-upload'
  }

  /**
   * 디자인 파일 업로드
   * 선택된 파일 유형에 맞는 확장자와 MIME 검증
   *
   * @param file 업로드할 파일
   * @returns 업로드 성공 여부
   */
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

  /**
   * 업로드 파일 상태 초기화
   */
  function clearUploadedFile() {
    uploadedFile.value = null
    uploadError.value = ''
    importStatus.value = 'idle'
  }

  /**
   * 파일 분석 시작
   * 업로드 파일이 없으면 분석 에러 상태 설정
   *
   * @returns 분석 시작 가능 여부
   */
  function startFileAnalysis() {
    if (!uploadedFile.value) {
      uploadError.value = '분석을 시작하려면 먼저 파일을 업로드해주세요.'
      importStatus.value = 'error'
      return false
    }

    uploadError.value = ''
    importStatus.value = 'importing'
    return true
  }

  /**
   * 파일 분석 완료 상태 변경
   */
  function completeFileAnalysis() {
    uploadError.value = ''
    importStatus.value = 'complete'
  }

  /**
   * 파일 분석 실패 상태 변경
   *
   * @param message 표시할 실패 메시지
   */
  function failFileAnalysis(message: string) {
    uploadError.value = message
    importStatus.value = 'error'
  }

  /**
   * 파일 분석 취소 상태 변경
   * 업로드 파일 존재 여부에 따라 ready 또는 idle 상태 복구
   */
  function cancelFileAnalysis() {
    uploadError.value = ''
    importStatus.value = uploadedFile.value ? 'ready' : 'idle'
  }

  /**
   * 업로드 파일 유효성 검증
   *
   * @param file 검증할 파일
   * @returns 검증 실패 메시지, 성공 시 빈 문자열
   */
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

  /**
   * 파일 확장자 추출
   *
   * @param fileName 확장자를 추출할 파일명
   * @returns 소문자 확장자, 확장자가 없으면 빈 문자열
   */
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
    startFileAnalysis,
    completeFileAnalysis,
    failFileAnalysis,
    cancelFileAnalysis
  }
}

