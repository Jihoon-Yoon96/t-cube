# Store Architecture

## 역할

`stores`는 여러 화면과 컴포넌트가 공유해야 하는 전역에 가까운 상태를 관리한다. 컴포넌트 내부 표시 상태나 임시 입력값은 가능하면 컴포넌트에 두고, 업로드 상태, 현재 빌더 화면, 편집 문서, AI 생성 상태처럼 흐름 전체에서 공유되는 값만 store에 둔다.

현재는 `builder` 도메인을 중심으로 Pinia store를 구성한다.

```txt
stores
├─ builder.ts
└─ builder
   ├─ view.ts
   ├─ upload.ts
   ├─ design.ts
   ├─ editor.ts
   └─ type
      └─ types.ts
```

## 구성 원칙

`stores/builder.ts`는 외부 컴포넌트가 사용하는 단일 진입점이다. 내부 상태 모듈을 조립하고, 컴포넌트에는 `useBuilderStore()` 하나로 접근할 수 있는 API를 제공한다.

이 구조를 사용하는 이유는 store 내부의 관심사는 작게 나누되, 컴포넌트가 여러 store 조각을 직접 알고 조립하지 않게 하기 위해서다. 빌더 화면은 업로드, 화면 전환, 편집 문서, AI 생성 상태가 서로 자주 연결된다. 컴포넌트마다 `view.ts`, `upload.ts`, `editor.ts`, `design.ts`를 직접 가져다 쓰면 화면 코드가 store 내부 구조에 강하게 묶이고, 상태 전환 순서도 컴포넌트 여기저기에 흩어지기 쉽다.

따라서 `builder.ts`가 facade 역할을 한다. 내부에서는 상태를 기준별로 나누고, 외부에는 `useBuilderStore()`라는 하나의 안정적인 사용 지점을 제공한다. 이렇게 하면 추후 상태 모듈을 다시 쪼개더라도 컴포넌트 변경 범위를 줄일 수 있다.

`stores/builder/*.ts`는 상태 단위를 관리한다. 각 파일은 하나의 관심사만 다룬다.

- `view.ts`: 현재 빌더 화면과 viewport 상태
- `upload.ts`: 업로드 파일, 파일 유형, 분석 상태
- `design.ts`: 디자인 시안 작성 방식과 레이아웃 블록 상태
- `editor.ts`: HTML 편집 문서, 선택 요소, dirty 상태

`stores/builder/type/types.ts`는 builder store 내부와 관련 모듈에서 공유하는 타입만 관리한다. 여러 계층에서 함께 쓰는 API 응답 타입이나 저장 payload 타입은 `types` 디렉터리에 둔다.

## 상태 분리 기준

하나의 값이 여러 컴포넌트에서 공유되거나 화면 전환 후에도 유지되어야 하면 상태 모듈에 둔다. 특정 버튼 hover, 드롭다운 열림, 입력 중인 임시 문자열처럼 한 컴포넌트 안에서만 의미가 있는 값은 store에 넣지 않는다.

하나의 동작이 한 상태 모듈 안에서 끝나면 해당 상태 모듈의 함수로 둔다. 예를 들어 파일 검증과 업로드 상태 변경은 `upload.ts`에서 처리한다.

## View 상태

빌더 내부 화면 전환은 Nuxt page route가 아니라 `currentView` 상태를 기준으로 처리한다. 여기서 view는 `BuilderApp` 안에서 렌더링할 화면 단위다.

새 화면을 추가할 때는 다음 순서로 반영한다.

1. `stores/builder/type/types.ts`의 `BuilderView`에 view 값 추가
2. `stores/builder/view.ts`에서 화면 상태 추가
3. `components/builder/BuilderApp.vue`에서 해당 view 컴포넌트 렌더링
4. 사이드바 트리나 툴바처럼 view에 반응하는 UI 갱신

## 컴포넌트에서 사용하는 방식

컴포넌트는 내부 상태 모듈을 직접 조립하지 않고 `useBuilderStore()`를 사용한다.

```ts
const builderStore = useBuilderStore()
```

상태 모듈은 `stores/builder.ts` 안에서 조립한다. 이렇게 하면 컴포넌트는 store 내부 분리 구조를 몰라도 되고, 추후 iframe, web component, CMS 연동 방식이 바뀌어도 화면 코드의 영향 범위를 줄일 수 있다.

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
