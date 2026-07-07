# T.CUBE

T.CUBE는 AI 기능이 결합된 템플릿 생성/편집기입니다.

기업용 CMS 또는 Headless CMS의 콘텐츠 생성 화면 안에서 비개발자가 마케팅 배너, 브릿지 페이지, 파셜 HTML 같은 템플릿을 만들고 편집할 수 있도록 돕는 웹 빌더를 목표로 합니다.

## 주요 기능

- HTML 파일을 업로드해 편집 가능한 템플릿으로 변환
- PDF 또는 이미지 시안을 업로드해 HTML 템플릿 초안 생성
- 레이아웃 블록을 직접 배치해 디자인 시안 작성
- AI 프롬프트를 기반으로 디자인 시안 생성
- 생성된 HTML 템플릿을 미리보고 편집
- 최종 결과물을 JSON payload 형태로 저장할 수 있는 구조 준비

## 기술 스택

- Nuxt 3
- Vue 3
- TypeScript
- Pinia

## 실행 방법

권장 Node.js 버전:

- Node.js 20.19.0 이상 21 미만
- 또는 Node.js 22.12.0 이상

의존성 설치:

```bash
pnpm install
```

개발 서버 실행:

```bash
pnpm dev
```

로컬 환경 개발 서버 실행:

```bash
pnpm dev:local
```

## AI API 키 설정

이미지/PDF 시안을 HTML로 변환하려면 Gemini API 키가 필요합니다.

프로젝트 루트에 `.env` 파일을 만들고 아래 값을 추가합니다.

```env
GEMINI_API_KEY=본인의_Gemini_API_키
GEMINI_IMAGE_TO_HTML_MODEL=gemini-2.5-flash
```

`.env` 파일은 Git에 포함하지 않습니다. 배포할 때도 동일한 key 이름으로 환경변수 등록을 해야합니다.

프로덕션 빌드:

```bash
pnpm build
```

stage 빌드:

```bash
pnpm build:stage
```

프로덕션 빌드 미리보기:

```bash
pnpm preview
```

## 디렉터리 구조

```txt
pages/        Nuxt 페이지 진입점
layouts/      공통 레이아웃
components/   화면 단위 UI 컴포넌트
stores/       전역에 가까운 빌더 상태
services/     HTML 파싱, 변환, 외부 연동 등 순수 처리 로직
server/       Nuxt server route와 서버 전용 처리
types/        공통 타입
assets/       전역 스타일과 정적 디자인 리소스
docs/         제품, 구조, 연동 방식 관련 문서
```

## 참고 문서

- [아키텍처](./docs/architecture.md)
- [프로젝트 구조 분석](./docs/analyze/01-project-structure.md)
- [빌더 결과물 전달 프로세스 분석](./docs/analyze/02-builder-result-delivery.md)
- [AI 작업 지침](./AGENTS.md)

## 개발 메모

- 패키지 매니저는 `pnpm`만 사용합니다.
- `.env` 값은 명시적인 요청 없이 수정하지 않습니다.
- `node_modules`, `.nuxt`, `.output` 내부 파일은 직접 수정하지 않습니다.
- 앱 전반에 영향을 주는 변경 후에는 가능하면 `pnpm build`로 확인합니다.
