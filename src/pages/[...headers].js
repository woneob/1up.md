import globalCssUrl from '~/styles/global.scss?url';

// 빌드 시 dist/_headers 를 생성하는 단일 라우트. Cloudflare Pages 가 이 Link 응답
// 헤더를 103 Early Hints 로 승격한다. @font-face·CSS 는 HTML <link> 자동 승격 대상이
// 아니라 응답 헤더로 직접 내보내야 함. CSS 는 ?url 로 Astro 실제 컴파일 해시를 얻어
// 캐시버스팅까지 정확(Head.astro 의 stylesheet 와 동일 모듈 → 링크=preload 일치).
//
// 파일명이 '_' 로 시작하면(_headers.js) Astro 가 페이지 스캔에서 제외하므로, 루트
// 단일 세그먼트 [slug].astro 와 충돌하지 않는 catch-all([...])로 '_headers' 하나만
// 생성한다. (이 라우트는 오직 _headers 만 만든다.)
export function getStaticPaths() {
  return [{ params: { headers: '_headers' } }];
}

const fontPreload = (file) =>
  `Link: </fonts/${file}>; rel=preload; as=font; type=font/woff2; crossorigin`;

export async function GET() {
  const body = [
    '/*',
    `  ${fontPreload('Pretendard-Regular.subset.woff2')}`,
    `  ${fontPreload('Pretendard-Bold.subset.woff2')}`,
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
