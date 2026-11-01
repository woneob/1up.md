// 슬라이더 입력 → 박스·삼각형·무게중심 도형과 좌표 표기 갱신.
// 초기 렌더는 SSR(index.astro)이 같은 geometry.js 로 계산.
import { layout, fmt } from './geometry.js';

function render(demo, w, h) {
  const g = layout(w, h);
  const at = (p) => ({ x: g.ox + p.x, y: g.oy + p.y });
  const A = at(g.A);
  const B = at(g.B);
  const C = at(g.C);
  const G = at(g.G);
  const bx = g.ox - 20;

  const el = (name) => demo.querySelector(`[data-el="${name}"]`);
  const set = (name, attrs) => {
    const node = el(name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  };

  set('box', { x: g.ox, y: g.oy, width: w, height: h });
  set('tri', { points: `${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}` });
  set('median', { x1: A.x, y1: A.y, x2: A.x, y2: B.y });
  set('gline', { x1: g.ox - 8, y1: G.y, x2: g.ox + w + 8, y2: G.y });
  set('bracket', {
    d: `M${bx - 3} ${A.y}h6M${bx} ${A.y}V${G.y}M${bx - 3} ${G.y}h6M${bx} ${G.y}V${B.y}M${bx - 3} ${B.y}h6`,
  });
  set('dim-top', { x: bx - 6, y: (A.y + G.y) / 2 + 4 });
  set('dim-bottom', { x: bx - 6, y: (G.y + B.y) / 2 + 4 });
  set('va', { cx: A.x, cy: A.y });
  set('vb', { cx: B.x, cy: B.y });
  set('vc', { cx: C.x, cy: C.y });
  set('g', { cx: G.x, cy: G.y });
  set('la', { x: A.x, y: A.y - 10 });
  set('lb', { x: B.x - 4, y: B.y + 18 });
  set('lc', { x: C.x + 4, y: C.y + 18 });
  set('lg', { x: G.x + 10, y: G.y - 7 });

  const out = {
    w,
    h,
    ax: fmt(g.A.x),
    by: fmt(g.B.y),
    cx: fmt(g.C.x),
    cy: fmt(g.C.y),
    gx: fmt(g.G.x),
    gy: fmt(g.G.y),
    px: `${fmt((g.G.x / w) * 100)}%`,
    py: `${fmt((g.G.y / h) * 100)}%`,
  };
  for (const node of demo.querySelectorAll('[data-out]')) {
    node.textContent = out[node.dataset.out];
  }
}

function bind(demo) {
  if (demo.dataset.bound) return; // ClientRouter 재실행 대비 중복 바인딩 방지
  demo.dataset.bound = '1';

  const inputs = [...demo.querySelectorAll('input[data-axis]')];
  const update = () => {
    const v = Object.fromEntries(inputs.map((i) => [i.dataset.axis, Number(i.value)]));
    render(demo, v.w, v.h);
  };
  for (const input of inputs) input.addEventListener('input', update);
  update(); // 뒤로가기 시 브라우저가 복원한 슬라이더 값과 동기화
}

function init() {
  for (const demo of document.querySelectorAll('.cc-demo')) bind(demo);
}

// ClientRouter(운영)는 astro:page-load 로 매 네비게이션 재실행, dev 는 1회.
if (import.meta.env.PROD) {
  document.addEventListener('astro:page-load', init);
} else if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
