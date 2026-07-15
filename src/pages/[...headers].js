import globalCssUrl from '~/styles/global.scss?url';

// dist/_headers 를 생성하는 단일 라우트. Cloudflare Pages 가 Link 응답 헤더를 103 Early
// Hints 로 승격 — @font-face·CSS 는 HTML <link> 자동 승격 대상이 아니라 응답 헤더로 내보냄.
// CSS 는 ?url 로 Astro 컴파일 해시를 얻어 캐시버스팅 정확(Head.astro stylesheet 와 동일 모듈).
//
// '_' 로 시작하는 파일명(_headers)은 Astro 페이지 스캔에서 제외되므로,
// [slug].astro 와 안 겹치는 catch-all([...])로 _headers 만 생성.
export function getStaticPaths() {
  return [{ params: { headers: '_headers' } }];
}

const fontPreload = (file) =>
  `Link: </fonts/${file}>; rel=preload; as=font; type=font/woff2; crossorigin`;

export async function GET() {
  const body = [
    '/*',
    `  ${fontPreload('PretendardVariable.subset.woff2')}`,
    `  Link: <${globalCssUrl}>; rel=preload; as=style`,
    '',
    '/',
    `  ${fontPreload('Outfit-ExtraLight.subset.woff2')}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
