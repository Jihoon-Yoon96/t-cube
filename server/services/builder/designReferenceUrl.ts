import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const MAX_REFERENCE_BYTES = 600_000
const MAX_REFERENCE_TEXT_LENGTH = 16_000
const MAX_REDIRECTS = 3

/**
 * 공개 웹 URL의 HTML을 가져와 AI 톤앤매너 분석용 자료로 정리
 *
 * @param referenceUrl 사용자 입력 참고 URL
 * @returns 페이지 메타데이터, 스타일과 화면 텍스트 요약
 */
export async function fetchDesignReferenceAnalysis(referenceUrl: string) {
  try {
    const html = await fetchPublicHtml(new URL(referenceUrl))

    return extractReferencePageData(html)
  } catch (error) {
    if (isPublicFetchError(error)) throw error

    throw createError({
      statusCode: 422,
      statusMessage: '참고 URL을 분석할 수 없습니다. 공개적으로 접근 가능한 URL인지 확인해주세요.'
    })
  }
}

/**
 * 리디렉션 목적지를 포함해 공개 주소만 검증하며 HTML 조회
 *
 * @param initialUrl 최초 요청 URL
 * @returns 제한된 크기의 HTML 문자열
 */
async function fetchPublicHtml(initialUrl: URL) {
  let currentUrl = initialUrl

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertPublicUrl(currentUrl)

    const response = await fetch(currentUrl, {
      redirect: 'manual',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'T-CUBE-DesignReference/1.0'
      },
      signal: AbortSignal.timeout(8000)
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')

      if (!location || redirectCount === MAX_REDIRECTS) break
      currentUrl = new URL(location, currentUrl)
      continue
    }

    if (!response.ok) {
      throw createError({
        statusCode: 422,
        statusMessage: `참고 URL 응답을 불러올 수 없습니다. (${response.status})`
      })
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() || ''

    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw createError({ statusCode: 422, statusMessage: '참고 URL이 HTML 웹페이지가 아닙니다.' })
    }

    return readLimitedResponseText(response)
  }

  throw createError({ statusCode: 422, statusMessage: '참고 URL의 리디렉션이 너무 많습니다.' })
}

/**
 * URL과 DNS 조회 결과가 내부 네트워크를 가리키지 않는지 검증
 *
 * @param url 검증할 URL
 */
async function assertPublicUrl(url: URL) {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw createError({ statusCode: 400, statusMessage: '공개 HTTP 또는 HTTPS URL만 사용할 수 있습니다.' })
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw createError({ statusCode: 400, statusMessage: '내부 네트워크 URL은 사용할 수 없습니다.' })
  }

  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true })

  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw createError({ statusCode: 400, statusMessage: '내부 네트워크 URL은 사용할 수 없습니다.' })
  }
}

/**
 * IPv4 및 IPv6 주소의 사설·로컬·예약 대역 여부 확인
 *
 * @param address DNS 조회 IP 주소
 * @returns 외부 접근용으로 허용하지 않는 주소이면 true
 */
function isPrivateAddress(address: string) {
  const normalizedAddress = address.toLowerCase()

  if (normalizedAddress.includes(':')) {
    if (normalizedAddress === '::' || normalizedAddress === '::1') return true
    if (/^(fc|fd|fe[89ab])/.test(normalizedAddress)) return true
    if (normalizedAddress.includes('::ffff:') && !normalizedAddress.includes('.')) return true

    const mappedIpv4 = normalizedAddress.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1]
    return mappedIpv4 ? isPrivateAddress(mappedIpv4) : false
  }

  const octets = normalizedAddress.split('.').map(Number)

  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return true

  const [first, second] = octets
  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19))
    || first >= 224
}

/**
 * 응답 본문을 최대 허용 바이트까지만 읽어 문자열로 변환
 *
 * @param response 참고 페이지 HTTP 응답
 * @returns UTF-8 HTML 문자열
 */
async function readLimitedResponseText(response: Response) {
  if (!response.body) return ''

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()

    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_REFERENCE_BYTES) {
      await reader.cancel()
      break
    }
    chunks.push(value)
  }

  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))))
}

/**
 * HTML에서 제목, 메타, CSS와 화면 텍스트를 AI 참고 자료로 추출
 *
 * @param html 참고 페이지 HTML
 * @returns 구조화된 텍스트 자료
 */
function extractReferencePageData(html: string) {
  const title = readTagText(html, 'title')
  const description = readMetaContent(html, 'description')
  const socialTitle = readMetaContent(html, 'og:title')
  const socialDescription = readMetaContent(html, 'og:description')
  const themeColor = readMetaContent(html, 'theme-color')
  const stylesheetLinks = (html.match(/<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi) || [])
    .map((tag) => tag.match(/href=["']([^"']+)["']/i)?.[1] || '')
    .filter(Boolean)
    .slice(0, 20)
    .join('\n')
  const classNames = Array.from(html.matchAll(/\sclass=["']([^"']+)["']/gi))
    .map((match) => match[1])
    .slice(0, 160)
    .join(' ')
    .slice(0, 3000)
  const styles = Array.from(html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
    .map((match) => match[1])
    .join('\n')
    .replace(/\s+/g, ' ')
    .slice(0, 6000)
  const inlineStyles = Array.from(html.matchAll(/\sstyle=["']([^"']+)["']/gi))
    .map((match) => match[1])
    .slice(0, 120)
    .join('\n')
    .slice(0, 4000)
  const visibleText = decodeHtmlEntities(html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000)
  const result = [
    title && `페이지 제목: ${title}`,
    description && `설명: ${description}`,
    socialTitle && `공유 제목: ${socialTitle}`,
    socialDescription && `공유 설명: ${socialDescription}`,
    themeColor && `테마 컬러: ${themeColor}`,
    stylesheetLinks && `스타일시트 경로: ${stylesheetLinks}`,
    classNames && `화면 요소 클래스 일부: ${classNames}`,
    styles && `페이지 CSS 일부: ${styles}`,
    inlineStyles && `인라인 스타일 일부: ${inlineStyles}`,
    visibleText && `화면 텍스트 일부: ${visibleText}`
  ].filter(Boolean).join('\n')

  return result.slice(0, MAX_REFERENCE_TEXT_LENGTH) || '분석 가능한 페이지 콘텐츠가 없습니다.'
}

/**
 * HTML 태그의 첫 텍스트 내용 조회
 *
 * @param html 원본 HTML
 * @param tagName 조회할 태그명
 * @returns 정리된 텍스트
 */
function readTagText(html: string, tagName: string) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'))

  return decodeHtmlEntities(match?.[1] || '').replace(/\s+/g, ' ').trim().slice(0, 500)
}

/**
 * name 속성 기준 meta content 조회
 *
 * @param html 원본 HTML
 * @param name 조회할 meta name
 * @returns meta content 문자열
 */
function readMetaContent(html: string, name: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) || []
  const target = tags.find((tag) => new RegExp(`(?:name|property)=["']${name}["']`, 'i').test(tag)) || ''

  return decodeHtmlEntities(target.match(/content=["']([^"']*)["']/i)?.[1] || '').trim().slice(0, 1000)
}

/**
 * AI 분석용 텍스트의 주요 HTML entity 디코딩
 *
 * @param value entity 포함 문자열
 * @returns 사람이 읽을 수 있는 문자열
 */
function decodeHtmlEntities(value: string) {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  }

  return value.replace(/&(amp|lt|gt|quot|#39|nbsp);/gi, (entity) => entities[entity.toLowerCase()] || entity)
}

/**
 * 이미 사용자 응답용으로 생성된 HTTP 오류 여부 확인
 *
 * @param error URL 분석 중 발생 오류
 * @returns 상태 코드가 있는 오류이면 true
 */
function isPublicFetchError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'statusCode' in error)
}
