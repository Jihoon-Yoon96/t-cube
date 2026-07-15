# HTMLDocumentEditor 구조와 동작 프로세스

## 1. 목적

이 문서는 `HtmlDocumentEditor.vue`를 중심으로 HTML 편집 화면의 파일 구조, 상태 소유권, 컴포넌트 통신, iframe 편집, 구조 이동, AI 수정, 편집 이력 및 최종 결과물 출력 프로세스를 설명한다.

HTML 문자열이 편집 가능한 문서 모델로 변환되는 이전 단계는 `docs/analyze/03-html-editable-elements.md`를 참고한다. 이 문서는 `ParsedHtmlDocument`가 store에 저장된 이후부터 사용자가 요소를 선택하고 수정하거나 HTML 구조를 이동하는 과정에 집중한다.

## 2. 전체 구조

```txt
layouts/builder.vue
├─ components/layouts/top-toolbar.vue
│  ├─ 뒤돌리기 · 재실행
│  ├─ 다운로드 · 미리보기 · 저장
│  └─ PC · Tablet · Mobile
└─ HtmlDocumentFullPreview.vue      → Teleport 전체 화면 미리보기

HtmlDocumentEditor.vue
├─ HtmlEditorInspector.vue
│  ├─ 요소 탭 목록
│  └─ 구조 탭 트리와 drag & drop
├─ HtmlEditorPreview.vue
│  ├─ iframe 미리보기
│  ├─ useHtmlElementEditing.ts
│  └─ HtmlElementEditPopover.vue
└─ HtmlEditorAiChat.vue
   └─ useHtmlEditChat.ts

공유 상태
└─ useBuilderEditor.ts
   └─ stores/builder/editor.ts
      └─ currentDocument · undo/redo history

HTML 처리
├─ services/html/parseHtmlDocument.ts
├─ services/html/htmlLayoutTree.ts
└─ server/api/builder/html-edit-chat.post.ts
   └─ server/services/builder/htmlEditChat.ts

공통 타입과 스타일
├─ types/builder/html-document-editor.ts
├─ types/builder/html-edit-chat.ts
└─ assets/styles/html-document-editor.css
```

iframe 요소·구조 편집의 핵심 컴포넌트 관계는 다음과 같다. AI 채팅 흐름은 9절에서 별도로 설명한다.

![HTML 편집기 컴포넌트와 서비스 관계](./images/html-editor-components.svg)

## 3. 파일별 책임

### 3.1 `HtmlDocumentEditor.vue`

HTML 편집 화면의 진입점이자 Inspector와 Preview 사이의 조정자다.

주요 책임:

- `useBuilderEditor()`에서 현재 문서와 선택 요소 상태 조회
- `useBuilderView()`의 viewport에 따라 iframe 너비 계산
- Inspector 표시 여부와 활성 탭 관리
- 좌우 패널 동시 표시와 pointer/키보드 기반 너비 조절
- AI 채팅 중 좌측 Inspector를 구조 전용 모드로 고정
- AI 편집 대상 노드와 현재 outerHTML 계산
- 요소, 구조, drag, hover 이벤트를 Inspector와 Preview 사이에서 전달
- AI 작업 적용 후 재파싱된 구조 노드 재선택
- AI 요청 중 화면 dim 표시와 페이지 이탈 취소 처리
- 편집할 문서가 없을 때 placeholder 표시

이 파일은 iframe DOM을 직접 조작하지 않는다. Preview의 `defineExpose()` API를 호출해 실제 포커스와 구조 이동을 요청한다.

Preview 공개 API:

```ts
type HtmlEditorPreviewExposed = {
  focusEditableElement: (element: ParsedHtmlEditableElement) => void
  focusLayoutNode: (layoutNode: ParsedHtmlLayoutNode) => void
  moveDraggedLayoutNode: (targetNodeId: string, position: 'before' | 'after') => void
}
```

### 3.2 `HtmlEditorInspector.vue`

좌측 요소 탭과 구조 탭의 표시 및 목록 상호작용을 담당한다.

요소 탭 책임:

- `document.elements` 목록 출력
- 선택 요소 active 표시
- 요소 click/hover 이벤트 전달
- 선택 요소가 변경되면 활성 항목을 목록 중앙으로 스크롤

구조 탭 책임:

- `document.layoutNodes`를 계층형 목록으로 표시
- 노드별 접기 및 전체 접기 상태 관리
- 선택 노드의 조상, 부모, 하위 범위 강조
- 같은 부모를 가진 노드 사이의 drag & drop 요청 전달
- 선택 구조가 접힌 노드 안에 있으면 조상 노드 자동 펼침

AI 채팅 중에는 `layoutOnly` prop에 따라 요소 탭을 숨기고 구조 탭 하나만 표시한다.

구조 계산 자체는 `services/html/htmlLayoutTree.ts`에 위임한다. Inspector에는 Vue 반응성과 UI 이벤트 처리만 남긴다.

### 3.3 `HtmlEditorPreview.vue`

iframe 미리보기의 수명주기와 구조 편집을 담당한다.

주요 책임:

- `renderEditableHtmlDocument()`로 iframe `srcdoc` 생성
- iframe load 이후 클릭, hover, scroll, drag 이벤트 연결
- Inspector 모드에 맞춰 요소 또는 구조 선택 처리
- 선택, hover, drag 상태를 iframe의 `data-tcube-*` 속성으로 동기화
- 구조 노드 선택 시 iframe 위치 이동
- 구조 노드 drag & drop 가능 범위와 앞/뒤 위치 계산
- 요소 값 변경 또는 구조 이동으로 iframe이 다시 렌더링될 때 기존 스크롤 위치 복원
- `useHtmlElementEditing()`과 `HtmlElementEditPopover` 연결

iframe에는 다음 sandbox 권한만 부여한다.

```html
sandbox="allow-same-origin allow-popups allow-forms"
```

스크립트 실행 권한은 없지만, 부모 편집기가 `contentDocument`에 접근해 이벤트와 편집 상태를 연결할 수 있도록 `allow-same-origin`을 사용한다.

### 3.4 `HtmlElementEditPopover.vue`

링크와 미디어 편집 팝오버의 표시 전용 컴포넌트다.

주요 화면 모드:

- `menu`: 가능한 편집 작업 선택
- `href`: 링크 주소 입력
- `media-src`: 이미지, picture, video source URL 또는 파일 입력

이 컴포넌트는 store나 iframe을 직접 변경하지 않는다. 입력값과 사용자 요청을 emit하고, 실제 변경은 `useHtmlElementEditing()`이 처리한다.

### 3.5 `useHtmlElementEditing.ts`

요소 모드에서 발생하는 편집 동작을 조합하는 composable이다.

주요 책임:

- iframe 편집 요소 선택
- 텍스트 `contenteditable` 편집 시작과 종료
- 링크 주소 편집
- 이미지, picture, video source 편집
- 로컬 파일을 data URL로 읽어 미디어에 반영
- 팝오버 상태와 좌표 계산
- 선택 요소를 iframe 중앙으로 이동
- 변경 값을 `useBuilderEditor()`를 통해 store에 반영

특정 컴포넌트의 단순 표시 상태가 아니라 iframe DOM, Vue 반응성, store 변경을 함께 조합하는 작업이므로 composable에 위치한다.

### 3.6 `HtmlEditorAiChat.vue`

우측 AI 채팅 패널의 표시와 사용자 입력을 담당한다.

주요 책임:

- 사용자와 AI 메시지 목록 출력
- 현재 선택 노드 라벨과 큰 노드 안내 표시
- 사용자 메시지에 요청 당시의 대상 노드 라벨 표시
- 선택 노드가 없을 때 입력창과 전송 버튼 비활성화
- 프롬프트 입력과 전송
- 한글 조합 중 Enter 입력이 중복 전송되지 않도록 처리
- 요청 중 전송 버튼을 정지 버튼으로 전환
- 정지 요청을 `useHtmlEditChat()`에 전달
- 새 메시지 추가 시 채팅 목록을 마지막 메시지로 스크롤

HTML 파싱이나 store 변경은 직접 처리하지 않는다.

### 3.7 `useHtmlEditChat.ts`

AI HTML 편집 요청과 문서 반영을 조합하는 composable이다.

주요 책임:

- 선택 구조 노드의 현재 `outerHTML` 추출
- 화면에는 전체 채팅 기록을 유지하고 현재 node selector와 연결된 대화만 API에 전달
- 요청별 `AbortController` 생성과 취소
- 응답 `operations`를 선택 노드 기준으로 적용
- 작업 적용 후 전체 HTML을 `ParsedHtmlDocument`로 다시 파싱
- 재파싱 후 선택을 유지할 구조 노드 id 계산
- 변경된 문서를 store에 반영하고 `dirty` 설정
- 채팅 메시지, 요청 상태, 오류 상태 공유

채팅 패널과 navigation guard가 같은 요청 상태를 사용해야 하므로 Nuxt `useState()`로 상태를 공유한다.

### 3.8 AI 편집 API와 서비스

`server/api/builder/html-edit-chat.post.ts`:

- 선택 노드 `outerHtml`, 대상 라벨, sourceName과 대화 검증
- 선택 노드 outerHTML에는 애플리케이션 차원의 길이 제한을 두지 않음
- 최근 메시지 최대 20개 사용 및 메시지당 4,000자 검증
- 브라우저 요청 종료를 서버의 `AbortController`에 연결
- 검증된 입력을 AI 서비스에 전달

`server/services/builder/htmlEditChat.ts`:

- Gemini API 호출
- `message`, `operations`, `warnings` 구조화 응답 강제
- `replace`, `insertBefore`, `insertAfter` 작업 유형 검증
- 각 작업의 `outerHtml` 기본 HTML 요소 형태 검증
- 모델 출력 중단 또는 형식 오류 시 현재 문서 적용 차단
- 일시적 API 오류에서 fallback 모델 재시도

`server/services/builder/prompts/htmlEditPrompt.ts`:

- 관련 없는 HTML을 보존하는 편집 원칙 정의
- 단일 변경과 복합 변경의 작업 선택 기준 정의
- `{ message, operations, warnings }` JSON 응답 형식 강제

### 3.9 `services/html/parseHtmlDocument.ts`

HTML 문서 모델의 생성, 렌더링, 구조 이동을 담당한다.

이 편집 화면에서 사용하는 주요 API:

- `parseHtmlDocument()`: HTML 문자열을 `ParsedHtmlDocument`로 변환
- `renderEditableHtmlDocument()`: 현재 편집값과 `data-tcube-*` 속성이 반영된 iframe HTML 생성
- `renderFinalHtmlDocument()`: 현재 요소 편집값이 반영된 직렬화 HTML 생성
- `getHtmlLayoutNodeOuterHtml()`: 선택 구조 노드의 현재 outerHTML 조회
- `applyHtmlLayoutNodeOperations()`: 선택 노드 기준 복수 AI 작업 순차 적용
- `moveHtmlLayoutNode()`: 같은 부모 아래의 구조 노드를 앞이나 뒤로 이동

### 3.10 `services/html/htmlLayoutTree.ts`

DOM이나 Vue 반응성에 의존하지 않는 구조 트리 계산을 담당한다.

주요 계산:

- 접힌 조상이 없는 노드 목록
- 선택 노드의 계층과 활성 영역
- 최상위 구조 범위
- 접기 가능한 노드와 하위 접기 가능 노드
- 특정 노드의 하위 구조 여부

### 3.11 타입과 스타일

`types/builder/html-document-editor.ts`:

- Inspector 모드
- 구조 이동 위치
- 편집 팝오버 모드와 상태

`types/builder/html-edit-chat.ts`:

- AI 채팅 메시지와 요청 당시 대상 라벨·selector
- 선택 노드 outerHTML 기반 API 요청
- `replace`, `insertBefore`, `insertAfter` 작업과 복합 응답

`assets/styles/html-document-editor.css`:

- 편집 화면 grid 크기
- Inspector와 Preview의 높이 및 overflow
- 요소 목록과 구조 트리
- iframe 미리보기
- 우측 AI 채팅 패널과 입력 UI
- 요청 중 dim과 loading spinner
- 선택, hover, drag, 팝오버 표현
- 반응형 레이아웃

### 3.12 `stores/builder/editor.ts`

편집 문서와 선택 상태뿐 아니라 뒤돌리기 및 재실행 이력을 관리한다.

주요 책임:

- 문서 변경 직전 상태를 undo history에 저장
- 뒤돌리기 시 현재 상태를 redo history에 저장하고 이전 상태 복원
- 재실행 시 현재 상태를 undo history에 저장하고 다음 상태 복원
- 새 편집이 발생하면 기존 redo history 초기화
- 새 문서를 업로드하거나 생성하면 이전 문서의 history 초기화
- 일반 요소 변경, 구조 이동, AI 복합 작업 결과를 같은 문서 스냅샷 이력 단위로 처리
- 최대 50개 문서 스냅샷 보관

이력 스냅샷에는 `currentDocument`, `selectedElementId`, `dirty`가 포함된다.

### 3.13 toolbar와 최종 결과물 UI

`components/layouts/top-toolbar.vue`:

- 좌측 뒤돌리기 및 재실행 아이콘 버튼
- 중앙 PC, Tablet, Mobile viewport 선택
- 우측 다운로드, 미리보기, 저장 버튼
- `canUndo`, `canRedo`에 따른 이력 버튼 활성 상태 표시

`layouts/builder.vue`:

- toolbar 이벤트와 editor store 연결
- 현재 HTML 다운로드용 Blob과 파일명 생성
- 전체 화면 미리보기 표시 상태 관리
- `Teleport`로 전체 화면 미리보기를 `body` 아래에 렌더링

`HtmlDocumentFullPreview.vue`:

- `renderFinalHtmlDocument()` 결과를 전용 iframe에 표시
- PC 100%, Tablet 768px, Mobile 390px 너비 전환
- 닫기 버튼과 Escape 입력 처리
- 미리보기 중 배경 body 스크롤 잠금
- 닫을 때 HTML 편집 컴포넌트를 재생성하지 않고 기존 편집 상태 유지

## 4. 핵심 데이터 모델

```ts
type ParsedHtmlDocument = {
  id: string
  title: string
  sourceName: string
  rawHtml: string
  elements: ParsedHtmlEditableElement[]
  layoutNodes: ParsedHtmlLayoutNode[]
}
```

`elements`와 `layoutNodes`는 같은 HTML을 서로 다른 관점으로 표현한다.

| 구분 | 목적 | 선택 기준 | 주요 작업 |
| --- | --- | --- | --- |
| `elements` | 사용자가 수정할 수 있는 콘텐츠 | `data-tcube-editable-id` | 텍스트, 링크, 이미지, 미디어 수정 |
| `layoutNodes` | HTML 구조와 배치 | `data-tcube-layout-id` | 구조 선택, 계층 표시, 형제 순서 이동 |

편집 요소의 `selector`와 구조 노드의 `selector`는 `rawHtml`에서 대응 DOM을 다시 찾는 연결 키다. 화면 선택에는 재파싱 후 달라질 수 있는 selector보다 `id`를 사용한다.

## 5. 상태 소유권

| 상태 | 소유 위치 | 이유 |
| --- | --- | --- |
| `currentDocument` | builder editor store | Inspector, Preview, 저장 과정이 공유하는 문서 원본 |
| `selectedElementId` | builder editor store | 요소 목록과 iframe이 공유하는 선택 상태 |
| `dirty` | builder editor store | 화면 이동 및 저장 과정에서 사용하는 변경 여부 |
| undo/redo history | builder editor store | 요소, 구조, AI 복합 작업 결과를 이전 또는 다음 상태로 복원 |
| `canUndo`, `canRedo` | builder editor store의 `computed` | toolbar 이력 버튼 활성 상태 결정 |
| `showHtmlPreview` | `layouts/builder.vue` | 전체 화면 결과물 미리보기 표시 상태 |
| `showElementList` | `HtmlDocumentEditor.vue` | 현재 편집 화면 안에서만 사용하는 패널 표시 상태 |
| `showAiChat` | `HtmlDocumentEditor.vue` | 우측 AI 채팅 패널 표시 상태 |
| `inspectorMode` | `HtmlDocumentEditor.vue` | Inspector와 Preview가 공유하는 현재 탭 |
| `inspectorModeBeforeAi` | `HtmlDocumentEditor.vue` | AI 채팅 종료 후 기존 Inspector 탭 복원 |
| 좌우 패널 너비와 resize 상태 | `HtmlDocumentEditor.vue` | 현재 화면에서만 사용하는 Inspector·채팅 패널 크기 |
| `selectedLayoutNodeId` | 부모와 Preview의 `v-model` | 구조 목록과 iframe 구조 선택 동기화 |
| `selectedLayoutNode`, `selectedLayoutNodeOuterHtml` | `HtmlDocumentEditor.vue`의 `computed` | AI 수정 대상과 노드 크기 안내 계산 |
| `draggedLayoutNodeId` | 부모와 Preview의 `v-model` | Inspector drag와 iframe drag 상태 동기화 |
| hover 대상 ID | `HtmlDocumentEditor.vue` | Inspector hover를 Preview로 전달하는 일시 상태 |
| 접힌 구조 노드 ID | `HtmlEditorInspector.vue` | 구조 목록에서만 사용하는 표시 상태 |
| 팝오버와 임시 미디어 상태 | `useHtmlElementEditing.ts` | 요소 편집 작업 동안만 필요한 임시 상태 |
| 채팅 메시지, 요청 및 오류 상태 | `useHtmlEditChat.ts`의 `useState()` | 대상 노드가 달라도 유지되는 채팅 UI와 navigation guard의 공유 상태 |
| AI 요청 `AbortController` | Nuxt app 공유 상태 | 채팅 UI, 화면 해제, navigation guard에서 동일 요청 취소 |
| iframe DOM 참조와 pending scroll | `HtmlEditorPreview.vue` | iframe 렌더링 수명주기와 직접 연결된 상태 |

문서 데이터와 저장에 영향을 주는 상태는 store에 두고, 한 화면 또는 한 컴포넌트에서만 끝나는 UI 상태는 로컬에 둔다.

## 6. 초기 렌더링 프로세스

```txt
builder editor store.currentDocument 변경
→ HtmlDocumentEditor.currentDocument computed 갱신
→ Inspector에 ParsedHtmlDocument 전달
→ Preview.previewHtml computed 재계산
→ renderEditableHtmlDocument(currentDocument)
→ iframe srcdoc 교체
→ iframe load
→ handlePreviewLoad()
→ 이벤트 연결 및 mode/selection/scroll 상태 복원
```

`renderEditableHtmlDocument()`는 iframe 문서에 편집용 속성을 추가한다.

- `data-tcube-editable-id`
- `data-tcube-editable-type`
- `data-tcube-layout-id`

Preview는 이 속성을 사용해 사용자가 클릭하거나 hover한 DOM을 문서 모델의 요소 또는 구조 노드로 연결한다.

## 7. 요소 모드 프로세스

### 7.1 iframe에서 요소 선택

![iframe 요소 선택과 Inspector 동기화 흐름](./images/html-editor-element-selection.svg)

요소 유형에 따른 후속 동작:

- 일반 텍스트: `contenteditable` 편집 시작
- 링크: 링크 또는 텍스트 편집 메뉴 표시
- 이미지: 이미지 및 연결 링크 편집 메뉴 표시
- picture/video: source 목록 편집 메뉴 표시

### 7.2 요소 목록에서 선택

```txt
Inspector 항목 click
→ select-element emit
→ HtmlDocumentEditor.handleElementListClick()
→ Preview.focusEditableElement()
→ 대응 iframe 요소 조회
→ iframe 요소를 화면 중앙으로 스크롤
→ 요소 선택 및 유형별 편집 UI 표시
```

부모는 Preview 내부 구현을 알지 않고 공개된 `focusEditableElement()`만 호출한다.

### 7.3 요소 값 변경

```txt
텍스트, href 또는 media source 변경
→ useHtmlElementEditing
→ iframe DOM에 즉시 반영
→ builderEditor.updateCurrentDocumentElement()
→ store.currentDocument.elements 갱신
→ dirty = true
→ 변경 직전 iframe scroll 좌표 저장
→ previewHtml 재계산
→ iframe srcdoc 재렌더링
→ 저장한 scroll 좌표 복원
```

iframe DOM 선반영은 입력 결과를 즉시 보여주기 위한 처리다. 영속적인 변경 기준은 store의 `currentDocument`다.

요소 모드에서 `previewHtml`이 바뀌면 Preview의 watcher가 기존 iframe 좌표를 `pendingPreviewScrollPosition`에 저장한다. 따라서 화면 아래쪽에서 텍스트를 수정해도 리렌더링 후 문서 최상단으로 이동하지 않고 같은 위치로 돌아간다.

## 8. 구조 모드 프로세스

### 8.1 모드 전환

요소 탭에서 구조 탭으로 전환하면 다음 상태를 정리한다.

- 요소 편집 팝오버 닫기
- store의 요소 선택 해제
- iframe 구조 요소의 `draggable` 상태 활성화
- 구조 선택과 hover 강조 사용

다시 요소 탭으로 전환하면 구조 선택과 drag 강조를 제거하고 요소 선택 방식을 사용한다.

### 8.2 구조 선택

Inspector에서 구조 선택:

```txt
구조 항목 click
→ HtmlDocumentEditor.handleLayoutNodeClick()
→ Preview.focusLayoutNode()
→ selectedLayoutNodeId 갱신
→ iframe data-tcube-layout-selected 갱신
→ 선택 구조를 iframe 세로 중앙으로 스크롤
```

iframe에서 구조 선택:

```txt
iframe click capture
→ handlePreviewLayoutClick()
→ resolvePreviewLayoutElement()
→ selectedLayoutNodeId 갱신
→ v-model로 부모와 Inspector에 전달
→ Inspector가 접힌 조상을 펼침
→ 활성 구조 항목을 목록 중앙으로 스크롤
```

`resolvePreviewLayoutElement()`는 링크 내부 구조를 보정하고, 자식이 하나뿐인 단순 wrapper에서는 실제 이동에 적합한 상위 구조까지 선택 대상을 올릴 수 있다.

### 8.3 구조 drag & drop

구조 이동은 다음 조건에서만 허용한다.

- source와 target이 서로 다른 노드
- 두 노드의 `parentSelector`가 동일
- source와 target DOM의 실제 부모가 동일
- source와 target이 서로의 하위 노드가 아님

전체 흐름:

![HTML 구조 drag and drop 처리 흐름](./images/html-editor-layout-move.svg)

구조를 이동한 뒤 전체 문서를 다시 파싱하는 이유는 DOM 순서 변경으로 selector, 요소 ID, 구조 ID가 달라질 수 있기 때문이다.

## 9. AI HTML 수정 채팅 프로세스

기존 전체 HTML 반환 방식 대신 선택 구조 노드의 outerHTML과 작업 배열을 사용한다. 이에 따라 요청·응답 크기를 선택 범위에 맞게 줄이고 다른 구조의 의도하지 않은 변경을 제한한다.

### 9.1 패널 열기

```txt
Preview 우측 AI 버튼 click
→ HtmlDocumentEditor.toggleAiChat()
→ showAiChat = true
→ showElementList = true, inspectorMode = layout
→ 좌측 구조 Inspector와 Preview, 우측 채팅 패널 표시
```

AI 채팅이 열리면 좌측 Inspector도 함께 표시되며 구조 탭만 사용할 수 있다. 구조 목록 또는 iframe에서 수정할 노드를 선택하기 전에는 채팅 입력과 전송을 사용할 수 없다.

채팅을 닫으면 `inspectorModeBeforeAi`에 저장해 둔 이전 Inspector 탭으로 돌아간다. 채팅이 열려 있는 동안에는 좌측 패널 숨김 버튼도 비활성화되어 구조 선택 영역을 유지한다.

### 9.2 HTML 수정 요청

```txt
사용자 메시지 전송
→ 선택 노드의 현재 편집값이 반영된 outerHTML 추출
→ 대화 이력과 선택 노드 outerHTML을 서버 API에 전달
→ 편집 화면 dim 및 Send 버튼을 Stop 버튼으로 전환
→ Gemini가 HTML 편집 operations 배열과 설명 반환
→ 응답 JSON, 종료 사유, 작업 유형과 HTML 요소 기본 형태 검증
→ 요청 시작 시 선택한 노드를 기준으로 operations 순차 적용
→ 전체 문서 직렬화 및 parseHtmlDocument()
→ store.applyCurrentDocumentEdit()
→ 변경 전 문서를 undo history에 저장
→ store.currentDocument 교체 및 dirty = true
→ iframe srcdoc 재렌더링
→ 교체된 구조 노드 재선택
→ AI 응답을 채팅 목록에 표시
```

현재 응답 형식:

```json
{
  "operations": [
    {
      "operation": "replace",
      "outerHtml": "<section>수정된 선택 노드</section>"
    },
    {
      "operation": "insertAfter",
      "outerHtml": "<section>새 형제 노드</section>"
    }
  ],
  "message": "선택 노드를 수정하고 뒤에 새 영역을 추가했습니다.",
  "warnings": []
}
```

AI는 `replace`, `insertBefore`, `insertAfter` 작업을 필요한 만큼 `operations` 배열로 반환한다. `replace`는 선택 노드 자체를 변경하고, 나머지 작업은 선택 노드 앞이나 뒤에 형제 노드를 추가한다. 복합 요청은 배열 순서대로 적용하며 각 작업의 `outerHtml`은 최상위 요소가 하나인 노드만 허용한다. 클라이언트는 모든 작업을 적용한 전체 HTML을 기존 파서로 다시 문서 모델로 변환하므로 요소 목록, 구조 트리, iframe이 같은 결과를 사용한다.

여러 `insertBefore` 작업은 응답 순서를 유지한 채 선택 노드 앞에 배치되고, 여러 `insertAfter` 작업은 별도 cursor를 이동해 응답 순서대로 뒤에 배치된다. `replace`가 포함되면 교체된 요소를 이후 작업과 재선택의 기준 노드로 사용한다. 전체 배열은 store에 한 번 반영되므로 복합 요청도 undo 한 단계로 취급한다.

노드를 변경해도 화면의 채팅 기록은 유지하며 각 사용자 프롬프트에는 요청 당시의 노드 라벨을 함께 표시한다. AI 요청에는 현재 노드 selector와 연결된 대화만 전달해 다른 노드의 이전 요청이 수정 문맥에 섞이지 않도록 한다.

선택 노드 outerHTML이 30,000자 이상이면 작업 시간과 AI 토큰 사용량이 증가할 수 있다는 안내만 표시하며 전송을 제한하지 않는다. 원본 노드의 `script`, `iframe`, 이벤트 속성은 사용자가 변경을 요청하지 않으면 보존하도록 프롬프트에서 지시하며 별도 보안 필터는 현재 적용하지 않는다.

서버와 클라이언트의 검증 단계에서는 다음 경우 문서를 변경하지 않는다.

- 모델 자체 출력 한계로 응답이 중간에 종료된 경우
- JSON이 파싱되지 않는 경우
- `operations` 배열이 없거나 비어 있는 경우
- 지원하지 않는 작업 유형이 포함된 경우
- 작업의 `outerHtml`이 HTML 요소 형태가 아닌 경우
- 작업 하나에 최상위 요소가 여러 개 포함된 경우
- JSON 원문 전체가 작업의 `outerHtml` 값으로 전달된 경우

서버는 작업 유형과 기본 HTML 시작 형태를 검사하고, 클라이언트는 DOM 문맥에서 각 작업의 루트 요소가 정확히 하나인지 다시 확인한다. 복합 작업 도중 하나라도 검증에 실패하면 임시 DOM만 폐기하고 store에는 어떤 작업도 반영하지 않는다.

### 9.3 요청 취소와 화면 이동 방어

채팅의 Stop 버튼을 누르면 공유 `AbortController`가 클라이언트 요청을 중단한다. 서버는 브라우저 연결 종료를 감지해 진행 중인 Gemini 요청에도 abort signal을 전달한다.

AI 요청 중 sidebar 또는 상단 이동 동작을 실행하면 `useBuilderNavigationGuard()`가 확인창을 표시한다.

- 이동 취소: 현재 AI 요청과 편집 화면 유지
- 이동 확인: AI 요청 중단 후 선택한 화면으로 이동
- 브라우저 새로고침 또는 탭 닫기: `beforeunload` 경고 표시
- 편집 컴포넌트 해제: 남아 있는 AI 요청 자동 중단

### 9.4 dim 영역과 대상 잠금

요청 중 dim은 좌측 Inspector와 우측 채팅 패널을 제외한 Preview body 영역을 덮는다. 로딩 카드는 현재 Preview 영역의 가로·세로 중앙에 배치되며, PC와 좁은 화면에서 달라지는 패널 폭을 CSS 변수로 제외한다.

채팅 패널은 dim보다 높은 z-index를 사용해 메시지 확인과 Stop 버튼 조작을 계속 허용한다. 좌측 구조 Inspector는 opacity를 낮추고 pointer event를 차단해 요청 시작 당시의 대상이 바뀌지 않도록 한다. Preview의 좌우 패널 버튼도 요청이 끝날 때까지 비활성화된다. 모바일에서는 아래쪽 채팅 영역 높이를 제외한 상단 편집 영역을 dim 기준으로 사용한다.

## 10. top toolbar와 편집 결과물 프로세스

### 10.1 뒤돌리기와 재실행

문서가 변경되기 직전에 editor store가 현재 상태를 undo history에 저장한다.

```txt
요소 편집 · 구조 이동 · AI 단일/복합 작업
→ recordCurrentDocumentForUndo()
→ 현재 문서, 선택 요소, dirty 스냅샷 저장
→ redo history 초기화
→ 변경 결과를 currentDocument에 반영
```

뒤돌리기:

```txt
toolbar 뒤돌리기 click
→ 현재 상태를 redo history에 저장
→ undo history의 마지막 상태 복원
→ currentDocument 변경
→ Inspector와 iframe 재렌더링
```

재실행은 반대 방향으로 현재 상태를 undo history에 저장하고 redo history의 마지막 상태를 복원한다. 이력이 없으면 대응 버튼은 비활성화된다.

새 HTML 파일을 업로드하거나 새로운 HTML을 생성하면 이전 문서의 이력이 섞이지 않도록 undo와 redo history를 모두 초기화한다.

### 10.2 HTML 다운로드

```txt
toolbar 다운로드 click
→ renderFinalHtmlDocument(currentDocument)
→ 현재 텍스트·링크·미디어 편집값 반영
→ text/html Blob 생성
→ sourceName을 안전한 .html 파일명으로 변환
→ 임시 object URL로 브라우저 다운로드
→ object URL 해제
```

다운로드는 iframe에 주입하는 구조 선택 속성과 Inspector 강조 stylesheet가 없는 직렬화 HTML을 기준으로 한다. 현재 `createRenderedHtmlDocument()`가 추가하는 `data-tcube-editable-id`, `data-tcube-editable-type`, inline cursor는 `renderFinalHtmlDocument()`에도 남는다.

### 10.3 전체 화면 미리보기

```txt
toolbar 미리보기 click
→ layouts/builder.vue의 showHtmlPreview = true
→ HtmlDocumentFullPreview를 body로 Teleport
→ renderFinalHtmlDocument(currentDocument)
→ 전체 화면 iframe srcdoc에 표시
```

미리보기 상단은 기존 toolbar와 같은 viewport 상태를 사용한다.

| 모드 | iframe 너비 |
| --- | --- |
| PC | 사용 가능한 영역 100% |
| Tablet | 768px |
| Mobile | 390px |

닫기 버튼 또는 Escape를 누르면 overlay만 제거된다. `HtmlDocumentEditor.vue`는 계속 mount된 상태이므로 현재 문서, 선택 상태, scroll, history가 유지된 채 편집 화면으로 복귀한다.

전체 화면 미리보기 iframe도 편집 iframe과 동일하게 `allow-same-origin allow-popups allow-forms` sandbox만 사용하며 스크립트 실행은 허용하지 않는다.

## 11. iframe 재렌더링과 스크롤 보존

`previewHtml`이 변경되면 iframe `srcdoc`이 교체되므로 기존 iframe DOM과 이벤트는 사라진다. 따라서 `handlePreviewLoad()`에서 이벤트와 선택 상태를 매번 다시 연결한다.

요소 값 변경이나 구조 이동처럼 현재 위치를 유지해야 하는 작업은 다음 순서를 사용한다.

1. `getPreviewScrollPosition()`으로 현재 좌표 저장
2. store 문서 변경
3. iframe 재렌더링
4. `restorePendingPreviewScrollPosition()` 실행
5. 두 번의 `requestAnimationFrame()` 뒤 scroll 복원

구조 이동은 store를 변경하기 직전에 좌표를 저장한다. 일반 텍스트·링크·미디어 변경은 요소 모드에서 `previewHtml` watcher가 리렌더링 전에 좌표를 저장한다. `handlePreviewLoad()`는 저장 좌표가 있으면 이를 먼저 복원하고, 없으면 pending 구조 포커스를 처리한다.

요소나 구조를 명시적으로 선택한 경우에는 대상 요소의 중앙 위치로 스크롤한다. 문서 재렌더링 복원과 사용자 선택 스크롤은 목적이 다르므로 별도 함수로 유지한다.

## 12. 선택과 강조에 사용하는 data 속성

| 속성 | 용도 |
| --- | --- |
| `data-tcube-editable-id` | iframe DOM과 `ParsedHtmlEditableElement` 연결 |
| `data-tcube-editable-type` | 텍스트, 링크, 이미지, 미디어 유형 구분 |
| `data-tcube-layout-id` | iframe DOM과 `ParsedHtmlLayoutNode` 연결 |
| `data-tcube-selected` | 요소 모드 선택 강조 |
| `data-tcube-layout-selected` | 구조 모드 선택 강조 |
| `data-tcube-hovered` | Inspector 또는 iframe hover 강조 |
| `data-tcube-layout-dragging` | 이동 중인 구조 강조 |
| `data-tcube-layout-drop-allowed` | drop 가능한 형제 범위 표시 |
| `data-tcube-layout-drop-position` | target 앞 또는 뒤 drop 위치 표시 |
| `data-tcube-layout-drop-axis` | 가로 또는 세로 drop 표시 축 |

`data-tcube-layout-*`, 선택, hover, drag 속성은 iframe 편집 화면에서만 사용한다. `data-tcube-editable-id`와 `data-tcube-editable-type`은 현재 `createRenderedHtmlDocument()` 단계에서 추가되므로 iframe과 `renderFinalHtmlDocument()` 결과에 모두 포함된다.

## 13. 크기와 스크롤 구조

화면은 바깥 문서 전체가 아니라 각 작업 영역이 독립적으로 스크롤하도록 구성한다.

```txt
.html-editor-screen
└─ .html-editor-layout
   ├─ .html-editor-panel
   │  └─ .html-inspector-list      → 요소/구조 목록 세로 스크롤
   ├─ .html-editor-preview
   │  └─ .html-browser-preview
   │     └─ .html-browser-frame    → iframe body 자체 스크롤
   ├─ .html-editor-chat-panel       → 우측 채팅 목록과 입력 영역
   └─ .html-editor-ai-loading       → AI 요청 중 Preview body dim
```

이 구조에서는 부모 grid/flex 항목의 `min-height: 0`과 고정된 높이 연결이 중요하다. 상위 높이 규칙이 끊기면 Inspector 목록은 콘텐츠 높이만큼 늘어나 스크롤을 잃고, iframe도 남은 높이를 계산하지 못한다.

레이아웃 스타일을 수정할 때 확인할 항목:

- `.html-editor-screen`의 높이와 grid 적용 여부
- `.html-editor-layout`의 `minmax(0, 1fr)` 열
- Inspector와 AI 채팅 동시 표시 시 5열 grid 구성
- `.html-editor-panel`과 `.html-editor-preview`의 overflow
- `.html-inspector-list`의 `min-height: 0`과 `overflow-y: auto`
- `.html-browser-preview`와 `.html-browser-frame`의 높이 연결
- Inspector 표시/숨김 전후 Preview 너비와 높이
- 데스크톱 pointer/키보드 패널 resize의 최소·최대 너비
- 모바일에서 Inspector, Preview, 채팅의 3행 배치

데스크톱 패널 크기 기준:

| 영역 | 기본 너비 | 최소 | 최대 |
| --- | ---: | ---: | ---: |
| Inspector | 340px | 280px | 520px |
| AI 채팅 | 380px | 320px | 560px |
| 중앙 Preview | 가변 | 480px | 가용 영역 |

화면 너비가 1,100px 이하이면 CSS 기본값을 Inspector 300px, 채팅 340px로 줄인다. 760px 이하에서는 resize handle을 숨기고 Inspector, Preview, 채팅을 한 열의 세 행으로 배치한다.

## 14. 기능 추가 기준

### 컴포넌트에 둘 내용

- 템플릿 표시
- props와 emit 연결
- DOM 이벤트와 특정 화면의 일시 상태
- iframe 수명주기에 직접 연결된 처리

### composable에 둘 내용

- iframe DOM, Vue 반응성, store 변경을 함께 조합하는 사용자 작업
- 여러 편집 UI가 공유하는 임시 상태와 편집 프로세스
- 단순 전달이 아닌 실제 조합 책임이 있는 기능

### store에 둘 내용

- 저장 결과에 영향을 주는 문서 상태
- 여러 컴포넌트가 공유하는 선택 상태
- dirty 상태와 문서 변경 API

### service에 둘 내용

- Vue 상태 없이 입력과 출력으로 설명 가능한 HTML 처리
- 구조 트리 계층 계산
- HTML 파싱, 직렬화, DOM 순서 이동

단순히 다른 함수를 한 번 호출하는 wrapper는 추가하지 않는다. 새 facade나 composable은 둘 이상의 상태 또는 작업을 실제로 조합할 때만 만든다.

## 15. 변경 시 검증 체크리스트

- 요소 탭에서 iframe 요소 클릭 시 대응 항목이 목록 중앙에 표시되는가
- 요소 목록 클릭 시 iframe의 대응 요소가 선택되고 중앙에 표시되는가
- 구조 탭에서 접힌 노드 안의 항목을 선택하면 조상이 펼쳐지는가
- 구조 목록과 iframe 양쪽에서 선택 강조가 동기화되는가
- drag & drop이 같은 부모의 형제 사이에서만 동작하는가
- 구조 이동 뒤 선택 대상과 iframe scroll이 유지되는가
- 텍스트, href, 이미지와 media source 변경이 store에 반영되는가
- 화면 아래쪽에서 텍스트를 수정한 뒤 iframe scroll이 기존 위치로 복원되는가
- 변경 후 `dirty`가 설정되는가
- iframe 재렌더링 뒤 클릭, hover, drag 이벤트가 계속 동작하는가
- Inspector를 숨기고 다시 열어도 Preview 크기와 스크롤이 유지되는가
- AI 채팅을 열면 좌측 Inspector와 우측 채팅이 함께 표시되고 구조 탭만 노출되는가
- AI 채팅을 닫으면 이전 Inspector 탭이 복원되는가
- AI 채팅 중 좌측 Inspector 숨김과 대상 변경이 차단되는가
- 구조 노드를 선택하지 않으면 AI 입력과 전송이 비활성화되는가
- 30,000자 이상 노드를 선택하면 차단 없이 작업 시간·토큰 안내가 표시되는가
- 노드를 바꿔도 채팅 기록이 유지되고 사용자 프롬프트에 요청 당시 노드 라벨이 표시되는가
- AI 요청에는 현재 node selector와 연결된 대화만 포함되는가
- `replace` 작업이 선택 노드만 교체하는가
- `insertBefore`, `insertAfter` 작업이 선택 노드 앞뒤에 단일 형제 노드를 추가하는가
- 복합 `operations`가 배열 순서대로 적용되고 한 단계 undo로 저장되는가
- 작업 하나에 최상위 요소가 여러 개면 전체 AI 결과 적용이 중단되는가
- AI 작업 결과가 문서 모델, 요소 목록, 구조 트리와 iframe에 함께 반영되는가
- AI 작업 적용 후 기준 구조 노드가 다시 선택되고 미리보기 위치로 이동하는가
- AI 요청 중 편집 body에 dim과 loading spinner가 표시되는가
- AI 요청 중 Send가 Stop으로 바뀌고 요청을 실제로 중단하는가
- AI 요청 중 sidebar 이동을 취소하면 요청이 유지되는가
- AI 요청 중 sidebar 이동을 확인하면 요청 중단 후 이동하는가
- 뒤돌리기로 텍스트, 링크, 미디어와 구조 이동 이전 상태가 복원되는가
- 재실행으로 뒤돌리기 전 상태가 다시 적용되는가
- 새 편집 후 기존 redo history가 초기화되는가
- 새 문서를 설정하면 이전 문서의 undo/redo history가 초기화되는가
- AI 단일·복합 수정 결과를 한 단계로 뒤돌리고 재실행할 수 있는가
- 다운로드한 HTML에 현재 편집값이 반영되는가
- 다운로드 파일명이 `.html` 확장자와 안전한 문자로 구성되는가
- 전체 화면 미리보기가 sidebar와 편집 화면을 포함한 viewport 전체를 덮는가
- 전체 화면 미리보기의 PC, Tablet, Mobile 너비가 toolbar 상태와 동기화되는가
- 닫기 버튼과 Escape 입력 후 기존 편집 상태가 유지되는가
- PC, Tablet, Mobile viewport 너비가 정상 적용되는가
- `pnpm build`가 통과하는가

## 16. 관련 문서

- `docs/analyze/03-html-editable-elements.md`: HTML 입력에서 편집 가능 요소를 추출하는 과정
- `docs/analyze/02-builder-result-delivery.md`: 편집 결과 전달과 저장 흐름
- `docs/architecture.md`: 프로젝트 전체 계층과 디렉터리 책임
