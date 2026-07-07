# T.CUBE 프로젝트 구조 분석

## 1. 프로젝트 개요

T.CUBE는 AI 기능이 결합된 초간단 템플릿 생성/편집기다. 비개발자를 대상으로 하며, 기업용 CMS 또는 Headless CMS의 콘텐츠 생성 화면 안에서 마케팅 배너, 브릿지 페이지, 파셜 HTML 등을 만들고 편집하는 웹빌더 역할을 한다.

초기 구현의 중심은 CMS 연동이 아니라 템플릿 생성/편집 기능이다. 즉, HTML/PDF/이미지/AI 입력을 받아 내부 편집 가능한 JSON 모델로 변환하고, 사용자가 텍스트와 이미지를 수정한 뒤 결과 JSON을 생성하는 것이 핵심이다.

## 2. 주요 사용자와 사용 맥락

- 주 사용자는 기업 고객사의 비개발자다.
- 사용자는 CMS의 콘텐츠 생성 화면에서 빌더를 열어 템플릿을 만들거나 수정한다.
- 최종 결과물은 CMS가 저장할 수 있는 JSON 형태여야 한다.
- CMS와 빌더는 모두 솔루션 제품으로 판매될 수 있다.

## 3. 핵심 기능 범위

### 템플릿 생성

#### HTML 업로드

- HTML 파일 1개 업로드
- 가능하면 AI 없이 브라우저에서 HTML을 파싱
- 업로드된 HTML에서 텍스트와 이미지 인식
- 뷰어/편집기에서 텍스트와 이미지를 클릭하여 수정
- 저장 시 내부 JSON 결과물 생성

#### PDF/이미지 업로드

- PDF 또는 이미지 파일 1개 업로드
- PDF가 여러 페이지인 경우 페이지 선택 팝업 제공
- AI를 사용해 PDF/이미지를 HTML 또는 내부 템플릿 구조로 변환
- 변환된 결과를 편집기에서 수정
- 저장 시 내부 JSON 결과물 생성

#### 디자인 시안 만들기

직접 그리기:

- 사용자가 서비스 내에서 도형과 레이아웃 초안을 배치
- 참고 기획문서 업로드 가능
- 레이아웃 초안과 참고문서를 바탕으로 AI가 디자인 시안 생성
- 마음에 들면 편집 가능한 템플릿으로 변환
- 마음에 들지 않으면 재생성

AI 프롬프팅:

- 채팅형 UI에서 자연어로 디자인 시안 생성 요청
- 참고문서 업로드 가능
- AI가 디자인 시안을 생성
- 마음에 들면 편집 가능한 템플릿으로 변환
- 마음에 들지 않으면 재생성

### 템플릿 수정

- CMS에 등록된 기존 JSON 데이터를 읽어 편집기 화면에 렌더링
- 사용자가 텍스트/이미지를 수정
- 저장 시 수정된 JSON 결과물 생성

초기 단계에서는 CMS에서 기존 JSON을 불러오고 CMS로 저장하는 실제 연동은 후순위로 둔다.

## 4. 아키텍처 핵심 방향

이 서비스의 중심 데이터는 HTML 파일 자체가 아니라 내부 표준 모델인 `TemplateDocument` JSON이어야 한다.

모든 입력은 결국 하나의 내부 모델로 정규화된다.

```txt
HTML 업로드
→ HTML Importer
→ TemplateDocument
→ Builder Editor
→ Save Payload

PDF/이미지 업로드
→ AI Parsing
→ TemplateDocument
→ Builder Editor
→ Save Payload

AI 디자인 생성
→ AI Generation
→ TemplateDocument
→ Builder Editor
→ Save Payload

CMS 기존 JSON 수정
→ Template Deserializer
→ TemplateDocument
→ Builder Editor
→ Save Payload
```

이 구조를 따르면 HTML 업로드, PDF/이미지 파싱, AI 생성, CMS 수정이 서로 다른 진입점이더라도 편집기는 하나로 유지할 수 있다.

## 5. 권장 디렉터리 구조

일반적인 Nuxt 구조를 기반으로 하고, root에서 내려오는 주요 폴더와 책임을 먼저 정의한다. 세부 파일과 하위 폴더는 구현이 진행되면서 기능 단위로 확장한다.

```txt
root
├─ pages
│  └─ 라우팅 진입점
│
├─ layouts
│  └─ 페이지 공통 레이아웃
│
├─ components
│  ├─ builder        // 빌더 화면 구성 컴포넌트
│  ├─ import         // HTML/PDF/이미지 업로드 UI
│  ├─ ai             // AI 프롬프트/생성 UI
│  └─ ui             // 버튼, 모달, 탭 등 공통 UI 컴포넌트
│
├─ composables
│  ├─ builder        // 선택, 편집, undo/redo 등 빌더 상태 로직
│  ├─ import         // HTML/PDF/이미지 import flow 로직
│  └─ ai             // AI 생성 flow 로직
│
├─ stores
│  └─ 전역에 가까운 편집 상태와 UI 상태
│
├─ services
│  ├─ importer       // 입력 파일을 TemplateDocument로 변환
│  ├─ template       // serialize, deserialize, validate, render
│  └─ ai             // AI 요청/응답 처리
│
├─ types
│  └─ TemplateDocument, BuilderSavePayload 등 공통 타입
│
├─ integrations
│  ├─ cms            // CMS 연동 계약과 bridge
│  ├─ iframe         // iframe postMessage adapter
│  └─ web-component  // web component CustomEvent adapter
│
├─ assets
│  └─ 전역 CSS, 디자인 토큰, 폰트, 정적 스타일 리소스
│
└─ utils
   └─ 파일, DOM, id, 좌표 계산 등 범용 유틸
```

## 6. 라우팅과 화면 전환 전략

웹컴포넌트 SDK 또는 iframe 연동 가능성을 고려하면, 빌더 내부 화면 전환은 Nuxt page routing에 강하게 의존하지 않는 것이 좋다.

초기 구조에서는 `pages/index.vue`를 빌더 진입점으로 두고, 실제 화면 전환은 `BuilderApp` 내부 상태 또는 Pinia store의 `currentView` 값으로 제어한다.

```txt
pages/
  index.vue
```

```vue
<template>
  <BuilderApp />
</template>
```

빌더 내부 화면은 URL이 아니라 상태로 관리한다. 여기서 view는 Nuxt page route가 아니라 `BuilderApp` 안에서 렌더링할 화면 단위를 의미한다.

```ts
type BuilderView =
  | 'start' // 템플릿 생성 시작 방식 선택 화면
  | 'pdf-image-upload' // 디자인 시안 파일 유형 선택 화면
  | 'file-upload' // 선택한 파일 유형 업로드 화면
  | 'image-preview' // 업로드한 이미지 시안 확인 화면
  | 'pdf-preview' // 업로드한 PDF 시안 확인 화면
  | 'design-method' // 디자인 시안 작성 방식 선택 화면
  | 'layout-design' // 레이아웃 직접 작성 화면
  | 'ai-prompt-design' // AI 프롬프트 작성 화면
  | 'html-editor' // HTML 파싱/변환 결과 편집 화면
  | 'editor' // 기존 템플릿 수정 화면
  | 'preview' // 최종 미리보기 화면
```

예상 흐름:

```txt
start
→ pdf-image-upload / design-method
→ file-upload / layout-design / ai-prompt-design
→ html-editor
→ preview
→ save
```

이 구조를 사용하면 같은 `BuilderApp`을 Nuxt 단독 페이지, iframe, web component에서 모두 재사용할 수 있다.

```txt
Nuxt 단독 실행
pages/index.vue → BuilderApp

iframe 방식
iframe page → BuilderApp

web component 방식
<t-cube-builder> → BuilderApp
```

Pinia store는 모든 UI 상태를 넣는 곳이 아니라, 여러 화면과 컴포넌트가 공유해야 하는 상태를 관리하는 곳으로 사용한다.

store에 두기 좋은 상태:

- 현재 view
- 현재 TemplateDocument
- 선택된 element id
- 업로드/import 상태
- AI 생성 상태
- 편집 dirty 여부

컴포넌트 내부에 둬도 되는 상태:

- hover 상태
- 드롭다운 열림 여부
- 작은 form 입력값
- 일시적인 버튼 토글 상태

## 7. 레이어별 책임

### pages

라우팅 진입점만 담당한다. 편집기 로직이나 업로드/AI 처리 로직을 직접 넣지 않는다.

예:

- `/builder/new`: 새 템플릿 생성
- `/builder/edit`: 기존 JSON 수정
- `/builder/preview`: 결과 미리보기

### components/builder

빌더 UI의 핵심 화면을 담당한다.

- `BuilderApp`: 빌더 최상위 컴포넌트
- `BuilderShell`: 전체 레이아웃
- `BuilderStage`: 편집 캔버스
- `BuilderInspector`: 선택 요소 속성 패널
- `ElementRenderer`: 템플릿 요소 렌더링
- `SelectionOverlay`: 선택/리사이즈 UI

### composables

복잡한 편집 로직을 Vue 컴포넌트에서 분리한다.

- 선택 상태
- 드래그/리사이즈
- undo/redo
- viewport mode
- import flow
- AI generation flow

### stores

전역에 가까운 편집 상태를 관리한다.

초기에는 `builder.ts`, `ui.ts` 정도로 시작한다.

- `builder.ts`: 현재 문서, 현재 페이지, 선택된 요소, dirty 상태
- `ui.ts`: 패널 열림/닫힘, zoom, viewport mode, modal 상태

AI와 undo/redo가 복잡해지면 별도 store 또는 composable로 분리한다.

### services

Vue와 무관한 순수 처리 로직을 담당한다.

- HTML → TemplateDocument
- PDF/이미지 → TemplateDocument
- AI 결과 → TemplateDocument
- TemplateDocument → 저장 payload
- 저장 payload → TemplateDocument
- validation

### integrations

외부 시스템과의 연결을 담당한다.

중요한 점은 `BuilderApp`이 CMS, iframe, web component를 직접 알면 안 된다는 것이다. 외부 연동은 adapter 레이어에 둔다.

## 8. 내부 템플릿 모델

초기 모델은 너무 복잡하게 시작하지 않고, 텍스트/이미지/도형/컨테이너 중심으로 설계한다.

```ts
export type TemplateDocument = {
  id: string
  version: number
  viewport: TemplateViewport
  pages: TemplatePage[]
  assets: TemplateAsset[]
  meta: TemplateMeta
}

export type TemplatePage = {
  id: string
  name: string
  width: number
  height: number
  elements: TemplateElement[]
}

export type TemplateElement = {
  id: string
  type: 'text' | 'image' | 'shape' | 'container'
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  locked?: boolean
  content?: string
  src?: string
  style: Record<string, string | number>
}

export type TemplateAsset = {
  id: string
  type: 'image' | 'font' | 'document'
  name: string
  src: string
  mimeType?: string
}
```

## 9. 저장 인터페이스

CMS 연동 구현은 나중에 하더라도 저장 payload의 모양은 초기에 정해야 한다.

```ts
export type BuilderSavePayload = {
  template: TemplateDocument
  assets: TemplateAsset[]
  metadata?: Record<string, unknown>
}
```

빌더 내부에서는 CMS API를 직접 호출하지 않고 save 이벤트만 발생시킨다.

```ts
function handleSave() {
  const payload = serializeTemplate()
  emit('save', payload)
}
```

초기 구현에서는 이 payload를 JSON preview, console output, file download 등으로 확인하면 된다.

## 10. 현재 단계의 구현 우선순위

```txt
1. BuilderApp 기본 레이아웃 구성
2. HTML 업로드 → 임시 TemplateDocument 변환
3. PDF/이미지 업로드 → 페이지 선택/AI 파싱 → 임시 TemplateDocument 변환
4. 디자인 시안 만들기 → AI 생성 → 임시 TemplateDocument 변환
5. 실제 구현 결과를 바탕으로 TemplateDocument JSON 스키마 정리
```

초기에는 최종 JSON 스키마를 먼저 확정하지 않는다. 각 입력 기능을 구현하면서 공통으로 필요한 필드를 확인하고, 마지막에 실제 구현 결과를 바탕으로 `TemplateDocument` 구조를 정리한다.

단, 각 입력 기능은 결과를 바로 화면에 꽂지 않고 반드시 임시 `TemplateDocument`로 변환한 뒤 `BuilderApp`에 전달한다.

```txt
HTML / PDF / Image / AI
→ Temporary TemplateDocument
→ BuilderApp
```

CMS로 실제 저장하는 과정은 후순위로 둔다. 초기 구현에서는 JSON Preview 또는 Download 수준으로 결과를 확인한다.

## 11. 주의할 점

- 원본 HTML을 그대로 편집 대상으로 삼지 않는다.
- 모든 입력은 내부 표준 모델인 `TemplateDocument`로 변환한다.
- `pages`에 편집 로직을 넣지 않는다.
- CMS 연동, iframe, web component 관련 코드는 `BuilderApp` 내부에 넣지 않는다.
- AI API key를 프론트에 직접 노출하지 않는다.
- PDF/이미지 AI 파싱은 프론트만으로 처리하기 어렵기 때문에 추후 서버리스 함수, Nuxt server route, CMS 프록시 등 안전한 실행 위치를 검토해야 한다.
