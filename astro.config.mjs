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
  markdown: {
    remarkPlugins: [resolvePostRelativeUrls],
    shikiConfig: {
      theme: 'nord',
    },
  },
  vite: {
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

