import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import yaml from '@rollup/plugin-yaml';
import path from 'node:path';
import fs from 'node:fs';
import resolveMissingImages from './src/plugins/resolve-missing-images.mjs';
import resolvePostRelativeUrls from './src/plugins/resolve-post-relative-urls.mjs';

// remark 플러그인은 markdown.processor 한 곳에만 선언 (mdx 가 상속).
// Astro 7 정식 경로는 processor: unified(...) 하나 — remarkPlugins·mdx({remarkPlugins}) 는 deprecated.
const remarkPlugins = [resolveMissingImages, resolvePostRelativeUrls];

const SITE = 'https://1up.md';

// dev 전용: astro dev 는 dist 를 안 서빙하므로 /pagefind/* 를 dist/pagefind 실파일로 직접 응답.
// prod 는 정적 자산 배포라 불필요 → apply: 'serve'. 인덱스는 마지막 build 스냅샷 (최신화하려면 재빌드).
function pagefindDevServer() {
  const dir = path.resolve('./dist/pagefind');
  const mime = {
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.wasm': 'application/wasm',
  };
  return {
    name: 'pagefind-dev-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/pagefind', (req, res, next) => {
        const rel = decodeURIComponent((req.url || '/').split('?')[0]);
        const filePath = path.join(dir, rel);
        // 디렉토리 탈출 방지 + dist/pagefind 존재(=빌드됨) 확인
        if (!filePath.startsWith(dir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          return next();
        }
        res.setHeader('Content-Type', mime[path.extname(filePath)] || 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  site: SITE,
  base: '/',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  devToolbar: {
    enabled: false,
  },
  image: {
    layout: 'none',
  },
  // mdx 는 markdown 설정 상속 (extendMarkdownConfig 기본 true) → 옵션 안 넘김.
  integrations: [mdx()],
  markdown: {
    processor: unified({ remarkPlugins }),
    shikiConfig: {
      theme: 'nord',
    },
  },
  vite: {
    // ClientRouter 의 transitions 가상 모듈은 초기 dep 스캔에 안 잡혀 늦게 발견 →
    // 재최적화·리로드(504 Outdated Optimize Dep) 유발. 콜드 스타트에 미리 번들해 차단.
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
    plugins: [yaml(), pagefindDevServer()]
  },
  server: {
    host: true,
    port: 4321
  }
});

