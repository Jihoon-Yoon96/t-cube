/**
 * 빌더 HTML 생성 공개 composable
 * 컴포넌트에서 사용하는 디자인 시안 HTML 생성/취소 API 제공
 */
import { useDesignToHtml } from '~/composables/html/useDesignToHtml'

/**
 * 빌더 HTML 생성 API 구성
 *
 * @returns 이미지/PDF HTML 생성과 취소 API
 */
export function useBuilderHtmlGeneration() {
  const designToHtml = useDesignToHtml()

  return {
    generateHtmlFromUploadedImage: designToHtml.generateHtmlFromUploadedImage,
    generateHtmlFromUploadedPdf: designToHtml.generateHtmlFromUploadedPdf,
    cancelDesignHtmlGeneration: designToHtml.cancelDesignHtmlGeneration,
    cancelImageHtmlGeneration: designToHtml.cancelImageHtmlGeneration,
    cancelPdfHtmlGeneration: designToHtml.cancelPdfHtmlGeneration
  }
}
