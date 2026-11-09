/**
 * 인라인 코드가 색상 값이면 견본(swatch) 표시용 속성 부여.
 *
 * - 대상: `inlineCode` 노드 전체가 색상 값인 경우만 (펜스 코드 블록 제외)
 * - 지원: HEX(#RGB·#RGBA·#RRGGBB·#RRGGBBAA), rgb/rgba/hsl/hsla/hwb/lab/lch/oklab/oklch 함수형
 * - 노드 `data.hProperties` 로 `data-color` + `--swatch` 주입 (md·mdx 공통 hast 변환 경로)
 * - 값 해석은 브라우저 위임 — 무효 값이면 background 무효 처리로 견본만 안 보임
 * - 견본 그리기는 global.scss `code[data-color]::before`
 */
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNC = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[\d\s.,%/a-z+-]+\)$/i;

function walk(node) {
  if (!Array.isArray(node.children)) return;

  for (const child of node.children) {
    if (child.type === 'inlineCode') {
      const value = child.value.trim();
      if (HEX.test(value) || FUNC.test(value)) {
        child.data = {
          ...child.data,
          hProperties: {
            ...child.data?.hProperties,
            'data-color': '',
            style: `--swatch:${value}`,
          },
        };
      }
      continue;
    }
    walk(child);
  }
}

export default function colorSwatch() {
  return (tree) => walk(tree);
}
