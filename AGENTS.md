# AGENTS.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트

**1up.md** 정적 블로그 — Astro 6, Cloudflare Pages 배포. 한국어 콘텐츠(`lang: ko`). 테스트 및 린트 도구 없음. Node.js ≥ 22.12.0 필요.

## 명령어

```bash
npm run dev      # astro dev — http://localhost:4321 (host: true, LAN 공개)
npm run build    # astro build — /dist 에 정적 파일 출력
npm run preview  # astro preview — 빌드 결과 미리보기
```

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
- 템플릿에서 사용하는 프론트매터 필드: `title`, `description`, `pubDate`(ISO + 타임존), `tags`(배열), 선택적 `robots`.
- 커버 이미지는 [src/pages/index.astro](src/pages/index.astro)의 `import.meta.glob('/src/content/posts/**/images/cover.{jpg,jpeg,png,webp}')` 로 **디렉토리 단위** 매칭 — `images/cover.*` 경로에 있는 파일만 인식됨.

### 포스트 로딩 메커니즘

[src/pages/rss.xml.js](src/pages/rss.xml.js) 를 포함한 모든 페이지는 `import.meta.glob('/src/content/posts/*/index.md', { eager: true })` 로 포스트를 읽음. **Content Collections 설정 없음** (`src/content.config.ts` 미존재); `getCollection()`과 `astro:content`는 의도적으로 사용하지 않음. RSS 피드는 프론트매터(`title`, `description`, `pubDate`, `tags`)를 직접 읽어 RSS 2.0 XML을 수동 생성 — Astro 6 / Zod 4 비호환 문제([withastro/astro#15792](https://github.com/withastro/astro/issues/15792))를 회피하기 위해 `@astrojs/rss` 의존성을 제거한 것임. 새로운 포스트 탐색 코드를 추가할 때는 glob 경로를 정식 출처로 유지할 것.

## 사이트 설정

- [src/data/site.config.yml](src/data/site.config.yml) — 사이트명, 태그라인, 언어, 저자, SNS, 테마 색상, `siteIcons` 배열의 단일 출처. `@rollup/plugin-yaml`로 로드.
- [src/data/navigation.json](src/data/navigation.json) — 헤더 내비게이션. 각 항목은 `label`(body의 page id로도 사용), `base`(`DefaultLayout`에서 `Astro.url.pathname`과 접두사 매칭), `path`(href)로 구성.
- [src/pages/manifest.json.js](src/pages/manifest.json.js), [src/pages/robots.txt.js](src/pages/robots.txt.js), [src/pages/humans.txt.js](src/pages/humans.txt.js), [src/pages/rss.xml.js](src/pages/rss.xml.js) 모두 `site.config.yml` 에서 파생 — 엔드포인트가 아닌 YAML을 수정할 것.

## 레이아웃 / page-id 규약

[src/layouts/DefaultLayout.astro](src/layouts/DefaultLayout.astro)는 `navigation.json`의 `base`와 `Astro.url.pathname`을 매칭하여 `<body id="page-{label}" data-layout-type="main|sub">` 를 설정. [src/styles/](src/styles/) 의 스타일은 이 id를 타겟으로 함 — 새 최상위 섹션을 추가할 때 nav 항목도 함께 추가해야 body id가 `page-unknown`이 되지 않음.

## 스타일

`@use` 모듈 방식의 Sass. 진입점: [src/styles/global.scss](src/styles/global.scss)(`functions`, `reset`, `font` 임포트).

## SPA 전환

[src/components/Head.astro](src/components/Head.astro)의 `<ClientRouter />`(astro:transitions)가 SPA 스타일 네비게이션을 담당 — 헤더가 다시 로드되며 발생하는 플리커링 방지가 도입 목적. 시각적 전환 효과 의도는 없으며, [src/styles/global.scss](src/styles/global.scss)의 `::view-transition-old/new(root) { animation: none }` 규칙이 `document.startViewTransition()`의 기본 cross-fade를 끔.

## 빌드 타임 상수

`import.meta.env.BUILD_TIME`은 [astro.config.mjs](astro.config.mjs)의 Vite `define`으로 주입되는 빌드 시점 ISO 타임스탬프.

## 마크다운 렌더링

Shiki 테마: `nord` ([astro.config.mjs](astro.config.mjs)에서 설정).
