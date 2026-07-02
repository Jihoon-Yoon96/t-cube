# 빌더 결과물 전달 프로세스 분석

## 1. 배경

T.CUBE는 CMS 또는 Headless CMS의 콘텐츠 생성 화면 안에서 실행되는 빌더다. 사용자는 빌더에서 템플릿을 생성하거나 수정하고, 최종 결과물은 CMS가 저장할 수 있는 JSON 형태로 전달되어야 한다.

현재 팀 내부에서 검토해야 하는 주요 선택지는 다음 두 가지다.

- iframe 방식
- web component 방식

아직 어떤 방식을 선택할지 확정하지 않아도 된다. 다만 빌더 본체와 외부 연동 방식을 분리해야 한다.

```txt
Builder Core
→ 실제 템플릿 생성/편집 기능

Integration Adapter
→ iframe, web component, Nuxt page, CMS bridge
```

## 2. 공통 설계 원칙

iframe과 web component 중 어느 쪽을 선택하더라도 빌더의 핵심 구조는 동일해야 한다.

```txt
초기 데이터 입력
→ BuilderApp
→ TemplateDocument 편집
→ BuilderSavePayload 생성
→ 외부 adapter가 CMS에 전달
```

`BuilderApp`은 CMS를 직접 알면 안 된다.

하지 말아야 할 것:

```txt
BuilderApp 내부에서 CMS API 직접 호출
BuilderApp 내부에서 postMessage 직접 처리
BuilderApp 내부에서 CustomEvent 직접 처리
BuilderApp 내부에서 고객사 도메인 분기 처리
```

해야 할 것:

```txt
BuilderApp은 props로 initial value를 받는다.
BuilderApp은 save/change/cancel/error 이벤트를 emit한다.
외부 연동 방식은 adapter에서 처리한다.
```

예시:

```vue
<BuilderApp
  :initial-value="templateJson"
  mode="edit"
  theme="dark"
  @save="handleSave"
  @cancel="handleCancel"
/>
```

## 3. 공통 payload 계약

저장 payload의 형태는 초기에 정해두는 것이 좋다.

```ts
export type BuilderInitialPayload = {
  mode: 'create' | 'edit'
  template?: TemplateDocument
  theme?: 'light' | 'dark'
  locale?: 'ko' | 'en'
  tenantId?: string
  contentId?: string
}

export type BuilderSavePayload = {
  template: TemplateDocument
  assets: TemplateAsset[]
  metadata?: Record<string, unknown>
}

export type BuilderErrorPayload = {
  code: string
  message: string
  details?: unknown
}
```

이 계약을 유지하면 iframe, web component, 독립 Nuxt 페이지 모두 같은 빌더 본체를 사용할 수 있다.

## 4. iframe 방식

### 4.1 개념

CMS 화면에서 빌더를 별도 URL의 iframe으로 띄운다.

```html
<iframe
  src="https://builder.tcube.com/embed/builder"
  sandbox="allow-scripts allow-forms allow-same-origin"
  referrerpolicy="strict-origin-when-cross-origin"
></iframe>
```

빌더와 CMS는 `postMessage`로 통신한다.

```txt
CMS
→ iframe Builder 로드
→ 초기 JSON/설정 전달
→ Builder에서 편집
→ Builder가 save message 전달
→ CMS가 자기 저장 API로 저장
```

### 4.2 보안 고려사항

iframe 자체가 취약한 방식은 아니다. 오히려 문서, CSS, JS 실행 환경을 분리할 수 있다. 다만 `postMessage` 보안 검증을 반드시 해야 한다.

CMS에서 빌더로 메시지를 보낼 때는 target origin을 명확히 지정한다.

```ts
iframe.contentWindow?.postMessage(message, 'https://builder.tcube.com')
```

빌더는 메시지를 받을 때 origin을 검증한다.

```ts
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://cms.customer.com') return
})
```

CMS도 빌더가 보낸 메시지의 origin을 검증해야 한다.

```ts
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://builder.tcube.com') return
})
```

빌더 서버는 허용된 CMS 도메인에서만 iframe으로 열릴 수 있도록 `Content-Security-Policy`를 설정하는 것이 좋다.

```http
Content-Security-Policy: frame-ancestors https://cms.customer.com https://cms.example.com;
```

### 4.3 CMS 성능 영향

iframe은 별도 문서로 실행된다. 따라서 다음 요소가 CMS와 분리된다.

```txt
DOM 트리
CSS 계산 범위
JS 전역 스코프
라우팅
전역 이벤트
일부 에러 영향
```

빌더가 무거워도 CMS의 DOM/CSS/JS와 직접 섞이지 않는다. 다만 같은 브라우저 탭에서 실행되므로 CPU와 메모리 사용량은 완전히 독립적이지 않다.

### 4.4 CSS 충돌

iframe은 별도의 document를 가지므로 CSS 충돌이 거의 없다.

```txt
CMS의 .button 스타일
→ iframe 내부 button에 영향 없음

Builder의 .modal 스타일
→ CMS modal에 영향 없음
```

기업 고객사마다 CMS 스타일 환경이 다를 수 있다는 점을 고려하면 iframe의 CSS 격리는 큰 장점이다.

### 4.5 결과물 JSON 전달 방법

`postMessage`를 사용한다.

Builder iframe 내부:

```ts
window.parent.postMessage({
  source: 'tcube-builder',
  version: '1.0',
  type: 'SAVE',
  payload: {
    template,
    assets,
    metadata
  }
}, 'https://cms.customer.com')
```

CMS 부모 페이지:

```ts
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://builder.tcube.com') return
  if (event.data?.source !== 'tcube-builder') return

  if (event.data.type === 'SAVE') {
    saveToCms(event.data.payload)
  }
})
```

### 4.6 기존 JSON 불러오기

가장 추천하는 방식은 CMS가 기존 JSON을 불러와서 iframe 빌더에 전달하는 것이다.

```txt
CMS가 기존 컨텐츠 JSON 조회
→ iframe Builder 로드
→ postMessage로 initialValue 전달
→ Builder가 해당 JSON을 렌더링
```

이 방식의 장점:

- 빌더가 CMS 인증을 몰라도 된다.
- 고객사별 CMS API 차이를 빌더가 알 필요가 없다.
- 권한 처리를 CMS 책임으로 둘 수 있다.

빌더가 직접 CMS API를 호출하는 방식은 가능하지만 CORS, 인증, 권한, 고객사별 API 차이 때문에 복잡도가 올라간다.

### 4.7 제품 판매/배포 모델

iframe 방식에서는 빌더가 별도 도메인에 배포되는 것이 일반적이다.

예:

```txt
CMS:
https://cms.customer.com

Builder:
https://builder.tcube.com
또는
https://builder.customer.com
```

배포 모델:

```txt
1. SaaS 중앙 배포
   builder.tcube.com

2. 고객사별 서브도메인
   customer-a-builder.tcube.com

3. 온프레미스/고객사 내부망 배포
   builder.customer-internal.com
```

과금 모델은 제품 전략에 따라 나뉜다.

```txt
CMS에 빌더 포함 판매
→ 고객은 CMS 비용만 지불

CMS + Builder Add-on 판매
→ CMS 기본 비용 + 빌더 옵션 비용

AI 기능 사용량 기반 과금
→ 빌더 옵션 비용 + AI 사용량 과금
```

AI 기능이 포함되므로 장기적으로는 `Builder Add-on` 또는 `AI Template Builder 옵션`으로 분리하는 것이 유연하다.

## 5. web component 방식

### 5.1 개념

CMS 페이지에 SDK 스크립트를 삽입하고 custom element를 사용한다.

```html
<script src="https://cdn.tcube.com/tcube-builder.js"></script>

<t-cube-builder
  mode="create"
  theme="dark"
  content-id="123"
></t-cube-builder>
```

기존 JSON 수정:

```ts
const builder = document.querySelector('t-cube-builder')

builder.initialValue = templateJson

builder.addEventListener('tcube:save', (event) => {
  saveToCms(event.detail)
})
```

### 5.2 CMS 성능 영향

web component는 CMS 페이지 안에서 직접 실행된다. SDK가 커지면 CMS에 다음 영향이 생긴다.

```txt
초기 JS 다운로드 증가
JS 파싱/컴파일 시간 증가
메인 스레드 점유 증가
메모리 사용량 증가
전역 이벤트 충돌 가능성 증가
외부 라이브러리 충돌 가능성 증가
```

빌더는 일반 위젯보다 무거운 앱이다.

```txt
드래그 앤 드롭
선택/리사이즈
PDF/이미지 처리
AI 프롬프트 UI
템플릿 렌더러
undo/redo
미리보기
```

이 기능들이 CMS와 같은 런타임에서 실행되면 CMS 자체가 느려졌다고 느낄 수 있다.

완화 방법:

```txt
작은 loader만 먼저 로드
사용자가 빌더를 열 때 editor bundle lazy load
PDF/AI 기능은 필요한 시점에 별도 lazy load
```

### 5.3 CSS 충돌

Shadow DOM을 사용하면 대부분의 스타일 충돌을 줄일 수 있다.

```ts
customElement.attachShadow({ mode: 'open' })
```

다만 iframe만큼 완전한 격리는 아니다.

주의할 요소:

```txt
전역 font/reset CSS 영향
CSS variables 상속
body/html 스타일 영향
z-index, modal, overlay 충돌
focus trap 충돌
keyboard event 충돌
외부 라이브러리의 전역 스타일 충돌
```

web component는 작은 위젯에는 적합하지만, 전체 빌더 앱을 담으면 설계 난이도가 올라간다.

### 5.4 결과물 JSON 전달 방법

web component 방식에서는 `CustomEvent`를 사용한다.

```ts
element.dispatchEvent(new CustomEvent('tcube:save', {
  detail: {
    template,
    assets,
    metadata
  }
}))
```

CMS는 이벤트를 구독한다.

```ts
builder.addEventListener('tcube:save', (event) => {
  saveToCms(event.detail)
})
```

이벤트 이름은 `save`처럼 일반적인 이름보다 `tcube:save`처럼 네임스페이스를 붙이는 것이 좋다.

## 6. iframe vs web component 비교

| 항목 | iframe | web component |
| --- | --- | --- |
| CSS 격리 | 매우 강함 | Shadow DOM 사용 시 강하지만 iframe보다 약함 |
| JS 격리 | 강함 | 약함 |
| CMS 성능 영향 | 상대적으로 낮음 | SDK가 커질수록 높음 |
| 통합 UX | 약간 분리된 느낌 가능 | 자연스럽게 통합 가능 |
| 보안 모델 | postMessage/origin/CSP 중요 | SDK 신뢰/전역 충돌 관리 중요 |
| 배포 | 별도 빌더 도메인 필요 | CDN SDK 배포 가능 |
| B2B 고객사 대응 | 유리 | 고객사 환경 영향 많이 받음 |
| 무거운 빌더 앱 적합성 | 높음 | 설계 난이도 높음 |

## 7. 추천 방향

현재 제품 특성을 고려하면 iframe 방식이 더 안전하고 B2B 친화적이다.

이유:

- 빌더가 단순 위젯이 아니라 무거운 편집기 앱이다.
- PDF/이미지/AI/캔버스 편집 기능이 포함된다.
- 고객사 CMS 환경이 다양할 수 있다.
- CSS/JS 충돌을 최소화해야 한다.
- CMS와 빌더가 모두 솔루션 제품으로 판매될 수 있다.
- 고객사별 보안 정책과 배포 모델 대응이 필요하다.

다만 최종 결정을 미뤄도 된다. 현재는 다음 구조로 가면 된다.

```txt
Core Builder
→ BuilderApp, TemplateDocument, serializer, importer, editor logic

Integration Adapter
→ iframeBridge 또는 webComponentBridge
```

## 8. 하이브리드 옵션

현실적인 대안은 web component를 빌더 본체가 아니라 가벼운 launcher로 사용하는 방식이다.

```html
<script src="https://cdn.tcube.com/tcube-launcher.js"></script>
<t-cube-builder-launcher></t-cube-builder-launcher>
```

동작:

```txt
CMS에는 가벼운 SDK만 삽입
SDK가 버튼/모달/iframe host 생성
실제 Builder는 iframe으로 별도 도메인에서 실행
결과 JSON은 postMessage로 전달
```

장점:

- 도입은 SDK처럼 쉽다.
- 빌더는 iframe으로 격리된다.
- CMS 성능 영향이 적다.
- CSS 충돌이 거의 없다.
- B2B 고객사별 배포/권한 관리가 쉽다.

## 9. 현재 단계에서 할 일

아직 iframe/web component 중 하나를 확정하지 않아도 된다.

지금 필요한 것은 다음이다.

```txt
1. BuilderApp을 독립 실행 가능한 컴포넌트로 만든다.
2. TemplateDocument와 BuilderSavePayload 계약을 정의한다.
3. 저장 시 CMS API를 직접 호출하지 않고 save 이벤트만 발생시킨다.
4. 초기에는 JSON preview/download로 결과를 확인한다.
5. integration adapter는 나중에 iframe 또는 web component 결정 후 구현한다.
```

## 10. 결론

빌더 결과물 전달 방식은 나중에 결정해도 된다. 단, 빌더 본체가 연동 방식을 몰라야 한다.

현재 구현 범위는 다음으로 잡는다.

```txt
지금 구현
→ 템플릿 생성/편집 기능
→ HTML 업로드
→ PDF/이미지 업로드
→ 디자인 시안 만들기
→ TemplateDocument 생성
→ BuilderSavePayload 생성
→ JSON preview/download

나중에 구현
→ iframe postMessage 연동
→ web component CustomEvent 연동
→ CMS 기존 JSON 불러오기
→ CMS 저장 API 연동
→ tenant/domain/security 정책
```

이렇게 하면 팀 회의 후 iframe으로 결정되든 web component로 결정되든, 빌더 본체를 크게 바꾸지 않고 integration adapter만 추가하면 된다.

