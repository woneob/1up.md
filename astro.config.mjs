import { defineConfig } from 'astro/config';
import yaml from '@rollup/plugin-yaml';
import sitemap from '@astrojs/sitemap';
import path from 'path';
import resolvePostRelativeUrls from './src/plugins/resolve-post-relative-urls.mjs';

export default defineConfig({
  site: 'https://1up.md',
  base: '/',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [sitemap()],
  image: {
    layout: 'constrained',
  },
  markdown: {
    remarkPlugins: [resolvePostRelativeUrls],
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

