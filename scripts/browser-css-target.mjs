// browserslist 쿼리(package.json) → Vite build.cssTarget(esbuild 타깃 문자열).
// astro.config 가 빌드 시 호출. 생성 파일 없음.
import browserslist from 'browserslist';

// browserslist 이름(키) → esbuild 타깃 이름(값). cssTarget 이 인식하는 브라우저만 매핑, 나머지(samsung·and_chr 등)는 제외.
// browserslist 이름: https://github.com/browserslist/browserslist#browsers
// esbuild 타깃 이름: https://esbuild.github.io/api/#target
const NAME_MAP = { chrome: 'chrome', edge: 'edge', firefox: 'firefox', safari: 'safari', ios_saf: 'ios', opera: 'opera', ie: 'ie' };

// browserslist 결과를 브라우저별 최소 버전으로 접어 esbuild 타깃 문자열 배열로.
export default function browserCssTarget() {
  const min = {};
  for (const entry of browserslist()) {
    const [name, versions] = entry.split(' ');
    const browser = NAME_MAP[name];
    if (!browser) continue;
    const version = parseFloat(versions); // "11.0-11.2" → 11
    if (Number.isNaN(version)) continue;
    if (min[browser] === undefined || version < min[browser]) min[browser] = version;
  }
  return Object.entries(min)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([browser, version]) => `${browser}${version}`);
}
