import { generateHtmlFromImageDesign } from '~/server/services/builder/imageToHtml'
import type { ImageToHtmlResponse } from '~/types/builder/image-to-html'

export default defineEventHandler(async (event): Promise<ImageToHtmlResponse> => {
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

function isSupportedImageFile(mimeType = '', fileName = '') {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp']

  return mimeType.toLowerCase().startsWith('image/') || imageExtensions.includes(extension)
}
