// ▲(border-bottom 삼각형) W×H 박스의 꼭짓점·무게중심 계산 — SSR(index.astro)·런타임(script.js) 공용.
// 좌표는 박스 왼쪽 위 (0, 0) 기준, SVG 배치용 원점(ox, oy)은 별도 반환.
export const VIEW = { width: 320, height: 210, top: 34 };

export const fmt = (n) => String(Math.round(n * 100) / 100);

export function layout(w, h) {
  const A = { x: w / 2, y: 0 };
  const B = { x: 0, y: h };
  const C = { x: w, y: h };
  const G = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
  const ox = (VIEW.width - w) / 2;
  const oy = VIEW.top;
  return { A, B, C, G, ox, oy, w, h };
}
