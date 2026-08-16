# AGENTS.md

Claude Code 작업 가이드. **1up.md** 정적 블로그 — Astro 7, Cloudflare Pages, 한국어 콘텐츠(`lang: ko`). 테스트·린트 없음.

## Node 버전 — 두 장치, 다른 일

- **하한 가드** = [package.json](package.json) `engines.node: ">=22.12.0"` + [pnpm-workspace.yaml](pnpm-workspace.yaml) `engineStrict: true`(없으면 경고만 뜨고 통과 → 필수). 상한 없음.
- **실제 빌드 Node** = [.nvmrc](.nvmrc) `22`. 배포가 메이저를 임의로 따라 올라가지 않게 고정. 로컬은 더 높아도 무방.
- **`devEngines.runtime` 미사용**(가드 아닌 강제 고정 장치).

## 패키지 매니저 — pnpm

**`npm install` 금지**(`package-lock.json` 생기면 Cloudflare 가 npm 으로 설치). 의존성은 `pnpm add`/`pnpm install`.

- **버전 단일 출처** = [package.json](package.json) `packageManager: "pnpm@11.13.0"`. pnpm 이 스스로 이 필드를 읽어 해당 버전으로 실행(로컬·Cloudflare 동일). 업그레이드는 이 값만 수정.
- `PNPM_VERSION`·corepack·devEngines 미사용(버전 출처를 `packageManager` 하나로).
- **쿨다운** = [pnpm-workspace.yaml](pnpm-workspace.yaml) `minimumReleaseAge: 10080`(분=7일, v11 기본 1440 상향). 전이 의존성 포함 공개 7일 미만 버전 설치 제외. 우회는 `--config.minimumReleaseAge=0`.

> ### ⚠️ 빠지면 빌드 깨짐
> - **`allowBuilds`** ([pnpm-workspace.yaml](pnpm-workspace.yaml)): pnpm 은 build/postinstall 기본 차단. `@parcel/watcher`·`esbuild`·`sharp` 허용 필요. 설정 자리는 이 파일(package.json `pnpm` 필드는 v11 무시).
> - **`sharp` 직접 devDependency 선언**: 없으면 Astro 가 전이 sharp resolve 못 해 `MissingSharp`. 삭제 금지.
> - **쿨다운 vs lockfile**: `minimumReleaseAge` 는 resolve 뿐 아니라 **기존 lockfile 검증에도 적용**. 쿨다운 안쪽 버전이 lockfile 에 있으면 `--frozen-lockfile` 이 `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` 로 실패 → Cloudflare 빌드 사망. 의존성 갱신은 쿨다운 켠 상태로 `pnpm update` (그래야 lockfile 에 쿨다운 통과 버전만 들어감). 이미 걸렸으면 해당 버전이 7일 될 때까지 대기하거나 lockfile 재해석.

## 명령어

```bash
pnpm run dev          # dev-with-search-index.mjs — astro dev 기동(localhost:4321) 후 백그라운드 검색 인덱스. src/content/posts
pnpm run dev:draft    # 위 + --mode draft. gitignore된 src/content.draft/posts 만
pnpm run build        # astro build && pagefind --site dist --force-language en
pnpm run build:draft  # 초안으로 dist/pagefind 생성(dev 검색 확인용)
pnpm run preview      # 빌드 결과 미리보기
```

`build` 가 pagefind 포함 → Cloudflare 빌드 커맨드도 동일.

## 경로 별칭

`~/` → `src/`. [astro.config.mjs](astro.config.mjs)·[jsconfig.json](jsconfig.json) 양쪽 정의. 항상 `~/...` 로 임포트.

## 콘텐츠 모델 — 포스트

포스트는 [src/content/posts/](src/content/posts/) 안 **디렉토리** 단위. 폴더명 `/^(\d{4}-\d{2}-\d{2})\.(.+)$/` 엄격 파싱(미준수 시 빌드 에러). URL 슬러그 = 날짜 뒤(`2025-11-24.bulkhead-pattern` → `/bulkhead-pattern`).

```
posts/2025-11-24.bulkhead-pattern/
  index.mdx                          # 본문은 전부 .mdx(데모 인라인 import 위함, .md 공존 없음)
  images/cover.{jpg|jpeg|png|webp}   # 선택, 직속 images/ 만 커버로 인식
  demos/                             # 선택 ([데모](#데모))
```

- 프론트매터: `title`·`description`·`pubDate`(ISO+TZ)·`tags`(배열), 선택 `robots`·`unlisted`·`updatedDate`.
  - `updatedDate`: JSON-LD `dateModified` 로 사용(없으면 `pubDate`). `pubDate` 와 다르면 상세 페이지에만 `(Updated: …)` 표기([PostMeta](src/components/PostMeta.astro)만, 카드 미표시).
  - `title` 을 YAML `|-` 멀티라인으로 쓰면 [[slug].astro](src/pages/[slug].astro)가 `\n` 감지 → h1 에 `multilineTitle` 클래스. 별도 플래그 불필요.
- **소스 분기**: prod=`src/content/posts/`(커밋), draft=`src/content.draft/posts/`(gitignore, `dev:draft` 전용). [posts.js](src/utils/posts.js)가 `MODE==='draft'` 로 선택. `import.meta.glob` 은 변수 보간 불가라 prod/dev 글로브를 쌍으로 선언 + `pick()`.

### 포스트 로딩

모든 접근은 [posts.js](src/utils/posts.js) `getAllPosts()`/`getPostBySlug()` 경유(glob `posts/*/index.mdx` 단일 출처, 폴더명 파싱·커버 매칭·정렬·readingTime). **신규 탐색 코드도 `import.meta.glob` 재호출 말고 이 헬퍼 사용.**

- readingTime: MDX 는 `rawContent()` 미export → `?raw` 글로브로 재로드해 계산.
- Content Collections 미사용(`getCollection()`·`astro:content` 배제). RSS 는 프론트매터 직접 읽어 수동 XML(`@astrojs/rss` 는 Astro 6/Zod 4 비호환으로 제거).

### 비공개 발행 — `unlisted`

`unlisted: true` → 발행되지만 모든 연결점 제외, URL 직접 입력 시만 열람.

- `getAllPosts()` 가 기본적으로 필터링 → 인덱스·태그·RSS·llms.txt·사이트맵 자동 제외. 검색은 `data-pagefind-body` 를 `!unlisted || undefined` 로 조건부 출력해 제외.
- 상세 페이지는 [[slug].astro](src/pages/[slug].astro) `getStaticPaths` 만 `{ includeUnlisted: true }` 로 생성.
- 검색엔진 비색인까지 원하면 `robots: noindex` 병기(별개 필드).

### 사이트맵

`@astrojs/sitemap` 없이 [sitemap.xml.js](src/pages/sitemap.xml.js) 라우트로 직접 생성. `getAllPosts()` 경유라 `unlisted` 제외 자동. 라우트 = 정적(`/`, `/about`, `/tags`) + 포스트 + 태그별을 **명시 열거** → 새 최상위 섹션 추가 시 여기도 수동 추가. `<lastmod>` 는 신뢰할 신호 있는 URL 만(포스트=`updatedDate ?? pubDate`, `/about` 생략, 가짜 `BUILD_TIME` 금지).

## 데모

포스트 본문 인터랙티브 예제는 **iframe 아닌 Astro 컴포넌트로 인라인**(빌드 시 SSR → 제로 CLS). 포스트 폴더 `demos/<slug>/index.astro`(프래그먼트, doctype 없음). MDX 가 상대 import 후 `<Demo />` 렌더.

- 스타일은 `index.astro` `<style lang="scss">` 안에(Astro 자동 스코프). side-effect import 는 전역이라 스코프 안 됨.
- JS `<script>import './script.js'</script>`, 이미지 상대 import(Vite 가 번들 자산화). 빈 script.js 자동 제외.

## 사이트 설정 (YAML/JSON 단일 출처)

- [site.config.yml](src/data/site.config.yml) — 사이트명·저자·SNS·테마색·`siteIcons`. [manifest](src/pages/manifest.json.js)·[robots](src/pages/robots.txt.js)·[humans](src/pages/humans.txt.js)·[rss](src/pages/rss.xml.js)·[llms](src/pages/llms.txt.js)·JSON-LD `Person.sameAs` 모두 이걸 파생 → 엔드포인트 아닌 YAML 수정.
- [navigation.json](src/data/navigation.json) — 헤더 내비. 항목 `label`(page id 겸용)·`base`(pathname 접두사 매칭)·`path`. [DefaultLayout](src/layouts/DefaultLayout.astro)가 `<body id="page-{label}">` 설정, [styles](src/styles/)가 타겟 → 새 섹션은 nav 항목도 추가(안 하면 `page-unknown`).

## 스타일

`@use` 모듈 Sass, 진입점 [global.scss](src/styles/global.scss). 브레이크포인트는 [_variables.scss](src/styles/_variables.scss) `$bp-content`(971px)·`$bp-mobile`(600px) 변수 — 하드코딩 금지.

## 브라우저 지원 (CSS 타깃)

CSS vendor prefix·문법 다운레벨은 빌드 시 Lightning CSS(Vite 기본 CSS minifier)가 처리. 대상은 빌드 시 [package.json](package.json) `browserslist` → [scripts/browser-css-target.mjs](scripts/browser-css-target.mjs)가 브라우저별 최소 버전 esbuild 타깃 문자열로 변환 → [astro.config.mjs](astro.config.mjs)가 `vite.build.cssTarget` 주입. 생성·커밋 파일 없음.

- **caniuse-lite 갱신**: `pnpm update:browserslist`(`update-browserslist-db`) — 브라우저 통계 최신화. 빌드가 이 데이터로 browserslist 해석.
- **주의 — minify 는 `build.cssTarget` 만 본다**: `css.lightningcss.targets`·`css.transformer:'lightningcss'` 는 minify 단계에서 `convertTargets(build.cssTarget)` 로 덮어써져 무효(Astro 가 `build.target: 'esnext'` 고정 → 빈 타깃 → prefix 제거). `css.lightningcss.targets` 로 우회 시도 금지.
- **주의 — `cssTarget` 은 문자열 배열만**: `'esnext'`/`baseline-widely-available` 특수값·targets 객체 불가. 인식 브라우저는 `chrome`, `edge`, `firefox`, `safari`, `ios`(iOS Safari), `opera`, `ie` 뿐(`ios_saf→ios`, `samsung`(Samsung Internet)·`and_chr`(Chrome for Android) 등 미지원 → 스크립트가 제외). 이름 정의: [browserslist](https://github.com/browserslist/browserslist#browsers) 입력 / [esbuild target](https://esbuild.github.io/api/#target) 출력.
- **dev 는 prefix 안 붙음**(minify 안 함) → 확인은 `pnpm run preview`.

## preload / Early Hints

폰트·CSS preload 를 **`_headers` `Link:` 응답 헤더로** 내보냄 — HTML `<link rel=preload>` 는 Cloudflare 가 103 승격 안 함(실측).

- [[...headers].js](src/pages/[...headers].js)가 `dist/_headers` 생성(`_` 시작이라 페이지 스캔 제외, catch-all 로 `_headers` 하나만). `public/_headers` 불가(CSS 해시 담아야 함).
- CSS: `import globalCssUrl from '~/styles/global.scss?url'` 로 컴파일 해시 URL 을 preload+stylesheet 양쪽에 같은 모듈로 참조([Head.astro](src/components/Head.astro)) → 항상 일치 + [SPA 전환](#spa-전환) 시 유지.
- 폰트: Pretendard 가변 서브셋 단일 woff2(전 경로), Outfit-ExtraLight 는 홈만. `@font-face` 익명 CORS 라 `crossorigin` 필수. [_font.scss](src/styles/_font.scss)는 `font-weight: 400 600` 한 블록으로 400/500/600 커버(용량은 축 범위로 결정).

**검증**: `chrome://net-export` 의 `...EARLY_HINTS... → 103`. curl·Node http2 프로브는 false negative — 쓰지 말 것.

## SPA 전환

[Head.astro](src/components/Head.astro) `<ClientRouter />` 가 헤더 재로드 플리커링 방지(시각 전환 효과는 [global.scss](src/styles/global.scss) `view-transition ... animation:none` 로 끔).

- **PROD 전용**(`import.meta.env.PROD` 가드) — dev 는 SCSS HMR 충돌. 확인은 `pnpm run preview`.
- `transitions-*` 가상 모듈을 [astro.config.mjs](astro.config.mjs) `optimizeDeps.include` 에 사전 포함(콜드 스타트 재최적화·`504` 방지) — 제거 금지.

## URL 정책

trailing slash 없음. [astro.config.mjs](astro.config.mjs) `trailingSlash:'never'` + `build.format:'file'` → 정적 `/foo.html`, 캐노니컬 `/foo`. 내부 링크 슬래시 없이.

- 부작용: 정적 빌드 시 `Astro.url.pathname` 이 파일 경로(`/about.html`) 반환 → [DefaultLayout](src/layouts/DefaultLayout.astro) `getPageId` 가 `/index.html` 을 루트 처리. 경로 비교 로직 추가 시 유의.
- 포스트 raw HTML 의 끝 슬래시는 [resolve-post-relative-urls](src/plugins/resolve-post-relative-urls.mjs)가 제거+절대화.

## 마크다운 렌더링

- Shiki `nord`. `import.meta.env.BUILD_TIME` = 빌드 시점 ISO(astro.config Vite `define`).
- **remark 는 `markdown.processor: unified(...)` 한 곳에만**(`@astrojs/markdown-remark`). `.mdx` 는 `@astrojs/mdx` 가 렌더하되 `extendMarkdownConfig` 로 상속 → `mdx()` 옵션 안 넘김.
  - **⚠️ `processor` 삭제 금지**: Astro 7 에서 remark 의 비deprecated 경로는 이것뿐(`markdown.remarkPlugins`·`mdx({remarkPlugins})` 둘 다 deprecated). `@astrojs/markdown-remark` 를 devDependency 로 직접 선언 — 제거하면 config 깨짐.
- 플러그인 2개([astro.config.mjs](astro.config.mjs) `remarkPlugins`, **순서 고정**):
  1. [resolve-missing-images](src/plugins/resolve-missing-images.mjs) — 존재 않는 파일의 `![](path)` 를 raw `<img>` 로 치환(안 하면 rolldown import 실패로 빌드 사망, 초안에서 흔함). 존재 이미지는 무수정.
  2. [resolve-post-relative-urls](src/plugins/resolve-post-relative-urls.mjs) — mdast `html` 노드의 상대 src/href 를 슬러그 절대 경로화(위가 만든 `<img>` 대상, 반드시 뒤). MDX 저작 raw HTML 은 JSX 라 대상 아님.
- **smartypants**: `unified({ smartypants })` 에 선언(top-level `markdown.smartypants` 는 deprecated). 값은 [retext-smartypants](https://github.com/retextjs/retext-smartypants#options) 옵션 그대로. 현재 `quotes:false`·`backticks:false` — 따옴표·아포스트로피 곧은 문자 유지. `dashes`(`--`→`—`)·`ellipses`(`...`→`…`)는 켜둠.
- **본문 H1 금지**: 제목은 frontmatter `title`(상세가 h1 렌더). 본문은 `## ` 부터.

## JSON-LD

[jsonld.js](src/utils/jsonld.js) 빌더 / [JsonLd.astro](src/components/JsonLd.astro) 렌더. 안정 `@id`(해시 URI) 노드 그래프.

- **베이스 그래프**(`baseGraph()` = WebSite+Person+로고)를 [Head.astro](src/components/Head.astro)가 전 페이지 주입 → 페이지는 자기 노드만 생성해 `jsonLd` prop 전달.
- 페이지별: 홈 `blogGraph()`, 포스트 `postGraph()`(BlogPosting+BreadcrumbList), about `profileGraph()`, 태그 `collectionGraph()`.
- `publisher` = `Person`(개인 블로그). BlogPosting 커버는 절대 URL(없으면 로고 @id), `dateModified`=`updatedDate ?? pubDate`.

## 조회수 / 좋아요 (D1 + Pages Functions)

정적 사이트 + **Cloudflare Pages Functions + D1**. `functions/` 는 Astro 빌드 무관, Pages 가 Worker 로 서빙.

- **저장소**: D1 `1up-views`(바인딩 `DB`, [wrangler.toml](wrangler.toml) — **`database_id` 실제값 필요**). 테이블 `views`([0001](migrations/0001_create_views.sql))·`likes`([0002](migrations/0002_create_likes.sql)) — 배포 전 `wrangler d1 migrations apply`.
- **API**: `functions/api/{views,likes}/[slug].js`(단건 GET/POST, likes 는 DELETE 도) + `index.js`(`?slugs=a,b,c` 배치). views POST=원자 +1, likes 는 on/off 토글(`MAX(0,count-1)`).
- **환경별 표시**(`import.meta.env`): PROD=API 실데이터 / 오류=`N/A` / DEV=API 없이 슬러그 FNV-1a 해시 고정값.
- **가드**: 조회수는 상세 진입 시만 +1(`localStorage['views:seen:<slug>']`), 좋아요는 상태 복원(`localStorage['likes:liked:<slug>']`). 로그인 없어 브라우저 단위.
- **컴포넌트**: [ViewCount](src/components/ViewCount.astro)·[LikeButton](src/components/LikeButton.astro). 좋아요는 상세·인덱스 카드 모두 `interactive` 토글(카드는 링크 오버레이 위로 `z-index` 필요). 상세 헤더 `.postHeaderBar` = 메타/태그(좌) ↔ 공유·좋아요(우). 모바일 카드는 날짜·조회수 축약(`::before` + `attr(data-*-short)`, 전환은 CSS 미디어쿼리, 실값은 텍스트노드 유지).
- ClientRouter 호환: `astro:page-load` 재실행(dev 는 `DOMContentLoaded` 1회).

## 공유

[ShareButton](src/components/ShareButton.astro) — `navigator.share` 우선 → 미지원 시 `clipboard.writeText` + "복사됨" 피드백. 순수 클라이언트. `astro:page-load` 재바인딩(`dataset.bound`).

## 이미지 라이트박스

[ImageLightbox](src/components/ImageLightbox.astro) — 상세 페이지 전용. **PhotoSwipe v5**(`photoswipe` devDependency)가 확대·핀치/휠 줌·팬·포커스 트랩·모프 담당. 컴포넌트는 Astro 접합부만 채움.

- **대상** = `.postContent .postBody img:not(a img):not([data-no-zoom])`(인덱스 카드 발췌도 `.postBody` 라 상세로 한정). 데모 이미지 포함 → 빼려면 `data-no-zoom`.
- **마크다운 이미지는 `<a>` 래핑이 없음** → PhotoSwipe 가 src·크기를 못 읽음. `domItemData` 필터에서 `naturalWidth/Height`(미로드 시 `width`/`height` 속성)로 채움. `getThumbBounds` 는 `element.matches('img')` 라 `<img>` 자체를 썸네일로 인식 → 모프는 그대로 동작.
- **키보드**: `<a>` 가 아니라 기본 포커스가 없음 → 런타임에 `tabindex`·`role="button"` 부여 + Enter/Space 로 `loadAndOpen(index)`.
- **`history: false` 필수**: PhotoSwipe 기본 히스토리는 해시 기반이라 ClientRouter `popstate` 가 같은 URL 로 SPA 재네비게이션. 뒤로가기 닫기는 직접 처리 — 열 때 엔트리 1개 push 하되 **착지할 엔트리의 `state` 를 `null` 로 비워야** ClientRouter `onPopState` 가 즉시 return. 닫을 때 `replaceState` 로 원복.
- **재바인딩**: `astro:before-swap` → `destroy()`, `astro:page-load` → 재생성(dev 는 `DOMContentLoaded` 1회).
- CSS 는 frontmatter `import 'photoswipe/style.css'` → 상세 페이지 CSS 에만. 본체는 클릭 시 동적 import(별도 청크) — dev 콜드 스타트 재최적화 방지로 `photoswipe`·`photoswipe/lightbox` 를 [astro.config.mjs](astro.config.mjs) `optimizeDeps.include` 에 등재.
- 뷰어 DOM 은 런타임 생성 → Pagefind 인덱스 무관.

## 검색 (Pagefind)

빌드된 `dist/` HTML 후처리(런타임 서버 없음). 헤더 `search` → 현재 페이지 모달([SearchDialog](src/components/SearchDialog.astro), `<dialog closedby="any">`).

- **인덱싱 범위** = `data-pagefind-body` 붙은 포스트 본문만(속성 있으면 나머지 전부 제외 → about·tags 자동 제외). 데모는 본문 일부로 포함. `.postHeaderBar` 는 `data-pagefind-ignore`.
- 결과 `url` 의 `.html`/`index.html` 을 캐노니컬로 보정. combobox 키보드 내비(`↑↓`+`aria-activedescendant`, `Enter`). reset 은 `required`+`:valid` CSS(`<form novalidate>` 로 경고 차단).
- **dev**: `astro dev` 는 `dist/` 미서빙 → [dev-with-search-index.mjs](scripts/dev-with-search-index.mjs)가 서버 `ready` 후 백그라운드 build 로 인덱스 생성, Vite 플러그인 `pagefindDevServer` 가 `/pagefind/` 직접 서빙(요청마다 fs → 완성 시 재시작 없이). 도중 추가 콘텐츠는 재시작 필요.
- **언어 `en` 강제**: ko 는 stemming 미지원 안내가 떠서 `--force-language en`. 런타임도 `pagefind.init('en')` 로 **같이** 맞춤(비우면 폴백 의존). 한국어 검색은 정상(공백 분절, stemmer 는 한글에 no-op — 실측). UI 문구는 자체 렌더라 한국어 유지.
