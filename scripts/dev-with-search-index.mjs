// dev 서버를 먼저 띄우고, 검색 인덱스(dist/pagefind)는 ready 후 백그라운드 생성.
// build+dev 동시 콜드 스타트는 .astro/.vite/dist 경합 → dev 의 "ready in" 감지 후 인덱스 빌드.
// pagefindDevServer 가 /pagefind 를 매번 fs 로 읽어, 빌드 끝나면 재시작 없이 검색 동작.
//
// 사용: node scripts/dev-with-search-index.mjs [--draft]

import { spawn } from 'node:child_process';

const draft = process.argv.includes('--draft');
const devCmd = draft ? 'astro dev --mode draft' : 'astro dev';
const indexCmd = draft ? 'pnpm run build:draft' : 'pnpm run build';

const log = (msg) => process.stdout.write(`\n[search-index] ${msg}\n`);

// dev 서버 기동. stdout 만 가로채 readiness 감지 + 패스스루.
const dev = spawn(devCmd, { stdio: ['inherit', 'pipe', 'inherit'], shell: true });

let indexKicked = false;
let indexProc = null;

const kickIndex = () => {
  if (indexKicked) return;
  indexKicked = true;
  clearTimeout(fallback);
  log('dev server ready — building search index in the background...');
  indexProc = spawn(indexCmd, { stdio: ['ignore', 'inherit', 'inherit'], shell: true });
  indexProc.on('exit', (code) => {
    indexProc = null;
    log(code === 0 ? '✓ search index ready (no server restart needed)' : `✗ index build failed (exit ${code})`);
  });
};

dev.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  if (/ready in/i.test(chunk.toString())) kickIndex();
});

// "ready in" 신호 놓칠 때(astro 출력 변경 등) 대비 안전망.
const fallback = setTimeout(kickIndex, 15000);

// 종료 신호 전파 + dev 종료 시 백그라운드 인덱스 정리.
const shutdown = (sig) => {
  if (indexProc) indexProc.kill(sig);
  dev.kill(sig);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
dev.on('exit', (code) => {
  if (indexProc) indexProc.kill('SIGTERM');
  process.exit(code ?? 0);
});
