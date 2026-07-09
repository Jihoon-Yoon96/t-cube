/**
 * 빌더 파일 분석 공개 composable
 * 컴포넌트에서 사용하는 업로드 파일 분석 API 제공
 */
import { useFileAnalysis } from '~/composables/file/useFileAnalysis'

/**
 * 빌더 파일 분석 API 구성
 *
 * @returns 파일 분석 API
 */
export function useBuilderFileAnalysis() {
  const fileAnalysis = useFileAnalysis()

  return {
    analyzeUploadedFile: fileAnalysis.analyzeUploadedFile
  }
}
