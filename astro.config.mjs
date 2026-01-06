import { defineConfig } from 'astro/config';
import yaml from '@rollup/plugin-yaml';
import sitemap from '@astrojs/sitemap';
import path from 'path';

export default defineConfig({
  site: 'https://1up.page',
  base: '/',
  output: 'static',
  integrations: [sitemap()],
  markdown: {
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
      'import.meta.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
    },
    plugins: [yaml()]
  },
  server: {
    host: true,
    port: 4321
  }
});

