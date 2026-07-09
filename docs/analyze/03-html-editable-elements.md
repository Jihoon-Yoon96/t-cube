# HTML 편집 가능 요소 분석 프로세스

## 1. 목적

이 문서는 업로드된 HTML 파일이나 AI가 생성한 HTML 소스가 어떤 과정을 거쳐 에디터에서 수정 가능한 요소 목록으로 변환되는지 설명한다.

현재 구현에서 핵심은 입력 경로가 달라도 최종적으로 `services/html/parseHtmlDocument.ts`의 `parseHtmlDocument()`로 합류한다는 점이다. HTML 파일은 `parseHtmlFile()`을 거쳐 `parseHtmlDocument()`로 들어가고, 이미지/PDF 기반 AI 생성 결과는 API 응답의 `html` 문자열을 바로 `parseHtmlDocument()`에 전달한다.

## 2. 전체 흐름

```txt
HTML 파일
-> parseHtmlFile()
-> parseHtmlDocument()
-> builderStore.setCurrentDocument()
-> HtmlDocumentEditor.vue

이미지/PDF 파일
-> server API에서 HTML 생성
-> completeDesignHtmlGeneration()
-> parseHtmlDocument()
-> builderStore.setCurrentDocument()
-> HtmlDocumentEditor.vue
```

두 경로 모두 최종적으로 `parseHtmlDocument()`에서 편집 가능한 요소를 추출하고, `builderStore.setCurrentDocument()`를 통해 에디터 상태에 반영한다.

## 3. HTML 파일 업로드 경로

HTML 파일은 클라이언트에서 바로 읽고 파싱한다. 서버 API나 AI 변환을 거치지 않는다.

1. `composables/file/useFileAnalysis.ts`
   - `useFileAnalysis().analyzeUploadedFile()`에서 업로드 파일 타입을 확인한다.
   - `selectedUploadFileType`이 `HTML`이면 `parseHtmlFile(builderStore.uploadedFile)`을 호출한다.

2. `services/html/parseHtmlDocument.ts`
   - `parseHtmlFile(file)`이 `file.text()`로 HTML 문자열을 읽는다.
   - 읽어낸 문자열을 `parseHtmlDocument(html, { sourceName: file.name })`에 전달한다.

3. `stores/builder/editor.ts`
   - 파싱 결과는 `builderStore.setCurrentDocument(parsedDocument)`로 저장된다.
   - `setCurrentDocument()`는 첫 번째 편집 가능 요소를 기본 선택 대상으로 설정한다.

## 4. 이미지/PDF 기반 AI 생성 경로

이미지와 PDF는 먼저 서버 API를 통해 HTML 문자열로 변환한 뒤, 클라이언트에서 다시 `parseHtmlDocument()`로 편집 요소를 추출한다.

1. `composables/html/useBuilderHtmlGeneration.ts`
   - 이미지: `generateHtmlFromUploadedImage()`
   - PDF: `generateHtmlFromUploadedPdf()`
   - 각각 multipart form data를 구성해서 `/api/builder/image-to-html` 또는 `/api/builder/pdf-to-html`로 요청한다.

2. `server/api/builder/*`
   - `image-to-html.post.ts`는 `generateHtmlFromImageDesign()`을 호출한다.
   - `pdf-to-html.post.ts`는 `generateHtmlFromPdfDesign()`을 호출한다.

3. `server/services/builder/*`
   - `generateHtmlFromImageDesign()`과 `generateHtmlFromPdfDesign()`은 공통으로 `generateHtmlFromDesignFile()`을 호출한다.
   - `generateHtmlFromDesignFile()`은 Gemini API 키가 있으면 AI 호출 결과를, 없으면 더미 HTML을 `DesignToHtmlResponse`로 반환한다.

4. `composables/html/useBuilderHtmlGeneration.ts`
   - API 응답은 `completeDesignHtmlGeneration(response)`에서 처리된다.
   - `response.html`을 `parseHtmlDocument(response.html, { sourceName })`로 파싱한다.
   - 결과를 `builderStore.setCurrentDocument(parsedDocument)`에 저장하고 `html-editor` 화면으로 이동한다.

## 5. parseHtmlDocument 내부 처리

`parseHtmlDocument()`는 HTML 문자열을 에디터가 다룰 수 있는 `ParsedHtmlDocument` 모델로 변환한다.

```txt
HTML 문자열
-> DOMParser로 DOM 문서 생성
-> 편집 제외 노드 제거
-> 텍스트/이미지/링크 요소 추출
-> ParsedHtmlDocument 생성
```

주요 단계는 다음과 같다.

- `DOMParser` 사용 가능 여부 확인
  - 브라우저 환경에서만 DOM 기반 파싱을 수행한다.

- `parser.parseFromString(html, 'text/html')`
  - 문자열 HTML을 브라우저 DOM 문서로 변환한다.

- `document.querySelector('parsererror')`
  - 파싱 실패 여부를 확인한다.

- `document.querySelectorAll(IGNORED_TEXT_PARENT_SELECTOR).forEach((node) => node.remove())`
  - `script`, `style`, `noscript`, `template`, `svg`처럼 편집 대상으로 삼지 않을 노드를 제거한다.

- `extractTextElements(root)`
  - 텍스트 편집 대상 요소를 추출한다.

- `extractImageElements(root)`
  - 이미지 편집 대상 요소를 추출한다.

- `extractLinkElements(root, [...textElements, ...imageElements])`
  - 텍스트나 이미지 요소로 이미 잡힌 링크를 제외하고, href만 편집할 링크 요소를 추가로 추출한다.

## 6. 편집 가능 요소 추출 기준

### 6.1 텍스트 요소

`extractTextElements(root)`는 `TEXT_SELECTOR`에 포함된 태그를 대상으로 한다.

대상 태그:

```txt
h1, h2, h3, h4, h5, h6,
p, a, button, li, div, td, th,
span, strong, em
```

각 요소는 `getEditableTextContent(element)`를 거쳐 실제 편집 가능한 텍스트가 있는지 확인한다.

- 직접 자식 텍스트 노드가 있으면 해당 텍스트를 우선 사용한다.
- 직접 텍스트가 없더라도 `a`, `button`, `span`, `strong`, `em`, heading, `p`, `li` 계열은 `textContent`를 보조로 사용한다.
- 이미지, 비디오, 테이블 등 복합 콘텐츠를 포함한 링크는 `isTextEditableAnchor()`에서 제외된다.
- 최대 추출 개수는 `MAX_TEXT_ELEMENT_COUNT` 값인 80개다.

생성되는 주요 필드:

```ts
{
  type: 'text',
  selector,
  content,
  originalContent,
  href,
  originalHref
}
```

### 6.2 이미지 요소

`extractImageElements(root)`는 `img` 태그를 대상으로 한다.

- `src`와 `alt`를 편집 가능 필드로 저장한다.
- 이미지가 링크 안에 있으면 가장 가까운 부모 `a`의 `href`도 함께 저장한다.
- 최대 추출 개수는 `MAX_IMAGE_ELEMENT_COUNT` 값인 40개다.

생성되는 주요 필드:

```ts
{
  type: 'image',
  selector,
  src,
  originalSrc,
  alt,
  originalAlt,
  href,
  originalHref
}
```

### 6.3 링크 요소

`extractLinkElements(root, existingElements)`는 `a[href]` 태그를 대상으로 한다.

단, 텍스트 요소나 이미지 요소에서 이미 같은 selector가 등록된 링크는 제외한다. 이 처리는 같은 DOM 요소가 텍스트 편집 요소와 링크 편집 요소로 중복 노출되는 것을 막기 위한 것이다.

생성되는 주요 필드:

```ts
{
  type: 'link',
  selector,
  href,
  originalHref
}
```

## 7. selector와 id 생성

각 편집 요소는 원본 HTML에서 다시 찾아갈 수 있어야 하므로 `selector`와 `id`를 함께 가진다.

- `createElementSelector(element)`
  - DOM 트리에서 대상 요소까지의 CSS 선택자 경로를 만든다.
  - 같은 태그 형제 요소가 여러 개 있으면 `:nth-of-type()`을 붙인다.
  - 이후 `renderEditableHtmlDocument()`에서 `parsedDocument.querySelector(editableElement.selector)`로 원본 요소를 다시 찾는 데 사용된다.

- `createElementId(...parts)`
  - 요소 타입, 순번, 콘텐츠 일부를 조합해 해시 기반 ID를 만든다.
  - 에디터에서 선택 상태를 관리할 때 `selectedElementId`와 매칭된다.

## 8. 에디터 반영과 미리보기 렌더링

파싱 결과는 `ParsedHtmlDocument` 형태로 store에 저장된다.

```ts
type ParsedHtmlDocument = {
  id: string
  title: string
  sourceName: string
  rawHtml: string
  elements: ParsedHtmlEditableElement[]
}
```

저장 흐름:

```txt
parseHtmlDocument()
-> builderStore.setCurrentDocument(parsedDocument)
-> stores/builder/editor.ts currentDocument
-> HtmlDocumentEditor.vue
```

미리보기 렌더링은 `components/builder/view/create-template/HtmlDocumentEditor.vue`에서 수행된다.

- `previewHtml` computed가 `renderEditableHtmlDocument(currentDocument.value)`를 호출한다.
- `renderEditableHtmlDocument()`는 `document.rawHtml`을 다시 DOM으로 파싱한다.
- 각 `editableElement.selector`로 원본 DOM 요소를 찾는다.
- 변경된 `content`, `src`, `alt`, `href`를 DOM에 반영한다.
- `data-tcube-editable-id`, `data-tcube-editable-type`을 붙여 에디터에서 클릭 가능한 요소로 표시한다.
- `injectEditorStyle()`로 hover/selected/editing 표시 스타일을 주입한다.

## 9. 핵심 요약

입력 방식은 여러 가지지만 편집 가능 요소를 잡아내는 기준점은 하나다.

```txt
HTML 파일
-> parseHtmlFile()
-> parseHtmlDocument()
-> ParsedHtmlDocument

이미지/PDF AI 생성 HTML
-> generateHtmlFromUploadedImage() / generateHtmlFromUploadedPdf()
-> server API
-> generateHtmlFromDesignFile()
-> completeDesignHtmlGeneration()
-> parseHtmlDocument()
-> ParsedHtmlDocument
```

즉 현재 구조에서 중요한 경계는 다음과 같다.

- 서버는 이미지/PDF 같은 비HTML 입력을 HTML 문자열로 변환한다.
- 클라이언트의 `parseHtmlDocument()`는 HTML 문자열에서 편집 가능한 DOM 요소를 추출한다.
- store의 `currentDocument`는 원본 HTML과 편집 가능 요소 목록을 함께 보관한다.
- 에디터는 `elements`를 수정하고, 미리보기는 `renderEditableHtmlDocument()`로 원본 HTML에 수정값을 다시 반영한다.
