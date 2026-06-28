# 1up.md

[1up.md](https://1up.md) 블로그 소스 코드.

## 스택

- [Astro](https://astro.build) v7 — 정적 사이트 빌드
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

포스트는 단일 `.md` 파일이 아니라 **디렉토리** 단위로 존재한다. 폴더명은 `YYYY-MM-DD.<slug>` 형식이며, 날짜 뒷부분이 URL 슬러그가 된다.

```
src/content/posts/
└── 2026-04-20.some-post-name/
    ├── index.md
    ├── images/
    │   └── cover.png              (선택) 인덱스 카드 커버 이미지
    └── demos/                     (선택) 데모 페이지 — 아래 참고
        └── ...
```

`index.md` 프론트매터:

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

## 데모 페이지

포스트 본문에 인터랙티브 예제를 iframe 으로 임베드할 수 있다. 데모 자체는 포스트 폴더 안에 위치하며, 빌드 시 `/<post-slug>/demos/<demo-slug>/` 라우트로 자동 생성된다.

### 폴더 구조

```
src/content/posts/2026-04-20.some-post-name/
├── index.md
└── demos/
    └── some-demo/
        ├── index.astro            # HTML 컨테이너
        ├── style.scss
        ├── script.js
        └── images/                # (선택) 데모 자산
            └── sprite.png
```

### `index.astro` (HTML 컨테이너)

```astro
---
import './style.scss';
---
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>데모 제목</title>
  </head>
  <body>
    <div class="stage" data-stage>
      <!-- 데모 마크업 -->
    </div>

    <script>
      import './script.js';
    </script>
  </body>
</html>
```

### 마크다운에서 임베드

`index.md` 본문에 그냥 상대 경로로 적으면 된다.

```markdown
<iframe
  src="demos/some-demo/"
  title="데모 제목"
  width="100%"
  height="420"
  loading="lazy"
></iframe>
```

src/href 의 상대 경로는 빌드 시 [src/plugins/resolve-post-relative-urls.mjs](src/plugins/resolve-post-relative-urls.mjs) 가 포스트 슬러그 기준 절대 경로(`/some-post-name/demos/some-demo/`)로 자동 치환한다. **포스트 폴더명을 바꿔도 본문 수정이 필요 없다.**

### Assets 사용 (이미지 등)

`index.astro` / `style.scss` / `script.js` 모두 같은 폴더 기준 상대 경로 import 가 가능하다 (Vite 가 번들 처리).

```astro
---
import { Image } from 'astro:assets';
import cover from './images/cover.png';
---
<Image src={cover} alt="..." width={400} height={300} />
```

```scss
.hero {
  background-image: url('./images/bg.png');
}
```

```js
import spriteUrl from './images/sprite.png';
// 또는
const spriteUrl = new URL('./images/sprite.png', import.meta.url).href;
```

## 사이트 설정

- [src/data/site.config.yml](src/data/site.config.yml) — 사이트명, 태그라인, 언어, 저자, SNS, 테마 색상 등의 단일 출처. `manifest.json`, `robots.txt`, `humans.txt`, `rss.xml` 모두 이 YAML 에서 파생됨.
- [src/data/navigation.json](src/data/navigation.json) — 헤더 내비게이션. 항목의 `label` 은 body 의 `page-{label}` id 로도 사용된다.

## SPA 전환

[src/components/Head.astro](src/components/Head.astro) 의 `<ClientRouter />` (astro:transitions) 가 페이지 간 전환을 처리한다. 헤더 (`<Logo>`, `<Navigation>`) 는 `transition:persist` 로 지정되어 재마운트로 인한 플리커링이 발생하지 않는다.

## 추가 문서

- [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) — Claude Code 및 AI 에이전트용 작업 가이드
