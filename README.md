# 1up.md

[1up.md](https://1up.md) 블로그 소스 코드.

## 스택

- [Astro](https://astro.build) v7 — 정적 사이트 빌드
- [MDX](https://mdxjs.com) — 포스트 본문(데모 컴포넌트를 인라인)
- Sass (`@use` 모듈 방식)
- Cloudflare Pages — 배포
- Node.js ≥ 22.12.0

## 명령어

```bash
npm run dev      # astro dev — http://localhost:4321
npm run build    # astro build — /dist 정적 빌드
npm run preview  # 빌드 결과 미리보기
```

## 경로 별칭

`~/` → `src/`. [astro.config.mjs](astro.config.mjs)와 [jsconfig.json](jsconfig.json) 양쪽에 정의되어 있다.

```js
import site from '~/data/site.config.yml';
import DefaultLayout from '~/layouts/DefaultLayout.astro';
```

## 디렉토리

```
src/
├── content/posts/                 포스트 (디렉토리 단위)
├── pages/                         라우트
├── layouts/
├── components/
├── data/                          site.config.yml, navigation.json
├── styles/                        Sass (global.scss 진입점)
├── plugins/                       빌드 시 마크다운 변환 플러그인
└── utils/
```

## 포스트

포스트는 단일 파일이 아니라 **디렉토리** 단위로 존재하며, 본문은 `index.mdx`(전 포스트 MDX — 데모 컴포넌트를 인라인하기 위함)다. 폴더명은 `YYYY-MM-DD.<slug>` 형식이며, 날짜 뒷부분이 URL 슬러그가 된다.

```
src/content/posts/
└── 2026-04-20.some-post-name/
    ├── index.mdx
    ├── images/
    │   └── cover.png              (선택) 인덱스 카드 커버 이미지
    └── demos/                     (선택) 인라인 데모 컴포넌트 — 아래 참고
        └── ...
```

본문에는 H1(`# 제목`)을 쓰지 않는다 — 제목의 단일 출처는 프론트매터 `title` 이며 본문은 `## ` 부터 시작한다.

`index.mdx` 프론트매터:

```yaml
---
title: '포스트 제목'
description: '...'
pubDate: '2026-04-20T13:45:00+09:00'
tags: [tag1, tag2]
robots: 'noindex'                  # 선택
updatedDate: '2026-06-28T10:00:00+09:00'  # 선택 — 수정일. 상세 페이지 날짜 뒤 표기 + JSON-LD dateModified
---
```

## 데모

포스트 본문의 인터랙티브 예제는 **iframe 이 아니라 Astro 컴포넌트로 본문에 인라인**한다. 데모는 포스트 폴더 안에 두고, MDX 포스트가 import 해서 렌더한다. 빌드 시 SSR 되어 첫 페인트부터 자연스러운 높이로 그려지므로 레이아웃 이동(CLS)이 없고, 별도 라우트도 만들지 않는다.

### 폴더 구조

```
src/content/posts/2026-04-20.some-post-name/
├── index.mdx
└── demos/
    └── some-demo/
        ├── index.astro           # 인라인 프래그먼트 (standalone 문서 아님)
        ├── script.js             # (선택) 클라이언트 로직
        └── images/               # (선택) 데모 자산 — 포스트가 아닌 데모 폴더에 둔다
            └── slide-1.svg
```

### `index.astro` (인라인 프래그먼트)

`<!doctype html>`·`<html>`·`<head>`·`<body>` 없이 **조각만** 작성한다. 스타일은 `<style>`(Astro 가 자동 스코프하므로 포스트 스타일과 격리), 로직은 `<script>` 에 둔다.

```astro
---
// 외부 라이브러리는 CDN 이 아니라 npm 으로 설치해 번들한다.
import 'swiper/css/bundle';
import slide1 from './images/slide-1.svg?url';
---
<div class="demo">
  <!-- 데모 마크업 -->
</div>

<style lang="scss">
  .demo { /* Astro 가 자동 스코프 (data-astro-cid-*) */ }
</style>

<script>
  import './script.js';
</script>
```

### MDX 에서 임베드

포스트 `index.mdx` 에서 상대 경로로 import 후 본문에 렌더한다.

```mdx
import SomeDemo from './demos/some-demo/index.astro';

...본문...

<SomeDemo />
```

### 자산 / 외부 라이브러리

- 이미지·SCSS·JS 는 같은 폴더 기준 상대 경로 import (Vite 가 번들). **데모 이미지는 데모 폴더의 `images/`** 에 둔다(포스트 직속 `images/` 는 본문·커버용).
- Swiper 같은 외부 라이브러리는 `npm install` 후 import 하면 Vite 가 로컬 청크로 번들하므로 런타임 CDN 요청이 없다. 해당 데모가 있는 포스트에만 로드된다.

## 사이트 설정

- [src/data/site.config.yml](src/data/site.config.yml) — 사이트명, 태그라인, 언어, 저자, SNS, 테마 색상 등의 단일 출처. `manifest.json`, `robots.txt`, `humans.txt`, `rss.xml` 모두 이 YAML 에서 파생됨.
- [src/data/navigation.json](src/data/navigation.json) — 헤더 내비게이션. 항목의 `label` 은 body 의 `page-{label}` id 로도 사용된다.

## 폰트

본문은 [Pretendard](https://github.com/orioncactus/pretendard) 가변폰트를 서브셋한 **단일 파일** `public/fonts/PretendardVariable.subset.woff2`(약 365KB)를 사용한다. 원본 가변폰트(약 2MB)를 harfbuzz(`hb-subset`)로 다음과 같이 축소했다.

- **글리프**: [Adobe-KR-9](https://github.com/adobe-type-tools/Adobe-KR) Supplement 0(상용 현대 한글 2,780자) + 라틴·문장부호만 유지
- **굵기 축**: `wght` 를 400–600 으로 제한 (400 / 500 / 600 사용)

[_font.scss](src/styles/_font.scss) 에서 `font-weight: 400 600` 한 블록으로 선언하며, 세 굵기를 이 한 파일이 모두 커버한다. 초기 렌더 속도를 위해 [_headers](src/pages/[...headers].js) 의 preload(Early Hints) 대상에 포함된다. 메인 포스트 순번용 숫자는 Outfit-ExtraLight 서브셋을 별도로 쓴다.

## SPA 전환

[src/components/Head.astro](src/components/Head.astro) 의 `<ClientRouter />` (astro:transitions) 가 페이지 간 전환을 처리한다. 헤더 (`<Logo>`, `<Navigation>`) 는 `transition:persist` 로 지정되어 재마운트로 인한 플리커링이 발생하지 않는다.

## 추가 문서

- [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) — Claude Code 및 AI 에이전트용 작업 가이드
