# T.CUBE Architecture

## 1. 목적

이 문서는 T.CUBE의 주요 레이어, 데이터 흐름, 디렉터리 책임, 외부 연동 방향을 정의한다.

T.CUBE는 여러 입력 방식으로 들어온 디자인 자료를 편집 가능한 템플릿으로 만들고, 최종적으로 저장 가능한 payload를 생성하는 빌더 애플리케이션이다.

## 2. 전체 구조

T.CUBE는 Nuxt 애플리케이션 위에서 동작하며, 현재 구조는 빌더 화면, 상태 관리, HTML 처리, 서버 API, AI 변환 로직으로 나뉜다.

```txt
사용자 입력
→ Builder UI
→ Store / State
→ Client Service 또는 Server API
→ 변환 결과
→ Editor / Preview
→ Save Payload
```

입력 방식은 HTML, PDF, 이미지, AI 프롬프트처럼 여러 갈래가 될 수 있지만, 편집 화면은 가능한 한 공통된 빌더 흐름을 사용한다.

## 3. 주요 레이어

### Pages

`pages`는 Nuxt 라우팅 진입점이다.

현재 `pages/index.vue`는 빌더 레이아웃을 여는 진입점 역할을 한다. 실제 화면 전환과 빌더 단계 관리는 page routing보다 빌더 상태를 우선 사용한다.

### Layouts

`layouts`는 빌더 전체 화면의 공통 골격을 담당한다.

현재 `layouts/builder.vue`는 사이드바, 모바일 헤더, 상단 툴바, 본문 영역을 구성하고, Pinia store의 currentView 상태에 따라 화면 구성을 제어한다.

### Components

`components`는 화면 단위 UI를 담당한다.

- `components/builder`: 빌더 본문과 생성/편집 단계 화면
- `components/builder/view/create-template`: 새 템플릿 생성 화면
- `components/builder/view/edit-template`: 기존 템플릿 수정 화면
- `components/builder/upload`: 업로드 관련 UI
- `components/layouts`: 사이드바와 툴바
- `components/ui`: 공통 UI 요소

컴포넌트는 화면 표현과 사용자 이벤트 연결을 중심으로 작성하고, 파싱, 변환, 외부 API 처리 같은 로직은 store, service, server 계층으로 분리한다.

### Stores

`stores`는 여러 화면에서 공유해야 하는 빌더 상태를 관리한다.

현재 `stores/builder.ts`는 빌더 상태의 진입점이며, 내부 기능은 다음 파일로 나뉜다.

- `stores/builder/view.ts`: 현재 빌더 화면과 viewport 상태
- `stores/builder/upload.ts`: 파일 업로드와 import 상태
- `stores/builder/design.ts`: 레이아웃 디자인 상태
- `stores/builder/editor.ts`: HTML 편집 상태
- `stores/builder/type/types.ts`: 빌더 상태 타입

store에 두기 좋은 상태:

- 현재 view
- 업로드 파일과 업로드 상태
- 변환 중/완료/실패 상태
- 생성된 HTML 또는 편집 대상 데이터
- 선택된 레이아웃 블록
- preview, dirty, loading처럼 여러 컴포넌트가 공유하는 UI 상태

컴포넌트 내부에 두기 좋은 상태:

- hover 상태
- 작은 입력 필드의 임시 값
- 드롭다운 열림 여부
- 한 컴포넌트 안에서만 쓰는 표시 상태

### Services

`services`는 브라우저에서 처리 가능한 순수 로직을 담당한다.

현재 `services/html/parseHtmlDocument.ts`는 HTML 문서를 분석하고 편집 가능한 형태로 다루기 위한 클라이언트 측 처리 로직을 포함한다.

서비스 계층에는 다음 성격의 코드가 들어간다.

- HTML 파싱
- DOM 변환
- 템플릿 직렬화/역직렬화
- 파일 정보 가공
- 브라우저에서 안전하게 처리 가능한 순수 변환

### Server API

`server/api`는 클라이언트가 호출하는 Nuxt server route를 담당한다.

현재 빌더 관련 API:

- `server/api/builder/image-to-html.post.ts`
- `server/api/builder/pdf-to-html.post.ts`

AI API key, PDF/이미지 분석, 외부 모델 호출처럼 프론트엔드에 직접 넣기 어려운 처리는 server 계층에서 담당한다.

### Server Services

`server/services`는 서버 API 내부에서 사용하는 서버 전용 로직을 담당한다.

현재 빌더 관련 서버 서비스:

- `server/services/builder/imageToHtml.ts`
- `server/services/builder/pdfToHtml.ts`
- `server/services/builder/geminiToHtml.ts`
- `server/services/builder/prompts/*`

서버 서비스는 외부 AI 모델 호출, prompt 구성, fallback 결과 생성, 파일 변환 같은 무거운 처리를 담당한다.

### Types

`types`는 여러 계층에서 공유하는 타입을 담당한다.

현재 빌더 관련 타입:

- `types/builder/design-to-html.ts`
- `types/builder/image-to-html.ts`

API 응답, 저장 payload, 템플릿 모델처럼 여러 계층에서 함께 쓰는 타입은 이 계층에 둔다.

## 4. 빌더 단계 흐름

현재 빌더는 store의 currentView 상태를 기준으로 화면을 전환한다. 여기서 view는 Nuxt page route가 아니라 `BuilderApp` 안에서 렌더링할 화면 단위를 의미한다.

```txt
start
→ pdf-image-upload
→ file-upload
→ image-preview / pdf-preview / html-editor
→ ai-design
→ preview
```

대표 흐름:

```txt
HTML 업로드
→ 파일 분석
→ HTML 편집 화면
→ 미리보기
```

```txt
PDF / 이미지 업로드
→ 파일 미리보기
→ server API 호출
→ HTML 생성 결과 수신
→ HTML 편집 화면
```

```txt
레이아웃 작성
→ 블록 배치
→ HTML 생성
→ HTML 편집 화면
```

## 5. 데이터 흐름

### HTML 입력

```txt
FileDropzone
→ builder store
→ services/html/parseHtmlDocument
→ editor state
→ HTML editor / preview
```

HTML은 가능하면 브라우저에서 파싱하고, 편집 가능한 요소를 식별한 뒤 editor 상태로 전달한다.

### PDF / 이미지 입력

```txt
FileDropzone
→ builder store
→ /api/builder/pdf-to-html 또는 /api/builder/image-to-html
→ server service
→ AI 변환 또는 fallback
→ editor state
→ HTML editor / preview
```

PDF와 이미지는 AI 처리나 파일 분석이 필요할 수 있으므로 server route를 통해 처리한다.

### 레이아웃 입력

```txt
LayoutBuilder
→ layoutBlocks
→ HTML 생성
→ editor state
→ HTML editor / preview
```

사용자가 배치한 레이아웃 블록은 HTML 초안 생성의 입력으로 사용한다.

## 6. 외부 연동 방향

초기 구현에서는 빌더 본체와 외부 CMS 연동을 강하게 묶지 않는다.

권장 방향:

```txt
Builder Core
→ Save Payload 생성
→ Integration Adapter
→ CMS / iframe / web component
```

빌더 본체가 직접 알아야 하지 않는 것:

- CMS 인증 방식
- CMS 저장 API endpoint
- iframe `postMessage` 세부 구현
- web component `CustomEvent` 세부 구현
- 고객사별 tenant/domain/security 정책

이런 처리는 추후 adapter 계층에서 분리한다.

## 7. 보안과 실행 위치

- API key, token, secret은 프론트엔드 코드에 직접 노출하지 않음
- AI 모델 호출은 server route 또는 별도 백엔드에서 처리
- PDF/이미지 분석처럼 무거운 작업은 클라이언트 단독 처리보다 서버 처리 우선 고려
- iframe 연동 시 origin 검증과 CSP 정책 필요
- web component 연동 시 전역 CSS, 이벤트, z-index 충돌 주의

## 8. 확장 방향

### TemplateDocument

장기적으로는 HTML, PDF, 이미지, AI 입력을 공통 `TemplateDocument` 모델로 정규화하는 방향이 적합하다.

```txt
HTML / PDF / Image / AI
→ TemplateDocument
→ Builder Editor
→ Save Payload
```

다만 초기 구현에서는 실제 편집 흐름을 먼저 안정화하고, 구현 결과를 바탕으로 스키마를 점진적으로 정리한다.

### Integration Adapter

CMS 연동 방식이 정해지면 다음 adapter를 검토한다.

- `iframe` adapter: `postMessage` 기반 연동
- `web component` adapter: `CustomEvent` 기반 연동
- CMS bridge: 고객사 CMS 저장/불러오기 API와 연결

### 테스트와 검증

앱 전반에 영향을 주는 변경은 `pnpm build`로 확인한다.

향후 테스트 스크립트가 추가되면 다음 단위로 검증을 분리한다.

- HTML 파싱 서비스 단위 테스트
- store 상태 전환 테스트
- server API 응답 테스트
- 주요 빌더 플로우 E2E 테스트

## 9. 관련 문서

- [프로젝트 구조 분석](./analyze/01-project-structure.md)
- [빌더 결과물 전달 프로세스 분석](./analyze/02-builder-result-delivery.md)
