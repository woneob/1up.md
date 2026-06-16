# AGENTS.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트

**1up.md** 정적 블로그 — Astro 6, Cloudflare Pages 배포. 한국어 콘텐츠(`lang: ko`). 테스트 및 린트 도구 없음. Node.js ≥ 22.12.0 필요.

## 명령어

```bash
npm run dev        # astro dev — http://localhost:4321 (host: true, LAN 공개). 배포용 src/content/posts 로드
npm run dev:draft  # astro dev --mode draft — gitignore된 src/content.draft/posts(로컬 초안)만 로드
npm run build      # astro build — /dist 에 정적 파일 출력
npm run preview    # astro preview — 빌드 결과 미리보기
```

> 콘텐츠 소스 선택은 [콘텐츠 모델](#콘텐츠-모델--포스트) 참조.

## 경로 별칭

`~/` → `src/`. [astro.config.mjs](astro.config.mjs)(Vite resolve)와 [jsconfig.json](jsconfig.json) 양쪽에 정의되어 있음. 항상 `~/components/...`, `~/data/...`, `~/utils/...`, `~/styles/...` 로 임포트.

## 콘텐츠 모델 — 포스트

포스트는 [src/content/posts/](src/content/posts/) 안에 **디렉토리** 단위로 존재하며, 단일 파일이 아님. 폴더명은 정규식(`/^(\d{4}-\d{2}-\d{2})\.(.+)$/`)으로 엄격하게 파싱됨:

```
src/content/posts/
  2025-11-24.bulkhead-pattern/
    index.md
    images/
      cover.{jpg|jpeg|png|webp}   # 선택사항, 인덱스 페이지에서 자동 발견
```

- **URL 슬러그**는 날짜 뒤의 부분만 사용 (예: `2025-11-24.bulkhead-pattern` → `/bulkhead-pattern`).
- `YYYY-MM-DD.slug` 형식에 맞지 않는 폴더는 빌드 시 에러 발생 — [src/pages/[slug].astro](src/pages/[slug].astro), [src/pages/index.astro](src/pages/index.astro) 참조.
- 템플릿에서 사용하는 프론트매터 필드: `title`, `description`, `pubDate`(ISO + 타임존), `tags`(배열), 선택적 `robots`, 선택적 `unlisted`([비공개 발행](#비공개-발행--unlisted) 참조).
- **멀티라인 제목**: `title` 을 YAML 블록 스칼라 `|-` 로 여러 줄 작성하면(값에 `\n` 포함) 상세 페이지 [src/pages/[slug].astro](src/pages/[slug].astro)가 `title.includes('\n')` 로 자동 감지해 h1 에 `multilineTitle` 클래스 부여 → `white-space: pre-line` 으로 줄바꿈 + `::first-line` 으로 첫 줄 작게 표시. 별도 플래그 불필요.
- 커버 이미지는 [src/utils/posts.js](src/utils/posts.js)의 `import.meta.glob('/src/content/posts/*/images/cover.{jpg,jpeg,png,webp}')` 로 **디렉토리 단위** 매칭 — 포스트 직속 `images/cover.*` 경로에 있는 파일만 인식됨 (데모 폴더 등 하위는 잡히지 않음).

### 콘텐츠 소스 — 배포용 vs 로컬 초안

포스트 소스 디렉토리는 실행 모드에 따라 둘 중 하나로 결정됨:

- **`src/content/posts/`** — 배포되는 실제 포스트. 커밋 대상. `npm run dev` / `npm run build` 가 사용.
- **`src/content.draft/posts/`** — 로컬 테스트용 초안. **gitignore**([.gitignore](.gitignore))되어 커밋·배포되지 않음. `npm run dev:draft`(`astro dev --mode draft`)가 **이것만** 사용 (배포 포스트와 섞이지 않음). 구조는 `content/posts/` 와 동일 (`images/`, `demos/` 포함).

[src/utils/posts.js](src/utils/posts.js)에서 `import.meta.env.MODE === 'draft'` 여부로 소스를 고름. `import.meta.glob` 은 패턴에 변수/템플릿 보간을 허용하지 않으므로(정적 문자열 리터럴만 가능 — `` `/src/${dir}/...` `` 는 빌드 에러), prod/dev 글로브를 **쌍으로 선언**하고 `pick(prod, dev)` 헬퍼로 선택함. 데모 글로브도 같은 방식이며 `getDemoModules()` 로 노출됨.

### 포스트 로딩 메커니즘

모든 포스트 접근은 [src/utils/posts.js](src/utils/posts.js)의 `getAllPosts()` / `getPostBySlug(slug)` 를 거침 — 이 모듈이 `import.meta.glob('/src/content/posts/*/index.md', { eager: true })` 의 단일 출처이며, 폴더명 정규식 파싱(`/^(\d{4}-\d{2}-\d{2})\.(.+)$/`), 커버 이미지 매칭, `pubDate` 내림차순 정렬, `readingTime` 계산을 모두 수행. 반환 객체는 `{ slug, date, dir, frontmatter, module, cover, stats }` 형태. **Content Collections 설정 없음** (`src/content.config.ts` 미존재); `getCollection()`과 `astro:content`는 의도적으로 사용하지 않음. RSS 피드는 프론트매터(`title`, `description`, `pubDate`, `tags`)를 직접 읽어 RSS 2.0 XML을 수동 생성 — Astro 6 / Zod 4 비호환 문제([withastro/astro#15792](https://github.com/withastro/astro/issues/15792))를 회피하기 위해 `@astrojs/rss` 의존성을 제거한 것임. 새로운 포스트 탐색 코드를 추가할 때는 페이지/엔드포인트에서 `import.meta.glob` 을 다시 호출하지 말고 이 헬퍼를 통해 접근할 것.

### 비공개 발행 — `unlisted`

프론트매터에 `unlisted: true` 를 지정하면 **운영에 발행된 상태지만 모든 연결점에서 제외**되고 **포스트 URL 직접 입력 시에만** 정상 열람됨 (운영환경 최종 확인용).

- 제외 범위: 인덱스 목록·태그 목록/태그별 페이지·RSS·llms.txt·사이트맵. 모두 [src/utils/posts.js](src/utils/posts.js) `getAllPosts()` 단일 출처를 거치므로, `getAllPosts()` 가 **기본적으로 `unlisted` 를 필터링**하여 한 번에 처리됨.
- 직접 URL 열람: `getPostBySlug(slug)` 는 `unlisted` 와 무관하게 찾고, [src/pages/[slug].astro](src/pages/[slug].astro)의 `getStaticPaths` 만 `getAllPosts({ includeUnlisted: true })` 로 호출해 **상세 페이지 자체는 생성**됨 → 슬러그 URL 로 접근 가능.
- 사이트맵: `@astrojs/sitemap` 은 빌드된 라우트에서 자동 생성되므로 `getAllPosts()` 필터가 닿지 않음. [astro.config.mjs](astro.config.mjs)의 `sitemap({ filter })` 가 별도로 제외함 — config 컨텍스트는 `import.meta.glob`(posts.js)을 못 쓰므로 `content`·`content.draft` 포스트 디렉토리를 fs 로 직접 스캔해 `unlisted: true` 슬러그 URL 집합을 만들어 거른다(프론트매터 정규식 매칭은 posts.js 와 별개로 중복 존재).
- 검색엔진 비색인까지 원하면 `robots: noindex` 를 함께 지정(별개 필드, 자동 연동 아님).

## 데모 페이지

포스트 본문에 iframe 으로 임베드할 인터랙티브 예제는 포스트 폴더 내부에 둠:

```
src/content/posts/2025-11-24.bulkhead-pattern/
  index.md
  demos/
    <demo-slug>/
      index.astro     # standalone HTML (DefaultLayout 미사용, <!doctype html>부터 작성)
      style.scss      # index.astro 에서 `import './style.scss'`
      script.js       # index.astro 의 <script>import './script.js'</script>
      images/         # 선택, 같은 폴더 기준 상대 import 가능
```

- 동적 라우트 [src/pages/[slug]/demos/[demoSlug].astro](src/pages/[slug]/demos/[demoSlug].astro) 가 [src/utils/posts.js](src/utils/posts.js)의 `getDemoModules()`(내부적으로 `import.meta.glob('/src/{content,content.draft}/posts/*/demos/*/index.astro', { eager: true })` — [콘텐츠 소스](#콘텐츠-소스--배포용-vs-로컬-초안) 참조)로 발견하여 `/<post-slug>/demos/<demo-slug>` 라우트를 자동 생성. 글로브를 라우트에서 직접 호출하지 않고 헬퍼를 거침.
- `index.astro` 는 standalone 페이지이므로 `<meta name="robots" content="noindex,nofollow">` 권장.
- SCSS / JS / 이미지는 같은 폴더 기준 상대 경로 import (Vite 가 번들 처리). 예: `import cover from './images/cover.png'`, SCSS의 `url('./images/bg.png')`. Vite가 절대 경로의 번들 자산으로 치환하므로 [URL 정책](#url-정책)의 영향을 받지 않음.
- 포스트 본문 (`index.md`) 에서는 상대 경로로 임베드: `<iframe src="demos/<demo-slug>" ...></iframe>`. 빌드 시 자동으로 절대 경로로 변환됨 ([마크다운 렌더링](#마크다운-렌더링) 참조).

## 사이트 설정

- [src/data/site.config.yml](src/data/site.config.yml) — 사이트명, 태그라인, 언어, 저자, SNS, 테마 색상, `siteIcons` 배열의 단일 출처. `@rollup/plugin-yaml`로 로드.
- [src/data/navigation.json](src/data/navigation.json) — 헤더 내비게이션. 각 항목은 `label`(body의 page id로도 사용), `base`(`DefaultLayout`에서 `Astro.url.pathname`과 접두사 매칭), `path`(href)로 구성.
- [src/pages/manifest.json.js](src/pages/manifest.json.js), [src/pages/robots.txt.js](src/pages/robots.txt.js), [src/pages/humans.txt.js](src/pages/humans.txt.js), [src/pages/rss.xml.js](src/pages/rss.xml.js), [src/pages/llms.txt.js](src/pages/llms.txt.js) 모두 `site.config.yml` 에서 파생 — 엔드포인트가 아닌 YAML을 수정할 것.

## 레이아웃 / page-id 규약

[src/layouts/DefaultLayout.astro](src/layouts/DefaultLayout.astro)는 `navigation.json`의 `base`와 `Astro.url.pathname`을 매칭하여 `<body id="page-{label}" data-layout-type="main|sub">` 를 설정. [src/styles/](src/styles/) 의 스타일은 이 id를 타겟으로 함 — 새 최상위 섹션을 추가할 때 nav 항목도 함께 추가해야 body id가 `page-unknown`이 되지 않음.

## 스타일

`@use` 모듈 방식의 Sass. 진입점: [src/styles/global.scss](src/styles/global.scss)(`functions`, `reset`, `font` 임포트).

## SPA 전환

[src/components/Head.astro](src/components/Head.astro)의 `<ClientRouter />`(astro:transitions)가 SPA 스타일 네비게이션을 담당 — 헤더가 다시 로드되며 발생하는 플리커링 방지가 도입 목적. 시각적 전환 효과 의도는 없으며, [src/styles/global.scss](src/styles/global.scss)의 `::view-transition-old/new(root) { animation: none }` 규칙이 `document.startViewTransition()`의 기본 cross-fade를 끔.

`<ClientRouter />`는 `import.meta.env.PROD` 가드로 **프로덕션 빌드에서만** 렌더링됨. dev에서는 라우터의 트랜지션 스왑이 SCSS HMR과 충돌해 이전 CSS가 남아 깜빡이는데, ClientRouter는 배포 사이트 네비게이션용이라 dev에 불필요하므로 제외함. SPA 네비게이션을 실제로 확인하려면 `npm run preview`(빌드 결과, PROD)로 볼 것.

`<ClientRouter />`가 끌어오는 `transitions-*` 가상 모듈은 Vite 초기 dep 스캔에 안 잡혀, 콜드 스타트 첫 로드 때 뒤늦게 발견되며 재최적화 → 리로드를 유발함(부작용으로 dev-toolbar entrypoint가 `504 Outdated Optimize Dep`로 고착). 이를 막기 위해 [astro.config.mjs](astro.config.mjs)의 `vite.optimizeDeps.include`에 해당 모듈들을 미리 포함시켜 둠 — 제거하지 말 것.

## 빌드 타임 상수

`import.meta.env.BUILD_TIME`은 [astro.config.mjs](astro.config.mjs)의 Vite `define`으로 주입되는 빌드 시점 ISO 타임스탬프.

## URL 정책

trailing slash 없음으로 통일. [astro.config.mjs](astro.config.mjs) 에서 `trailingSlash: 'never'` + `build.format: 'file'` 로 설정되어 있어 정적 출력은 `/foo/index.html` 가 아닌 `/foo.html` 형태이며 캐노니컬 URL은 `/foo`. 내부 링크 작성 시 항상 슬래시 없이 작성하고, 마크다운 raw HTML에서 `demos/foo/` 처럼 끝 슬래시를 넣어도 [resolve-post-relative-urls 플러그인](src/plugins/resolve-post-relative-urls.mjs)이 빌드 시 제거함.

**`build.format: 'file'` 부작용 — `Astro.url.pathname`이 파일 경로를 반환함:** 정적 빌드 시 `Astro.url.pathname`은 라우트 경로(`/`, `/about`) 대신 출력 파일 경로(`/index.html`, `/about.html`)를 반환함. `DefaultLayout.astro`의 `getPageId`와 `layoutType` 계산에서 `/index.html`을 루트로 처리하는 조건이 이 때문에 추가되어 있음. 경로 비교 로직을 추가할 때 이 점에 유의할 것.

## 마크다운 렌더링

- Shiki 테마: `nord` ([astro.config.mjs](astro.config.mjs)에서 설정).
- 커스텀 remark 플러그인 [src/plugins/resolve-post-relative-urls.mjs](src/plugins/resolve-post-relative-urls.mjs) 가 마크다운 raw HTML(`<iframe>`, `<img>` 등)의 `src`/`href` 상대 경로를 빌드 시 포스트 슬러그 기준 절대 경로로 자동 치환 (예: `<iframe src="demos/foo/">` → `<iframe src="/<post-slug>/demos/foo">`). 경로의 trailing slash 는 [URL 정책](#url-정책)에 따라 제거. 절대 경로(`/`), 프로토콜 (`http:`, `mailto:` 등), 앵커(`#`)는 변환 대상 아님. 마크다운 이미지 문법 (`![](path)`)은 Astro 자체 처리(Image optimization)를 따르며 이 플러그인의 영향을 받지 않음.
- 커스텀 remark 플러그인 [src/plugins/strip-h1.mjs](src/plugins/strip-h1.mjs) 가 본문의 H1(`# 제목`)을 **모두 제거**. 페이지 제목의 단일 출처는 frontmatter `title` 이며, 본문 H1 은 raw 마크다운을 뷰어로 볼 때의 가독성용 장식일 뿐 사이트에서는 의미가 없음. frontmatter `title` 과 내용이 다르거나 H1 이 복수여도 상관없이 전부 제거. remark(mdast) 단계라 Astro 의 heading 수집(rehype)보다 앞서므로 본문뿐 아니라 `getHeadings()` / 목차([PostToc](src/components/PostToc.astro))에도 H1 이 잡히지 않음.

## 조회수 (View Count)

포스트별 누적 조회수를 메타 영역(`[눈 아이콘] 1,234 views`)에 표시. 정적 사이트는 그대로 두고 **Cloudflare Pages Functions + D1**(서버리스 SQLite)로 카운트를 관리.

- **저장소**: Cloudflare D1(`1up-views` DB). 무료 티어(읽기 500만/일, 쓰기 10만/일)로 운영. KV는 쓰기 1천/일 한도라 카운터에 부적합해 채택 안 함. 스키마는 [migrations/0001_create_views.sql](migrations/0001_create_views.sql) (`views(slug PK, count)`). 바인딩 `DB` 는 [wrangler.toml](wrangler.toml)에 정의 — **`database_id` 는 실제 발급값으로 채워야 배포 동작**.
- **API**: [functions/api/views/[slug].js](functions/api/views/[slug].js) — `GET` 조회 / `POST` 원자적 +1(`INSERT ... ON CONFLICT DO UPDATE ... RETURNING`). [functions/api/views/index.js](functions/api/views/index.js) — `GET /api/views?slugs=a,b,c` 배치 조회(목록 페이지가 1요청으로 N개 카드 채움). `functions/` 디렉토리는 Astro 빌드와 무관하며 Pages 가 Worker 로 자동 서빙.
- **컴포넌트**: [src/components/ViewCount.astro](src/components/ViewCount.astro). [PostMeta](src/components/PostMeta.astro)(상세 + 비인덱스 카드)와 [PostCard](src/components/PostCard.astro) 인덱스 카드의 인라인 메타에 삽입. 아이콘은 기존 `data-type` 패턴(`metaIcon_views.svg`, global.scss 의 `$meta-names`)을 그대로 따름.
- **카운트 시점**: **상세 페이지 진입 시에만** +1. `increment` prop 이 true 인 인스턴스(상세 페이지의 해당 포스트)만 `POST`. 목록/카드는 표시만(`GET`). 중복 방지는 `localStorage['views:seen:<slug>']` 가드 — **새로고침·재방문은 재증가 안 함**.
- **환경별 표시 분기**(`import.meta.env`, 빌드 시점 결정):
  1. 운영 빌드(`astro build`, PROD) → API 호출, 실제 데이터
  2. 운영 + API 오류 → `N/A`
  3. 개발(`astro dev` / `dev:draft`, DEV) → **API 호출 없이** 슬러그 FNV-1a 해시 기반 고정 임의값(새로고침해도 동일). 로컬엔 Functions 가 없으므로 별개 데이터.
- ClientRouter(PROD 전용)와 호환: 스크립트는 `astro:page-load` 로 매 네비게이션 재실행, dev 에서는 `DOMContentLoaded` 로 1회 실행.
