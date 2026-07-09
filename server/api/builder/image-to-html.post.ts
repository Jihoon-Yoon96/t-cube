import { generateHtmlFromImageDesign } from '~/server/services/builder/imageToHtml'
import type { DesignToHtmlResponse } from '~/types/builder/design-to-html'

/**
 * 이미지 업로드 기반 HTML 생성 요청 처리
 *
 * @param event - 이미지 multipart form 요청 이벤트
 * @returns 이미지 분석 기반 HTML 생성 응답
 */
export default defineEventHandler(async (event): Promise<DesignToHtmlResponse> => {
  const formData = await readMultipartFormData(event)
  const imageFile = formData?.find((item) => item.name === 'image')

  if (!imageFile?.data.length) {
    throw createError({
      statusCode: 400,
      statusMessage: '이미지 파일을 찾을 수 없습니다.'
    })
  }

  if (!isSupportedImageFile(imageFile.type, imageFile.filename)) {
    throw createError({
      statusCode: 400,
      statusMessage: '지원하지 않는 이미지 파일입니다.'
    })
  }

  return generateHtmlFromImageDesign({
    image: {
      fileName: imageFile.filename || 'uploaded-design-image',
      mimeType: imageFile.type || 'application/octet-stream',
      data: imageFile.data
    }
  })
})

/**
 * 지원 가능한 이미지 파일 여부 확인
 *
 * @param mimeType - 업로드 파일 MIME 타입
 * @param fileName - 업로드 파일명
 * @returns 이미지 파일 지원 여부
 */
function isSupportedImageFile(mimeType = '', fileName = '') {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp']

  return mimeType.toLowerCase().startsWith('image/') || imageExtensions.includes(extension)
}
