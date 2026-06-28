import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import yaml from '@rollup/plugin-yaml';
import path from 'path';
import fs from 'node:fs';
import resolvePostRelativeUrls from './src/plugins/resolve-post-relative-urls.mjs';
import stripH1 from './src/plugins/strip-h1.mjs';

const SITE = 'https://1up.md';

// dev 전용: Pagefind 검색 인덱스는 빌드 산출물(dist/pagefind)에만 존재한다. astro dev 는
// dist 를 서빙하지 않으므로, /pagefind/* 요청을 dist/pagefind 의 실제 파일로 직접 응답하는
// 미들웨어를 붙인다. public/ 을 오염시키지 않고(빌드 산출물은 dist 에 그대로 둠), prod 에선
// 정적 자산으로 배포되므로 이 미들웨어는 불필요 → apply: 'serve'. 인덱스는 마지막 `npm run
// build`(= astro build && pagefind --site dist) 시점의 스냅샷이라, 최신화하려면 재빌드한다.
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
    plugins: [yaml(), pagefindDevServer()]
  },
  server: {
    host: true,
    port: 4321
  }
});

