/**
 * 빌더 파일 업로드 공개 composable
 * 컴포넌트에서 사용하는 업로드 상태와 업로드 조작 API 제공
 */
import { storeToRefs } from 'pinia'
import { useBuilderNavigationGuard } from '~/composables/navigation/useBuilderNavigationGuard'
import { useBuilderStore } from '~/stores/builder'

/**
 * 빌더 업로드 상태와 조작 API 구성
 *
 * @returns 업로드 상태와 업로드 조작 API
 */
export function useBuilderUpload() {
  const builderStore = useBuilderStore()
  const builderStoreRefs = storeToRefs(builderStore)
  const navigationGuard = useBuilderNavigationGuard()

  return reactive({
    selectedUploadFileType: builderStoreRefs.selectedUploadFileType,
    uploadedFile: builderStoreRefs.uploadedFile,
    uploadedFileSummary: builderStoreRefs.uploadedFileSummary,
    uploadError: builderStoreRefs.uploadError,
    importStatus: builderStoreRefs.importStatus,
    selectUploadFileType: navigationGuard.selectUploadFileType,
    uploadDesignFile: builderStore.uploadDesignFile,
    clearUploadedFile: builderStore.clearUploadedFile,
    cancelFileAnalysis: builderStore.cancelFileAnalysis
  })
}
