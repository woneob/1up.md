# AGENTS.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트

**1up.md** 정적 블로그 — Astro 7, Cloudflare Pages 배포. 한국어 콘텐츠(`lang: ko`). 테스트 및 린트 도구 없음.

**Node 버전은 두 장치가 서로 다른 일을 한다 — 혼동하지 말 것.**

- **하한 가드** = [package.json](package.json)의 `engines.node: ">=22.12.0"` + [pnpm-workspace.yaml](pnpm-workspace.yaml)의 `engineStrict: true`. 하한값은 astro 7 자신의 `engines.node` 에서 온 것(`@astrojs/mdx` 도 동일). **`engineStrict` 없이는 경고만 뜨고 설치가 그냥 통과한다** — "프로젝트 자신의 engines 는 항상 실패시킨다"는 pnpm 문서 설명은 실측과 다르니 믿지 말 것(pnpm 11.13.0 기준 확인). 상한은 두지 않는다(미래 Node 의 파손을 미리 알 수 없으므로 하한만 선언하는 게 표준).
- **실제 빌드 Node** = [.nvmrc](.nvmrc) = `22`(Cloudflare v3 이미지 기본값 22.16.0 과 동일). 배포가 Node 메이저를 멋대로 따라 올라가지 않게 막는 건 이쪽이다. 로컬은 그보다 높은 Node(24 등)를 써도 가드만 통과하면 무방.
- **`devEngines.runtime` 은 쓰지 않는다**: 그건 가드가 아니라 **고정** 장치로, pnpm 이 지정 Node 를 내려받아 스크립트를 그 위에서 실행한다(로컬 Node 를 강제로 끌어내림). 여기선 "하한만 명확히, 최신 Node 사용은 허용" 이 방침이라 목적이 어긋난다.

## 패키지 매니저 — pnpm (npm 아님)

**pnpm 을 쓴다. `npm install` 을 하지 말 것** — `package-lock.json` 이 생기면 Cloudflare 가 npm 으로 설치해 아래 문제가 되살아난다. 의존성은 `pnpm add` / `pnpm install` 로만 다룬다.

- **버전의 단일 출처 = `packageManager` 필드**: [package.json](package.json)의 `packageManager: "pnpm@11.13.0"`. pnpm 은 **corepack 없이 스스로** 이 필드를 읽어 해당 버전을 내려받아 실행한다(pnpm 11 의 `pmOnFail: download` 기본값, pnpm 10 에선 `managePackageManagerVersions: true`). 로컬에 깔린 pnpm 이 다른 버전이어도 실제로 도는 건 여기 적힌 버전이며, **Cloudflare 빌드 이미지의 pnpm(v3 기본 10.11.1)도 같은 규칙으로 이 버전을 받아 실행**한다. pnpm 을 올릴 때 **이 값만 고치면** 로컬·CI 가 함께 따라온다.
  - **`PNPM_VERSION`(Pages 빌드 환경변수)은 일부러 설정하지 않는다**: v3 가 지원하긴 하나, 설정하면 버전이 대시보드와 package.json 두 곳으로 갈라져 업데이트 때마다 둘을 맞춰야 하고 어긋나면 조용히 CI 만 다른 pnpm 을 쓴다. 자동 스위칭에 맡기고 `packageManager` 하나만 둔다.
  - **corepack 도 쓰지 않는다**: Node.js TSC 결정으로 **corepack 은 Node 25+ 배포판에서 빠졌고**(별도 설치 필요), Cloudflare v3 도 corepack·`engines` 감지를 하지 않는다. pnpm 이 같은 기능을 내장하므로 도입 이득이 없다.
  - **부트스트랩만 있으면 된다**: 자동 스위칭은 *실행할 pnpm 이 하나라도 있을 때* 동작한다 — 즉 pnpm 이 전혀 없는 환경이라면 런처가 필요하다. 전역 설치(`npm i -g pnpm`, 버전 무관 — 어차피 `packageManager` 버전으로 위임됨) 또는 설치 없이 `npx pnpm install` 로 시작하면 된다. Cloudflare 는 이미지에 pnpm 10.11.1 이 들어 있어 별도 조치가 필요 없다.
- **왜 npm 을 버렸나**: Cloudflare v3 는 **npm 을 10.9.2 에 고정**하며(Node 를 24 로 올려도 npm 은 그대로), npm 버전을 바꾸는 `NPM_VERSION` 오버라이드는 **v1 빌드 시스템 전용**이라 v3 에선 못 쓴다. 반면 로컬은 npm 11 → `npm install` 이 `@napi-rs/wasm-runtime` 의 optional 의존성 `@emnapi/*` 를 lockfile 에서 가지치기하는데 CI 의 npm 10 은 그 노드를 요구 → `npm ci` 가 `Missing @emnapi/core from lock file` 로 실패했다. **CI 의 npm 메이저를 로컬에 맞출 방법이 없어 구조적으로 재발**하는 문제라, 버전을 양쪽에서 고정할 수 있는 pnpm 으로 옮겼다.

> ### ⚠️ pnpm 특유의 함정 — 아래 둘은 빼면 빌드가 깨진다
>
> - **`allowBuilds`** ([pnpm-workspace.yaml](pnpm-workspace.yaml)): pnpm 은 의존성의 build/postinstall 스크립트를 **기본 차단**한다. `@parcel/watcher`·`esbuild`·`sharp` 를 `true` 로 허용하지 않으면 네이티브 바이너리가 설치되지 않는다. 설정 자리는 **pnpm-workspace.yaml** — pnpm 11 은 package.json 의 `pnpm` 필드를 더 이상 읽지 않으며(경고만 내고 무시), 구 이름 `onlyBuiltDependencies` 도 v11 에서 `allowBuilds` 로 대체됐다. 워크스페이스(모노레포)가 아니어도 이 파일이 설정의 집이다.
> - **`sharp` 를 직접 의존성으로 선언**: pnpm 의 격리된(심링크) `node_modules` 에서는 Astro 가 **전이 의존성인 sharp 를 resolve 하지 못해** 이미지 최적화가 `MissingSharp` 로 실패한다. 그래서 devDependency 로 명시했다 — 지우지 말 것.

## 명령어

```bash
pnpm run dev          # node scripts/dev-with-search-index.mjs — astro dev 를 즉시 띄우고(http://localhost:4321, host: true, LAN 공개), 서버 ready 후 백그라운드로 검색 인덱스(dist/pagefind) 생성. 배포용 src/content/posts 로드
pnpm run dev:draft    # node scripts/dev-with-search-index.mjs --draft — 위와 동일하되 astro dev --mode draft + 백그라운드 build:draft. gitignore된 src/content.draft/posts(로컬 초안)만 로드
pnpm run build        # astro build && pagefind --site dist — /dist 에 정적 파일 + 검색 인덱스 출력
pnpm run build:draft  # astro build --mode draft && pagefind --site dist — 초안으로 dist/pagefind 생성(dev 검색 확인용)
pnpm run preview      # astro preview — 빌드 결과 미리보기
```

> `pnpm run build` 가 `pagefind --site dist` 까지 포함하므로 Cloudflare Pages 빌드 커맨드도 그대로 사용([검색](#검색--search) 참조).

> 콘텐츠 소스 선택은 [콘텐츠 모델](#콘텐츠-모델--포스트) 참조.

## 경로 별칭

`~/` → `src/`. [astro.config.mjs](astro.config.mjs)(Vite resolve)와 [jsconfig.json](jsconfig.json) 양쪽에 정의되어 있음. 항상 `~/components/...`, `~/data/...`, `~/utils/...`, `~/styles/...` 로 임포트.

## 콘텐츠 모델 — 포스트

포스트는 [src/content/posts/](src/content/posts/) 안에 **디렉토리** 단위로 존재하며, 단일 파일이 아님. 폴더명은 정규식(`/^(\d{4}-\d{2}-\d{2})\.(.+)$/`)으로 엄격하게 파싱됨:

```
src/content/posts/
  2025-11-24.bulkhead-pattern/
    index.mdx                     # 포스트 본문은 전부 MDX (데모 컴포넌트를 인라인 import 하기 위함)
    images/
      cover.{jpg|jpeg|png|webp}   # 선택사항, 인덱스 페이지에서 자동 발견
    demos/                        # 선택, 인라인 데모 컴포넌트 ([데모](#데모) 참조)
```

> **포스트는 `.md` 가 아니라 `.mdx`** — 인터랙티브 데모를 iframe 대신 컴포넌트로 본문에 인라인하기 위해 전 포스트가 MDX다([데모](#데모), [마크다운 렌더링](#마크다운-렌더링) 참조). `.md`/`.mdx` 공존 없음.

- **URL 슬러그**는 날짜 뒤의 부분만 사용 (예: `2025-11-24.bulkhead-pattern` → `/bulkhead-pattern`).
- `YYYY-MM-DD.slug` 형식에 맞지 않는 폴더는 빌드 시 에러 발생 — [src/pages/[slug].astro](src/pages/[slug].astro), [src/pages/index.astro](src/pages/index.astro) 참조.
- 템플릿에서 사용하는 프론트매터 필드: `title`, `description`, `pubDate`(ISO + 타임존), `tags`(배열), 선택적 `robots`, 선택적 `unlisted`([비공개 발행](#비공개-발행--unlisted) 참조), 선택적 `updatedDate`(수정일, ISO + 타임존 — JSON-LD `dateModified` 로 사용. 없거나 비면 `pubDate` 와 동일 값. [구조화 데이터](#구조화-데이터--json-ld) 참조. `pubDate` 와 다른 값이 지정되면 **상세 페이지에 한해** 발행일 뒤에 `(Updated: …)` 를 표기 — [PostMeta](src/components/PostMeta.astro) 가 `updatedDate` prop 을 받을 때만 출력하며 목록 카드([PostCard](src/components/PostCard.astro))는 넘기지 않아 표시 안 됨).
- **멀티라인 제목**: `title` 을 YAML 블록 스칼라 `|-` 로 여러 줄 작성하면(값에 `\n` 포함) 상세 페이지 [src/pages/[slug].astro](src/pages/[slug].astro)가 `title.includes('\n')` 로 자동 감지해 h1 에 `multilineTitle` 클래스 부여 → `white-space: pre-line` 으로 줄바꿈 + `::first-line` 으로 첫 줄 작게 표시. 별도 플래그 불필요.
- 커버 이미지는 [src/utils/posts.js](src/utils/posts.js)의 `import.meta.glob('/src/content/posts/*/images/cover.{jpg,jpeg,png,webp}')` 로 **디렉토리 단위** 매칭 — 포스트 직속 `images/cover.*` 경로에 있는 파일만 인식됨 (데모 폴더 등 하위는 잡히지 않음).

### 콘텐츠 소스 — 배포용 vs 로컬 초안

포스트 소스 디렉토리는 실행 모드에 따라 둘 중 하나로 결정됨:

- **`src/content/posts/`** — 배포되는 실제 포스트. 커밋 대상. `pnpm run dev` / `pnpm run build` 가 사용.
- **`src/content.draft/posts/`** — 로컬 테스트용 초안. **gitignore**([.gitignore](.gitignore))되어 커밋·배포되지 않음. `pnpm run dev:draft`(`astro dev --mode draft`)가 **이것만** 사용 (배포 포스트와 섞이지 않음). 구조는 `content/posts/` 와 동일 (`images/`, `demos/` 포함).

[src/utils/posts.js](src/utils/posts.js)에서 `import.meta.env.MODE === 'draft'` 여부로 소스를 고름. `import.meta.glob` 은 패턴에 변수/템플릿 보간을 허용하지 않으므로(정적 문자열 리터럴만 가능 — `` `/src/${dir}/...` `` 는 빌드 에러), prod/dev 글로브를 **쌍으로 선언**하고 `pick(prod, dev)` 헬퍼로 선택함. 포스트 모듈·readingTime 용 `?raw` 원문·커버 글로브 모두 같은 방식으로 pick() 을 거침.

### 포스트 로딩 메커니즘

모든 포스트 접근은 [src/utils/posts.js](src/utils/posts.js)의 `getAllPosts()` / `getPostBySlug(slug)` 를 거침 — 이 모듈이 `import.meta.glob('/src/content/posts/*/index.mdx', { eager: true })` 의 단일 출처이며, 폴더명 정규식 파싱(`/^(\d{4}-\d{2}-\d{2})\.(.+)$/`), 커버 이미지 매칭, `pubDate` 내림차순 정렬, `readingTime` 계산을 모두 수행. 반환 객체는 `{ slug, date, dir, frontmatter, module, cover, stats }` 형태. **readingTime 은 원문에서 계산하는데, MDX 모듈은 `.md` 와 달리 `rawContent()`/`compiledContent()` 를 export 하지 않으므로** 같은 파일을 `{ query: '?raw' }` 글로브로 한 번 더 로드해(키=파일 경로) 그 텍스트로 계산함. **Content Collections 설정 없음** (`src/content.config.ts` 미존재); `getCollection()`과 `astro:content`는 의도적으로 사용하지 않음. RSS 피드는 프론트매터(`title`, `description`, `pubDate`, `tags`)를 직접 읽어 RSS 2.0 XML을 수동 생성 — Astro 6 / Zod 4 비호환 문제([withastro/astro#15792](https://github.com/withastro/astro/issues/15792))를 회피하기 위해 `@astrojs/rss` 의존성을 제거한 것임. 새로운 포스트 탐색 코드를 추가할 때는 페이지/엔드포인트에서 `import.meta.glob` 을 다시 호출하지 말고 이 헬퍼를 통해 접근할 것.

### 비공개 발행 — `unlisted`

프론트매터에 `unlisted: true` 를 지정하면 **운영에 발행된 상태지만 모든 연결점에서 제외**되고 **포스트 URL 직접 입력 시에만** 정상 열람됨 (운영환경 최종 확인용).

- 제외 범위: 인덱스 목록·태그 목록/태그별 페이지·RSS·llms.txt·사이트맵. 모두 [src/utils/posts.js](src/utils/posts.js) `getAllPosts()` 단일 출처를 거치므로, `getAllPosts()` 가 **기본적으로 `unlisted` 를 필터링**하여 한 번에 처리됨.
- 직접 URL 열람: `getPostBySlug(slug)` 는 `unlisted` 와 무관하게 찾고, [src/pages/[slug].astro](src/pages/[slug].astro)의 `getStaticPaths` 만 `getAllPosts({ includeUnlisted: true })` 로 호출해 **상세 페이지 자체는 생성**됨 → 슬러그 URL 로 접근 가능.
- 사이트맵: `@astrojs/sitemap` 의존성 없이 [src/pages/sitemap.xml.js](src/pages/sitemap.xml.js) 라우트로 직접 생성(robots·rss·llms.txt 와 동일 패턴, [포스트 로딩 메커니즘](#포스트-로딩-메커니즘) 참조). `getAllPosts()` 단일 출처를 거치므로 `unlisted` 제외가 자동으로 따라옴 — config 에서 fs 스캔하던 별도 필터가 불필요해짐. 라우트 집합은 정적 페이지(`/`, `/about`, `/tags`) + 포스트 슬러그 + 태그별 페이지(`/tags/<tag>`)를 **명시적으로 열거**(태그는 `new URL` 로 경로 인코딩). **데모는 포스트에 인라인되는 컴포넌트라 독립 URL/라우트가 아예 없으니** 열거 대상 자체가 없음([데모](#데모) 참조). `@astrojs/sitemap` 의 자동 라우트 수집을 잃는 대가로, 새 최상위 섹션을 추가하면 이 엔드포인트에도 직접 더해야 함(navigation.json 과 동일한 수동 단일 출처 컨벤션).
  - **단일 `/sitemap.xml` + dev 서빙**: 라우트라서 `astro dev` 가 `/sitemap.xml` 을 그대로 서빙(별도 Vite 미들웨어·빌드 산출물 의존 없음). 인덱스/청크 분할 없이 단일 `urlset` — URL 수가 사이트맵 사양 한도(50000)에 한참 못 미쳐 충분. [robots.txt](src/pages/robots.txt.js)의 `Sitemap:` 도 `/sitemap.xml` 을 가리킴.
  - **`<lastmod>`**: 신뢰할 변경 신호가 있는 URL 에만 출력(없으면 생략 — `BUILD_TIME` 같은 가짜 값을 박으면 lastmod 신뢰도만 떨어뜨림). 포스트는 `updatedDate ?? pubDate`(JSON-LD `dateModified` 와 동일 규칙), 태그별 페이지는 그 태그를 단 포스트들의 최신값, 홈·`/tags` 인덱스는 전체 포스트 최신값, `/about` 은 날짜 신호가 없어 생략.
- 검색엔진 비색인까지 원하면 `robots: noindex` 를 함께 지정(별개 필드, 자동 연동 아님).

## 데모

포스트 본문의 인터랙티브 예제는 **iframe 이 아니라 Astro 컴포넌트로 본문에 인라인**한다. 데모는 포스트 폴더 내부에 둔다:

```
src/content/posts/2025-11-24.bulkhead-pattern/
  index.mdx
  demos/
    <demo-slug>/
      index.astro     # 인라인 프래그먼트 (standalone 문서 아님 — doctype/html/head/body 없음)
      script.js       # 선택, index.astro 의 <script>import './script.js'</script>
      images/         # 선택, 같은 폴더 기준 상대 import 가능
```

- **임베드**: MDX 포스트가 상대경로로 import 후 본문에 렌더한다.

  ```mdx
  import MotionMismatch from './demos/motion-mismatch/index.astro';

  ...본문...

  <MotionMismatch />
  ```

- **인라인 = 제로 CLS**: 컴포넌트가 빌드 시 SSR 되어 **첫 페인트부터 자연 높이**로 그려진다. iframe 처럼 별도 문서 로드→사이징 동기화가 없으므로 높이 점프(layout shift)가 원천적으로 없다. (iframe 시절의 `<meta robots noindex>` standalone 데모 페이지·동적 라우트 `[slug]/demos/[demoSlug].astro`·`getDemoModules()`·본문 iframe 상대경로 치환은 전부 제거됨.)
- **스타일 격리**: `index.astro` 의 `<style lang="scss">` 블록은 Astro 가 자동 스코프(`data-astro-cid-*`)하므로 포스트 스타일과 섞이지 않는다. iframe 문서 격리를 대체 — 원래 iframe 을 쓴 이유가 격리였으나 프로세스/보안 격리는 불필요해 스코프 스타일로 충분. (별도 `style.scss` side-effect import 는 전역이라 스코프 안 됨 → 스타일은 컴포넌트 `<style>` 안에 둘 것.)
- **JS/이미지**: `<script>import './script.js'</script>` 로 클라이언트 번들, 이미지는 같은 폴더 기준 상대 import (Vite 가 절대 경로 번들 자산으로 치환 → [URL 정책](#url-정책) 무관). 빈 `script.js` 는 번들에서 자동 제외됨.

## 사이트 설정

- [src/data/site.config.yml](src/data/site.config.yml) — 사이트명, 태그라인, 언어, 저자, SNS, 테마 색상, `siteIcons` 배열의 단일 출처. `@rollup/plugin-yaml`로 로드.
- [src/data/navigation.json](src/data/navigation.json) — 헤더 내비게이션. 각 항목은 `label`(body의 page id로도 사용), `base`(`DefaultLayout`에서 `Astro.url.pathname`과 접두사 매칭), `path`(href)로 구성.
- [src/pages/manifest.json.js](src/pages/manifest.json.js), [src/pages/robots.txt.js](src/pages/robots.txt.js), [src/pages/humans.txt.js](src/pages/humans.txt.js), [src/pages/rss.xml.js](src/pages/rss.xml.js), [src/pages/llms.txt.js](src/pages/llms.txt.js) 모두 `site.config.yml` 에서 파생 — 엔드포인트가 아닌 YAML을 수정할 것.

## 레이아웃 / page-id 규약

[src/layouts/DefaultLayout.astro](src/layouts/DefaultLayout.astro)는 `navigation.json`의 `base`와 `Astro.url.pathname`을 매칭하여 `<body id="page-{label}">` 를 설정. [src/styles/](src/styles/) 의 스타일은 이 id를 타겟으로 함 — 새 최상위 섹션을 추가할 때 nav 항목도 함께 추가해야 body id가 `page-unknown`이 되지 않음.

## 스타일

`@use` 모듈 방식의 Sass. 진입점: [src/styles/global.scss](src/styles/global.scss)(`variables`, `functions`, `reset`, `font` 임포트). 브레이크포인트는 [src/styles/_variables.scss](src/styles/_variables.scss)의 `$bp-content`(971px = 콘텐츠 폭 972 미만), `$bp-mobile`(600px) Sass 변수로 관리 — 미디어 쿼리에 하드코딩하지 말 것.

## 사전 로드 (preload) / Early Hints

폰트·CSS를 브라우저가 일찍 받도록 preload를 건다. **둘 다 `_headers`의 `Link:` 응답 헤더로** 내보낸다 — HTML `<link rel=preload>`는 Cloudflare가 103으로 승격하지 않기 때문(아래 참조).

- **`_headers` 생성** — [src/pages/[...headers].js](src/pages/[...headers].js)가 빌드 시 `dist/_headers`를 생성하는 단일 라우트. robots.txt/sitemap.xml 등과 같은 "파생 파일 = 엔드포인트" 컨벤션이지만, 파일명이 `_`로 시작하면(`_headers.js`) Astro 페이지 스캔에서 제외되므로, 루트 단일 세그먼트 [src/pages/[slug].astro](src/pages/[slug].astro)와 충돌하지 않는 catch-all `[...headers]`로 `_headers` 하나만 생성한다(`getStaticPaths`가 `_headers`만 반환, 정적 빌드라 그 경로만 출력). `public/_headers` 정적 파일을 두지 않는 이유 = CSS 해시를 담아야 하는데 public은 정적이라 불가(게다가 public이 있으면 우선이라 라우트가 skip됨).
- **폰트** — 정적 경로라 그대로 선언. 본문은 **Pretendard 가변 서브셋** `PretendardVariable.subset.woff2` 단일 파일(전 경로 `/*`), 순번 숫자 폰트(Outfit-ExtraLight)는 홈(`/`)만. `@font-face` 요청은 익명 CORS 모드라 `crossorigin` 필수(없으면 preload 파일 재사용 못 하고 중복 다운로드).
  - **Pretendard 서브셋 생성**: 원본 가변폰트(약 2MB)를 harfbuzz(`hb-subset`)로 ① 글리프를 Adobe-KR-9 Supplement 0(상용 현대 한글 2,780자) + 라틴·문장부호로 서브셋하고, ② `wght` 축을 `400:600` 으로 제한 → 단일 woff2 약 365KB. [_font.scss](src/styles/_font.scss)는 `font-weight: 400 600` **한 블록**으로 선언하며 400/500/600 굵기를 이 파일이 전부 커버(사용처의 `font-weight` 값은 무수정). 용량은 **사용 굵기 개수가 아니라 축 범위(400–600)** 로 정해짐 — 400↔600 보간 델타(`gvar`)가 보존되므로 3개 값만 써도 안 줄고, 재생성 시 범위를 바꿔야 변한다. Supplement 0(2,780) 정의는 [adobe-type-tools/Adobe-KR](https://github.com/adobe-type-tools/Adobe-KR)의 `akr9-hangul.txt` Field 4 = `0` 기준.
- **CSS** — 엔드포인트가 `import globalCssUrl from '~/styles/global.scss?url'`로 **Astro 실제 컴파일 해시 URL**을 얻어 `Link: <…>; rel=preload; as=style`로 출력. 컴파일된 CSS 기준 해시라 `_variables.scss` 등 `@use` 대상을 바꿔도 자동 갱신(캐시버스팅 정확 — 소스를 직접 해싱하는 "자가 해시"의 partial 누락 문제 없음). [Head.astro](src/components/Head.astro)의 `<link rel="stylesheet" href={globalCssUrl}>`도 **같은 `?url` 모듈**을 참조하므로 링크된 파일 = preload 파일이 항상 일치. (이 프로젝트는 컴포넌트 `<style>` 블록이 없어 `global.scss?url` = 사이트 전체 CSS라 누락 없음. side-effect `import '~/styles/global.scss'` 대신 `?url`을 쓰는 이유 = stylesheet와 preload가 같은 해시를 가리키게 하기 위함.) CSS가 Head.astro(=ClientRouter 컴포넌트)에 `<link>`로 남아 있어야 SPA 전환 시 스타일이 유지되는 원칙([SPA 전환](#spa-전환))도 지켜짐.

**Early Hints(103)**: Cloudflare Pages가 `Link:` **응답 헤더**를 URL별 별도 캐시에 추출해 두었다가, 다음 요청의 origin 대기시간에 200보다 먼저 `103`으로 발사한다. 이 힌트 캐시는 페이지 본문 캐시(`cf-cache-status`)와 **독립**이라 `DYNAMIC`이어도 발사됨(실측 확인). 존 설정에서 Early Hints가 켜져 있어야 하며, 힌트 조회는 origin 200과 비동기 경쟁이라 origin이 빠르면 생략될 수 있음(정상). 103이 아니어도 `Link:` 헤더는 200 응답 시점의 일반 preload로 동작하므로 어느 경우든 사전로드 목적은 달성.

> **HTML `<link rel=preload>`는 승격 안 됨(중요)**: Pages 문서는 HTML `<link>`도 자동 추출한다고 하지만, 이 사이트에선 캐시 HIT/DYNAMIC 여부와 무관하게 `Link:` 헤더·103에 반영되지 않음을 실측으로 확인. 그래서 CSS도 HTML이 아니라 `_headers` 응답 헤더로 내보내며, Head.astro에는 CSS `<link rel=preload>`를 두지 않는다(무효·중복). 응답 헤더 `Link:` 방식만 신뢰할 것.

**검증**: `chrome://net-export` 로그의 `HTTP_TRANSACTION_READ_EARLY_HINTS_RESPONSE_HEADERS → HTTP/1.1 103`으로 확인. Git Bash curl(Schannel 빌드, `--http2` 미지원)과 Node `http2` 프로브는 실제 발사되는 103을 못 잡는 false negative를 내니 검증 도구로 쓰지 말 것.

## SPA 전환

[src/components/Head.astro](src/components/Head.astro)의 `<ClientRouter />`(astro:transitions)가 SPA 스타일 네비게이션을 담당 — 헤더가 다시 로드되며 발생하는 플리커링 방지가 도입 목적. 시각적 전환 효과 의도는 없으며, [src/styles/global.scss](src/styles/global.scss)의 `::view-transition-old/new(root) { animation: none }` 규칙이 `document.startViewTransition()`의 기본 cross-fade를 끔.

`<ClientRouter />`는 `import.meta.env.PROD` 가드로 **프로덕션 빌드에서만** 렌더링됨. dev에서는 라우터의 트랜지션 스왑이 SCSS HMR과 충돌해 이전 CSS가 남아 깜빡이는데, ClientRouter는 배포 사이트 네비게이션용이라 dev에 불필요하므로 제외함. SPA 네비게이션을 실제로 확인하려면 `pnpm run preview`(빌드 결과, PROD)로 볼 것.

`<ClientRouter />`가 끌어오는 `transitions-*` 가상 모듈은 Vite 초기 dep 스캔에 안 잡혀, 콜드 스타트 첫 로드 때 뒤늦게 발견되며 재최적화 → 리로드를 유발함(부작용으로 dev-toolbar entrypoint가 `504 Outdated Optimize Dep`로 고착). 이를 막기 위해 [astro.config.mjs](astro.config.mjs)의 `vite.optimizeDeps.include`에 해당 모듈들을 미리 포함시켜 둠 — 제거하지 말 것.

## 빌드 타임 상수

`import.meta.env.BUILD_TIME`은 [astro.config.mjs](astro.config.mjs)의 Vite `define`으로 주입되는 빌드 시점 ISO 타임스탬프.

## URL 정책

trailing slash 없음으로 통일. [astro.config.mjs](astro.config.mjs) 에서 `trailingSlash: 'never'` + `build.format: 'file'` 로 설정되어 있어 정적 출력은 `/foo/index.html` 가 아닌 `/foo.html` 형태이며 캐노니컬 URL은 `/foo`. 내부 링크 작성 시 항상 슬래시 없이 작성. 포스트 본문의 raw HTML `html` 노드에 남는 상대 경로 끝 슬래시는 [resolve-post-relative-urls 플러그인](src/plugins/resolve-post-relative-urls.mjs)이 빌드 시 제거하며 슬러그 절대 경로로 바꾼다([마크다운 렌더링](#마크다운-렌더링) 참조).

**`build.format: 'file'` 부작용 — `Astro.url.pathname`이 파일 경로를 반환함:** 정적 빌드 시 `Astro.url.pathname`은 라우트 경로(`/`, `/about`) 대신 출력 파일 경로(`/index.html`, `/about.html`)를 반환함. `DefaultLayout.astro`의 `getPageId` 계산에서 `/index.html`을 루트로 처리하는 조건이 이 때문에 추가되어 있음. 경로 비교 로직을 추가할 때 이 점에 유의할 것.

## 마크다운 렌더링

- Shiki 테마: `nord` ([astro.config.mjs](astro.config.mjs)에서 설정).
- **마크다운 엔진 + MDX**: Astro 7 의 기본 마크다운 엔진은 Sätteri(Rust)지만, 커스텀 remark 플러그인을 쓰기 위해 [astro.config.mjs](astro.config.mjs)에서 `markdown.processor: unified(...)`(`@astrojs/markdown-remark`)로 **unified/remark 파이프라인을 명시적으로 opt-in** 한다. 플러그인은 이 `processor` **한 곳**에만 둔다. 포스트는 전부 `.mdx`([데모](#데모) 참조)라 `@astrojs/mdx` 통합(`integrations: [mdx()]`)이 렌더를 담당하는데, **MDX 는 `extendMarkdownConfig`(기본 true)로 `markdown.processor` 의 remark 플러그인과 shikiConfig 를 그대로 상속**하므로 `mdx()` 에는 아무 옵션도 넘기지 않는다.
  - **⚠️ `processor` 를 "`.md` 용 잔재"로 오해해 지우지 말 것.** Astro 7 에서 remark 플러그인의 **비deprecated 정식 경로는 `markdown.processor: unified(...)` 하나**뿐이다. `markdown.remarkPlugins` 도, `mdx({ remarkPlugins })` 도 **둘 다 deprecated 경고**를 내며 서로 `processor` 를 쓰라고 가리킨다. 그래서 `@astrojs/markdown-remark` 는 transitive 가 아니라 **devDependency 로 직접 선언**([package.json](package.json)) — 제거하면 config 로드가 깨진다.
- 커스텀 remark 플러그인 [src/plugins/resolve-post-relative-urls.mjs](src/plugins/resolve-post-relative-urls.mjs) 가 mdast `html` 노드의 상대 `src`/`href` 를 포스트 슬러그 기준 절대 경로로 치환(끝 슬래시 제거 — [URL 정책](#url-정책)). 절대 경로·프로토콜·앵커는 제외. **주의: MDX 에서 저작자가 직접 쓴 raw HTML 은 JSX(mdxJsxElement)로 파싱돼 `html` 노드가 아니므로 대상 아님** — 실질적으로 아래 resolve-missing-images 가 만든 `<img>` `html` 노드의 src 를 고치는 역할. 마크다운 이미지 문법 (`![](path)`)은 Astro 자체 처리(Image optimization).
- 커스텀 remark 플러그인 [src/plugins/resolve-missing-images.mjs](src/plugins/resolve-missing-images.mjs) 가 **존재하지 않는 파일을 가리키는 마크다운 이미지(`![](path)`)** 를 빌드 오류 대신 깨진 이미지로 처리. Astro 는 마크다운 이미지를 빌드 시 import 로 변환해 최적화하는데 대상 파일이 없으면 rolldown 이 import resolve 에 실패해 **빌드 전체가 죽는다**(`Rolldown failed to resolve import "images/foo.png"`) — 초안에서 아직 넣지 않은 이미지를 참조할 때 흔함. 이 플러그인은 상대 경로 `image` 노드의 파일이 없을 때만 mdast `image` 를 raw HTML `<img>` 로 치환한다(파일 경로 게이트 정규식은 `index\.mdx?$` 라 `.md`·`.mdx` 모두 대상 — MDX 에서도 동작 확인). 사용자 remark 플러그인은 Astro 의 `remarkCollectImages`(이미지→import 수집) 보다 **먼저** 돌므로, 치환된 노드는 수집 대상에서 빠져 import 가 생성되지 않는다. **존재하는 이미지는 건드리지 않아** 정상 최적화(Picture/avif)를 유지. 치환된 `<img>` 의 상대 src 는 뒤이어 도는 resolve-post-relative-urls 가 슬러그 절대 경로로 변환하므로 `remarkPlugins` 배열에서 **반드시 resolve-post-relative-urls 보다 앞**에 둔다([astro.config.mjs](astro.config.mjs)). 결과적으로 프리뷰엔 깨진 이미지가 노출돼 누락을 바로 인지 가능(빌드 로그에도 경고).
- **본문 H1 금지**: 페이지 제목의 단일 출처는 frontmatter `title`(상세 페이지가 이걸 h1 으로 렌더). 본문(`## ` 부터 시작)에는 H1(`# 제목`)을 쓰지 않는다 — 쓰면 제목 h1 과 중복된다.

## 구조화 데이터 — JSON-LD

검색엔진/소셜용 schema.org 구조화 데이터를 `<head>` 의 `application/ld+json` 으로 출력. 빌더 단일 출처는 [src/utils/jsonld.js](src/utils/jsonld.js), 렌더는 [src/components/JsonLd.astro](src/components/JsonLd.astro).

- **노드 그래프(`@graph` + `@id`)**: 페이지마다 노드를 따로 두지 않고 안정적인 `@id`(해시 URI: `…/#website`, `…/#person`, 포스트 `…/<slug>#article` 등)로 서로 참조. Google 은 페이지 단위로 평가하므로, 참조가 같은 페이지 안에서 풀리도록 **베이스 그래프(`baseGraph()` = WebSite + Person + 로고 ImageObject)를 전 페이지에 주입**한다.
- **배선**: 각 페이지가 빌더로 페이지별 노드 배열을 만들어 `DefaultLayout` 에 `jsonLd` prop 으로 넘기면 → [Head.astro](src/components/Head.astro) 가 `baseGraph()` 와 합쳐 `<JsonLd>` 로 출력. 베이스 노드는 Head 가 항상 깔므로 페이지는 **자기 노드만** 만들면 됨.
- **단일 저자 = 발행자**: 개인 블로그라 `publisher` 를 `Organization` 이 아니라 **`Person`(1UP)** 으로. `Person.sameAs` 는 `site.config.yml` 의 `author.social`(x, github)에서 파생 — 엔드포인트들처럼 **YAML 이 단일 출처**.
- **페이지별 노드**: 홈 `blogGraph()`(`Blog`+`CollectionPage`), 포스트 `postGraph()`(`BlogPosting`+`BreadcrumbList`), about `profileGraph()`(`ProfilePage`, 주체는 공유 `Person @id`), 태그 목록/태그별 `collectionGraph()`(`CollectionPage`+`BreadcrumbList`).
- **`BlogPosting` 매핑 주의**: `headline` 은 멀티라인 `title` 의 `\n` 을 공백으로 정규화(`oneLine`). 커버는 `new URL(cover.src, Astro.site)` 로 **절대 URL** 화([slug].astro), 없으면 로고 `@id` 로 대체. `dateModified` 는 frontmatter `updatedDate` ← 없으면 `pubDate`. `keywords` 는 `tags`, `inLanguage` 는 `site.language.locale`(`ko_KR`→`ko-KR`).
- **출력 형태**: `JsonLd.astro` 는 `type="application/ld+json"` 스크립트라 Astro 가 JS 로 번들/변환하지 않고 그대로 둠. head 에 있어 Pagefind 인덱싱([검색](#검색--search))과 무관하고 ClientRouter(head 스왑)와도 호환.

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

## 좋아요 (Like)

[조회수](#조회수-view-count)와 동일한 인프라(D1 + Pages Functions + localStorage 가드 + 환경별 표시 분기)를 재사용. **결정적 차이는 조회수가 단방향 +1 인 반면 좋아요는 on/off 토글**이라는 점.

- **저장소**: 같은 `1up-views` D1(바인딩 `DB`)에 별도 테이블 `likes(slug PK, count)`. 스키마 [migrations/0002_create_likes.sql](migrations/0002_create_likes.sql) — 배포 전 `wrangler d1 migrations apply` 로 적용 필요(조회수 마이그레이션과 별개 파일).
- **API**: [functions/api/likes/[slug].js](functions/api/likes/[slug].js) — `GET` 조회 / `POST` +1 / `DELETE` -1(`MAX(0, count-1)` 로 음수 방지). [functions/api/likes/index.js](functions/api/likes/index.js) — `GET /api/likes?slugs=a,b,c` 배치 조회. 구조는 views 엔드포인트와 동일.
- **컴포넌트**: [src/components/LikeButton.astro](src/components/LikeButton.astro) — **원 없이 하트 아이콘만**(Material Symbols `favorite` 단색 SVG 1장). 평소 연한 회색 채움 + 가는 외곽선(`fill`/`stroke`, `stroke-width: 32` — 색은 튜닝 대상이라 코드 참조), 좋아요 상태면 빨간 채움(`#f43f5e`, 외곽선 제거) — `data-liked` 로 CSS 가 전환. 스타일은 메타 아이콘 패턴이 아닌 별도 `.likeBox`/`.likeBtn`(global.scss, `.shareBtn` 과 `.ico` 규칙 공유). 버튼 클릭 영역은 아이콘만이 아니라 **아이콘 + 텍스트(likes 수) 전체** + 패딩. 상세 페이지([src/pages/[slug].astro](src/pages/[slug].astro))와 인덱스 카드([PostCard](src/components/PostCard.astro), 우측 컬럼 `.cardLike`) **모두 `interactive`(클릭 토글)** — 동일 스타일·동작. 단 카드는 `.articles article` 의 `h2 a::before { inset:0 }` 링크 오버레이가 카드 전체를 덮으므로, 버튼이 클릭되려면 `.cardLike` 를 오버레이 위(`z-index`)로 올려야 함.
- **토글 시점**: `interactive` 인스턴스가 클릭으로 `POST`(좋아요)/`DELETE`(취소) — 상세·목록 동일. (조회수와 달리 좋아요는 목록 카드에서도 토글 가능.) 좋아요 여부·상태 복원은 `localStorage['likes:liked:<slug>']` 가드 — 재방문 시 활성 상태로 렌더. **로그인 없으니 브라우저 단위**(조회수와 동일 한계).
- **환경별 표시 분기**: 조회수와 동일(PROD=실데이터/오류 N/A, DEV=FNV-1a 해시 고정값, API 미호출). DEV 토글은 API 없이 localStorage+숫자만 즉시 갱신. DEV 표시값은 좋아요 상태면 베이스+1 로 보정해 운영과 일관.
- **상세 헤더 레이아웃**: 제목은 중앙, 그 아래 `.postHeaderBar` 가 메타·태그(좌, `.postHeaderInfo`) ↔ 공유·좋아요(우, `.postActions`)를 양끝 배치(모바일 600px 이하 세로 스택). `.postActions` 내 순서는 공유([공유](#공유-share)) 좌, 좋아요 우.
- **인덱스 카드 레이아웃 변경**: 좋아요를 우측 컬럼에 넣으면서 기존 우측 컬럼의 태그(`.cardTags`)는 제거, 태그는 본문요약 하단(`.cardMain` 내부)으로 이동해 가로 배치. (목록엔 공유 버튼 없음.)
  - **태블릿 이하(`$bp-content`)**: `.cardMain` 을 `display:contents` 로 풀고 2단 그리드(`minmax(0,1fr) auto`)로 재배치 — 제목(1행)·메타(2행)는 좌측, 좋아요(`.cardLike`)는 우측 컬럼에서 제목+메타 두 줄에 걸쳐(`grid-row: 1 / span 2`) 상단 정렬, 본문요약·태그는 그 아래 전체 폭. (이전엔 좋아요가 맨 아래로 처졌음.)
  - **모바일(`$bp-mobile`) 메타 축약**: 메타가 줄바꿈되기 쉬워 카드의 날짜·조회수를 축약형(`Jan 4, 2026` / `28K views`)으로 표시. 시멘틱 유지를 위해 **실제 전체값은 텍스트노드에 그대로 두고**(`<time>` 본문, `.viewCount__num` 의 `textContent`), 모바일 카드에서만 `font-size:0` 으로 숨긴 뒤 축약값을 담은 `::before`(`attr(data-date-short)` / `attr(data-num-short)`)를 노출. **전환은 100% CSS 미디어쿼리** — JS는 화면폭을 보지 않음(조회수 JS는 `textContent`+`data-num-short` 양쪽만 채움). 날짜 축약형은 [src/utils/formatDate.js](src/utils/formatDate.js)의 `{ short: true }`(`month: 'short'`), 조회수 축약은 [ViewCount.astro](src/components/ViewCount.astro)의 `abbr()`(K/M).

## 공유 (Share)

상세 페이지 전용 공유 버튼 — 좋아요 버튼 좌측에 같은 세로 구성(아이콘 + 라벨)으로 배치. D1/서버 무관, 순수 클라이언트.

- **컴포넌트**: [src/components/ShareButton.astro](src/components/ShareButton.astro) — Material Symbols `share` 단색 SVG 1장. 좋아요 하트와 동일하게 연한 회색 채움 + 가는 외곽선(`.ico` 규칙을 `.likeBtn`/`.shareBtn` 공유)이라 세 원도 같은 색으로 채워짐.
- **동작**: 클릭 시 `navigator.share`(Web Share API, 주로 모바일) 우선 → 미지원 시 `navigator.clipboard.writeText(location.href)` 폴백 후 라벨에 "복사됨" 1.5초 피드백. 둘 다 Baseline 안정 기능이라 기능 감지만으로 처리(폴백 외 별도 처리 없음).
- ClientRouter(PROD)와 호환: `astro:page-load` 로 매 네비게이션 재바인딩(`dataset.bound` 중복 방지), dev 는 `DOMContentLoaded` 1회.

## 검색 (Search)

[Pagefind](https://pagefind.app/)(빌드 타임 정적 검색, MIT, 외부 서비스·런타임 서버 없음) 기반. 헤더 `search` 버튼 클릭 시 **현재 페이지에서 레이어(모달)로** 검색창이 열림 — 별도 `/search` 라우트 없음. 데스크톱은 상단 중앙 카드, **모바일(≤`$bp-mobile`)은 풀페이지**(Pagefind 기본 UX 결).

- **인덱스 생성**: 소스가 아니라 **빌드된 `dist/` HTML 을 후처리**. `pnpm run build` 가 `astro build && pagefind --site dist` 로 `dist/pagefind/` 에 인덱스를 생성([명령어](#명령어) 참조). `pagefind` 는 devDependency. `dist` 는 gitignore 되므로 `public/` 은 건드리지 않음.
- **인덱싱 범위**: [src/pages/[slug].astro](src/pages/[slug].astro)의 `<article>` 에 `data-pagefind-body` 가 있는 **포스트 본문만** 인덱싱(이 속성이 한 곳이라도 있으면 Pagefind 는 없는 페이지를 전부 제외 → about·tags 등 자동 제외). 데모는 본문에 인라인되므로 해당 포스트 본문의 일부로 함께 인덱싱됨(별도 데모 페이지 없음). 제목 `h1` 은 인덱싱되어 결과 타이틀이 됨. 메타·태그·공유·좋아요 묶음(`.postHeaderBar`)은 발췌 노이즈라 `data-pagefind-ignore`.
- **`unlisted` 제외**: `data-pagefind-body` 를 `!unlisted || undefined` 로 조건부 출력 → `unlisted` 포스트는 속성이 빠져 **검색 인덱스에서 제외**([비공개 발행](#비공개-발행--unlisted)과 동일 취지). 상세 페이지 자체는 직접 URL 로 여전히 열람 가능.
- **컴포넌트**: [src/components/SearchDialog.astro](src/components/SearchDialog.astro) — 네이티브 `<dialog closedby="any">` 를 `showModal()` 로 염(top layer·포커스 트랩·Esc 무료). 백드롭 클릭/플랫폼 닫기는 `closedby` 미지원(Safari) 대비 콘텐츠 밖 클릭 폴백 포함. 입력은 Pagefind `debouncedSearch`(내부 디바운스+최신호출 우선)로 검색하고 상위 8건을 `r.data()` 로 렌더(`excerpt` 는 `<mark>` 하이라이트 HTML). 결과 `url` 의 `.html`/`index.html` 은 캐노니컬(`/foo`, `/`)로 보정([URL 정책](#url-정책)의 `build.format: 'file'` 부작용 대응). [DefaultLayout](src/layouts/DefaultLayout.astro)에 1회 포함. [Navigation.astro](src/components/Navigation.astro)는 `search` 항목만 링크가 아닌 `[data-search-open]` 버튼으로 렌더.
- **키보드 내비게이션**: combobox 패턴 — 인풋에 포커스를 유지한 채 `↑`/`↓` 로 결과 항목 활성 이동(`.is-active` 하이라이트 + `aria-activedescendant`, 끝에서 순환), `Enter` 로 활성 결과 이동. 인풋 `role="combobox"` + 결과 컨테이너 `role="listbox"`/항목 `role="option"`.
- **reset(X) 버튼**: 인풋에 `required` 를 주어 `:valid`(=입력 있음)일 때만 CSS 로 reset 버튼(흰 X 동그란 버튼) 노출. `required` 의 제출 경고 툴팁은 `<form novalidate>` 로 차단(`:valid` 의사클래스는 그대로 동작). 클릭 시 인풋 비우고 결과 초기화 + 포커스 유지.
- **dev 동작**: `astro dev` 는 `dist/` 를 서빙하지 않아 그대로는 `/pagefind/` 가 없음. 그래서 `pnpm run dev` / `pnpm run dev:draft` 는 [scripts/dev-with-search-index.mjs](scripts/dev-with-search-index.mjs) 러너를 거친다 — **dev 서버를 먼저 띄우고**(기동 속도 우선, 로컬에선 검색이 주 목적 아님), astro 의 `ready in` stdout 신호를 감지한 **뒤** 백그라운드로 `pnpm run build` / `pnpm run build:draft` 를 1회 실행해 `dist/pagefind/` 인덱스를 만든다. 병렬이 아니라 **ready 후 실행**인 이유는 cold-start optimizeDeps 와 `astro build` 가 `.astro`·`.vite` 캐시·`dist` 를 동시에 건드리는 경합을 피하기 위함. 따라서 **서버는 즉시 뜨고, 검색은 백그라운드 빌드가 끝난 시점부터 동작**한다(인덱스 생성 전 검색하면 레이어에 안내 문구). [astro.config.mjs](astro.config.mjs)의 Vite 플러그인 `pagefindDevServer`(`apply: 'serve'`)가 `dist/pagefind/` 를 `/pagefind/` 로 직접 서빙(요청마다 fs 로 읽음 → 백그라운드 인덱스가 완성되면 **재시작 없이** 검색 가능, Content-Type 매핑 포함). dev 검색은 **기동 직후 빌드 스냅샷**이라, dev 도중 추가한 콘텐츠를 검색에 반영하려면 dev 서버를 재시작(재빌드)해야 함. Pagefind 런타임 import 는 Vite 변환을 피하려 `/* @vite-ignore */` 사용.
- **환경 분기 없음**: 조회수·좋아요와 달리 별도 DEV 가짜데이터 분기 없이, dev/prod 모두 동일하게 실제 Pagefind 인덱스를 사용(미들웨어 vs 정적 자산 차이뿐). 인덱스가 없으면(빌드 전) 레이어에 안내 문구 표시. ClientRouter(PROD) 호환: `astro:page-load` 재바인딩, 트리거 버튼은 `dataset.bound`, 다이얼로그는 클릭 시점에 `getElementById` 로 조회.
- **한국어**: Pagefind Extended 빌드가 `<html lang="ko">` 를 감지해 CJK 분절 적용. 단 ko 는 stemming 미지원(어근 매칭 없음) — 빌드 로그에 안내가 뜨는 정상 동작.
