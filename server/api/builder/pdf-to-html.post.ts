import { generateHtmlFromPdfDesign } from '~/server/services/builder/pdfToHtml'
import type { DesignToHtmlResponse } from '~/types/builder/design-to-html'

/**
 * PDF 업로드 기반 HTML 생성 요청 처리
 *
 * @param event - PDF multipart form 요청 이벤트
 * @returns PDF 분석 기반 HTML 생성 응답
 */
export default defineEventHandler(async (event): Promise<DesignToHtmlResponse> => {
  const formData = await readMultipartFormData(event)
  const pdfFile = formData?.find((item) => item.name === 'pdf')

  if (!pdfFile?.data.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'PDF 파일을 찾을 수 없습니다.'
    })
  }

  if (!isSupportedPdfFile(pdfFile.type, pdfFile.filename)) {
    throw createError({
      statusCode: 400,
      statusMessage: '지원하지 않는 PDF 파일입니다.'
    })
  }

  return generateHtmlFromPdfDesign({
    pdf: {
      fileName: pdfFile.filename || 'uploaded-design-pdf',
      mimeType: pdfFile.type || 'application/pdf',
      data: pdfFile.data
    }
  })
})

/**
 * 지원 가능한 PDF 파일 여부 확인
 *
 * @param mimeType - 업로드 파일 MIME 타입
 * @param fileName - 업로드 파일명
 * @returns PDF 파일 지원 여부
 */
function isSupportedPdfFile(mimeType = '', fileName = '') {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  return mimeType.toLowerCase() === 'application/pdf' || extension === 'pdf'
}
