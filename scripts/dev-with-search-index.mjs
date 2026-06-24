// dev 서버를 가능한 빨리 띄우고, 검색 인덱스(dist/pagefind)는 서버가 준비된 뒤
// 백그라운드에서 생성한다. 로컬 개발에선 검색이 주 목적이 아니므로 기동 속도를 우선.
//
// 왜 "기동 전 선행 빌드"가 아니라 "기동 후 백그라운드"인가:
//   - astro build 와 astro dev 를 동시에 콜드 스타트하면 .astro/.vite 캐시·dist 를
//     함께 건드려 경합 가능. 그래서 병렬이 아니라, dev 의 cold-start optimizeDeps 가
//     끝난 시점(stdout 의 "ready in" 신호)을 감지한 뒤에 인덱스 빌드를 시작한다.
//   - pagefindDevServer(astro.config.mjs)는 /pagefind 요청을 매번 fs 로 읽으므로,
//     백그라운드 빌드가 끝나면 dev 재시작 없이 곧바로 검색이 동작한다.
//
// 사용: node scripts/dev-with-search-index.mjs [--draft]

import { spawn } from 'node:child_process';

const draft = process.argv.includes('--draft');
const devCmd = draft ? 'astro dev --mode draft' : 'astro dev';
const indexCmd = draft ? 'npm run build:draft' : 'npm run build';

const log = (msg) => process.stdout.write(`\n[search-index] ${msg}\n`);

// 1) dev 서버 즉시 기동. stdout 만 가로채 readiness 를 감지하고 그대로 패스스루.
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

// "ready in" 신호를 놓치는 경우(astro 출력 변경 등)를 대비한 안전망.
const fallback = setTimeout(kickIndex, 15000);

// 종료 신호 전파 + dev 종료 시 백그라운드 인덱스도 정리.
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
