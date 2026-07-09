# Store Architecture

## 역할

`stores`는 여러 화면과 컴포넌트가 공유해야 하는 전역에 가까운 상태를 관리한다.

현재 빌더에서는 화면 위치, viewport, 업로드 파일, 업로드/분석 상태, HTML 편집 문서, 선택된 편집 요소처럼 화면 흐름 전체에서 유지되어야 하는 값을 Pinia store에 둔다.

## 현재 구조

```txt
stores
├─ builder.ts
└─ builder
   ├─ view.ts
   ├─ upload.ts
   ├─ editor.ts
   └─ type
      └─ types.ts
```

## 구성 원칙

`stores/builder.ts`는 빌더 전역 상태를 조립하는 Pinia store다. 현재 store는 composable 흐름을 조립하지 않고 상태 관리 책임만 가진다.

상태 모듈은 관심사별로 나눈다.

- `view.ts`: 현재 빌더 화면과 viewport 상태
- `upload.ts`: 파일 업로드 유형, 업로드 파일, 분석 상태
- `editor.ts`: HTML 편집 문서, 선택 요소, dirty 상태
- `type/types.ts`: builder store와 관련 composable에서 공유하는 타입

파일 분석, AI 변환, 화면 이동 guard, 레이아웃 HTML 생성 같은 작업 흐름은 `composables` 하위 관심사별 composable에서 수행한다.

## 상태 분리 기준

store에 두기 좋은 상태:

- 여러 화면에서 공유되어야 하는 값
- 화면 전환 후에도 유지되어야 하는 값
- 파일 업로드, 편집 문서, 현재 view처럼 빌더 흐름의 기준이 되는 값
- 여러 컴포넌트가 함께 읽거나 변경하는 값

store에 두지 않는 것이 좋은 상태:

- hover, dropdown open 여부 같은 단일 컴포넌트 표시 상태
- 한 화면에서만 끝나는 임시 입력값
- API 요청 흐름, 취소 처리, 화면 이동 guard처럼 상태를 사용하는 작업 절차
- 입력값만 받아 결과를 반환하는 순수 변환 로직

## 컴포넌트에서 사용하는 방식

빌더 화면 컴포넌트는 필요한 관심사별 composable을 사용한다.

```ts
const builderView = useBuilderView()
const builderUpload = useBuilderUpload()
const builderHtmlGeneration = useBuilderHtmlGeneration()
```

`useBuilder*` composable은 store 상태와 관련 작업 흐름을 컴포넌트가 사용하기 쉬운 형태로 제공한다.

컴포넌트가 store를 직접 사용할 수도 있지만, 화면 이동 guard나 요청 취소 같은 정책이 필요한 경우에는 관련 composable을 우선 사용한다.

```ts
const builderStore = useBuilderStore()
```

## 작성 규칙

스토어 파일 최상단에는 해당 파일의 역할을 짧게 적는다.

함수, `computed`, `watch`, 라이프사이클 훅에는 JSDoc을 작성한다. 파라미터와 리턴값이 있으면 `@param`, `@returns` 설명을 포함한다.

주석은 문장형 종결보다 명사형 또는 짧은 설명형을 사용한다.

```ts
/**
 * 업로드 파일 유효성 검증
 *
 * @param file 검증할 파일
 * @returns 검증 실패 메시지, 성공 시 빈 문자열
 */
function validateUploadFile(file: File) {
  // ...
}
```
