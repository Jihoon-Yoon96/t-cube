import { generateHtmlFromPdfDesign } from '~/server/services/builder/pdfToHtml'
import type { DesignToHtmlResponse } from '~/types/builder/design-to-html'

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

function isSupportedPdfFile(mimeType = '', fileName = '') {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  return mimeType.toLowerCase() === 'application/pdf' || extension === 'pdf'
}
