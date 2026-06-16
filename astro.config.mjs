import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import yaml from '@rollup/plugin-yaml';
import sitemap from '@astrojs/sitemap';
import path from 'path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import resolvePostRelativeUrls from './src/plugins/resolve-post-relative-urls.mjs';
import stripH1 from './src/plugins/strip-h1.mjs';

const SITE = 'https://1up.md';

// 사이트맵 제외 대상: 프론트매터 `unlisted: true` 인 포스트(운영 발행됐지만 모든 연결점에서
// 숨김, 직접 URL 로만 열람). astro.config 컨텍스트는 import.meta.glob(=posts.js)을 못 쓰므로
// 포스트 소스를 fs 로 직접 스캔해 제외 URL 집합을 만든다. 배포(content)·초안(content.draft)
// 두 소스를 모두 훑는다 — 슬러그 URL 만 모으므로, 그 빌드에 실제 존재하지 않는 라우트가
// 섞여도 sitemap.filter 입장에선 no-op(운영 빌드의 초안 항목 등).
function unlistedPostUrls() {
  const dirs = ['./src/content/posts', './src/content.draft/posts'];
  const urls = new Set();
  for (const rel of dirs) {
    const postsDir = fileURLToPath(new URL(rel, import.meta.url));
    if (!fs.existsSync(postsDir)) continue;
    for (const entry of fs.readdirSync(postsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const match = entry.name.match(/^\d{4}-\d{2}-\d{2}\.(.+)$/);
      if (!match) continue;
      const indexPath = path.join(postsDir, entry.name, 'index.md');
      if (!fs.existsSync(indexPath)) continue;
      const fm = fs.readFileSync(indexPath, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (fm && /^unlisted:\s*true\s*$/m.test(fm[1])) urls.add(`${SITE}/${match[1]}`);
    }
  }
  return urls;
}

const unlistedUrls = unlistedPostUrls();

export default defineConfig({
  site: SITE,
  base: '/',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [sitemap({ filter: page => !unlistedUrls.has(page.replace(/\/$/, '')) })],
  devToolbar: {
    enabled: false,
  },
  image: {
    layout: 'none',
  },
  markdown: {
    processor: unified({
      remarkPlugins: [resolvePostRelativeUrls, stripH1],
    }),
    shikiConfig: {
      theme: 'nord',
    },
  },
  vite: {
    // <ClientRouter />의 transitions 가상 모듈을 콜드 스타트에 미리 번들. 늦은 dep 발견 → 재최적화 → 리로드 루프와 그 부작용인 dev-toolbar entrypoint 504(Outdated Optimize Dep)를 방지.
    optimizeDeps: {
      include: [
        'astro/virtual-modules/transitions-router.js',
        'astro/virtual-modules/transitions-types.js',
        'astro/virtual-modules/transitions-events.js',
        'astro/virtual-modules/transitions-swap-functions.js',
      ],
    },
    resolve: {
      alias: {
        '~/': path.resolve('./src') + '/',
      }
    },
    define: {
      'import.meta.env.BUILD_TIME': JSON.stringify(
        process.env.NODE_ENV === 'production' ? new Date().toISOString() : ''
      ),
    },
    plugins: [yaml()]
  },
  server: {
    host: true,
    port: 4321
  }
});

