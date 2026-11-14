import { luminance, toRgb, toHex, contrast } from '../colors.js';

// 플레이스홀더↔배경 4.5:1, 플레이스홀더↔입력 글자 3:1 → 배경↔입력 글자는 두 값의 곱 이상 필요
export const MIN = { background: 4.5, text: 3 };
const MIN_PAIR = MIN.background * MIN.text;
const STEPS = 1000;

export const parseHex = (value) => {
  const text = value.trim().replace(/^#/, '');
  if (!/^([\da-f]{3}|[\da-f]{6})$/i.test(text)) return null;
  return toHex(toRgb(text));
};

const floor2 = (value) => Math.floor(value * 100) / 100;
export const ratio = (a, b) => floor2(contrast(luminance(toRgb(a)), luminance(toRgb(b))));

const toHsl = ([r, g, b]) => {
  const [R, G, B] = [r, g, b].map((v) => v / 255);
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l];
};
const fromHsl = ([h, s, l]) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
};

// 배경색·입력 글자색에 맞는 플레이스홀더 색 탐색
// - 플레이스홀더 후보(tone): neutral = 무채색, tinted = 글자색의 색상(H)·채도(S) 유지. 명도(L)만 변경
// - 글자색 후보: 항상 글자색의 색상·채도 유지
// - 플레이스홀더는 배경과 글자 사이 밝기로 한정
// 반환 status
// - ok: 두 기준 충족. placeholder = 가장 연한 색, range = [가장 연한 색, 가장 진한 색]
// - text: 현재 글자색으론 불가. pair = 가장 가까운 통과 글자색 + 플레이스홀더
// - background: 어떤 글자색으로도 불가
// ok 가 아닐 때 placeholder = 배경 대비 기준만 채운 가장 연한 색(없으면 글자색)
export function solve(background, text, tone = 'neutral') {
  const [h, s, l] = toHsl(toRgb(text));
  const bgLum = luminance(toRgb(background));
  const textLum = luminance(toRgb(text));
  const shades = (saturation) => Array.from({ length: STEPS + 1 }, (_, i) => {
    const rgb = fromHsl([h, saturation, i / STEPS]);
    return { hex: toHex(rgb), lum: luminance(rgb) };
  });
  const pool = shades(s);
  const placeholders = tone === 'tinted' ? pool : shades(0);
  const fit = (lum) => {
    const [low, high] = [Math.min(lum, bgLum), Math.max(lum, bgLum)];
    const readable = placeholders
      .filter((p) => p.lum >= low && p.lum <= high && floor2(contrast(p.lum, bgLum)) >= MIN.background)
      .sort((a, b) => Math.abs(a.lum - bgLum) - Math.abs(b.lum - bgLum));
    return { readable, valid: readable.filter((p) => floor2(contrast(p.lum, lum)) >= MIN.text) };
  };

  const { readable, valid } = fit(textLum);
  if (valid.length) return { status: 'ok', placeholder: valid[0].hex, range: [valid[0].hex, valid.at(-1).hex], pair: null };

  const start = Math.round(l * STEPS);
  let pair = null;
  for (let step = 1; step <= STEPS && !pair; step++) {
    for (const index of [start - step, start + step]) {
      const candidate = pool[index];
      if (!candidate || floor2(contrast(candidate.lum, bgLum)) < MIN_PAIR) continue;
      const match = fit(candidate.lum).valid[0];
      if (!match) continue;
      pair = { text: candidate.hex, placeholder: match.hex };
      break;
    }
  }
  return { status: pair ? 'text' : 'background', placeholder: readable[0]?.hex ?? text, range: null, pair };
}
