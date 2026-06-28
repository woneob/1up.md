import { getAllPosts } from '~/utils/posts.js';

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 포스트의 최종 수정일 — JSON-LD dateModified 와 동일 규칙(updatedDate, 없거나 비면 pubDate).
// 프론트매터는 'ISO + 타임존 오프셋' 문자열(예: 2025-10-20T14:10:12+09:00). toISOString()은 UTC(Z)
// 로 바꿔버리므로, 오프셋을 보존하려고 유효성만 확인하고 원본 문자열을 그대로 출력한다(W3C Datetime).
function postLastmod({ frontmatter }) {
  const raw = frontmatter.updatedDate || frontmatter.pubDate;
  if (!raw) return undefined;
  const s = String(raw).trim();
  return Number.isNaN(new Date(s).getTime()) ? undefined : s;
}

// 여러 날짜 중 가장 최근값(없으면 undefined).
function latest(dates) {
  const valid = dates.filter(Boolean);
  if (valid.length === 0) return undefined;
  return valid.reduce((a, b) => (new Date(a) >= new Date(b) ? a : b));
}

export async function GET(context) {
  // getAllPosts() 가 unlisted 를 기본 필터링하므로 사이트맵 제외가 한 번에 처리됨
  // (인덱스·태그·RSS·llms.txt 와 동일 단일 출처). 데모(/<slug>/demos/<demo>)는 라우트로
  // 열거하지 않으니 자연히 제외 — noindex standalone 페이지라 색인 대상이 아님.
  const posts = getAllPosts();

  const tags = new Set();
  posts.forEach(({ frontmatter }) => (frontmatter.tags ?? []).forEach(t => tags.add(t)));

  const siteLatest = latest(posts.map(postLastmod)); // 전체 포스트 중 최신 수정일

  // { path, lastmod } 목록. lastmod 는 신뢰할 변경 신호가 있을 때만 — 없으면 <lastmod> 생략
  // (about 처럼 날짜 신호가 없는 페이지에 빌드시각 등을 박으면 lastmod 신뢰도만 떨어뜨림).
  const entries = [
    { path: '', lastmod: siteLatest },     // 홈 = 최신 포스트 기준
    { path: 'about' },                     // 신뢰할 날짜 없음 → 생략
    { path: 'tags', lastmod: siteLatest }, // 태그 인덱스 = 최신 포스트 기준
    ...posts.map(p => ({ path: p.slug, lastmod: postLastmod(p) })),
    ...Array.from(tags).map(tag => ({
      path: `tags/${tag}`,
      lastmod: latest(posts.filter(p => (p.frontmatter.tags ?? []).includes(tag)).map(postLastmod)),
    })),
  ];

  const urls = entries.map(({ path, lastmod }) => {
    // new URL 로 절대화 + 경로 인코딩(한글 태그 등). trailingSlash: 'never' 에 맞춰 끝 슬래시 제거.
    const loc = new URL(path, context.site).href.replace(/\/$/, '');
    const inner = [`    <loc>${escapeXml(loc)}</loc>`];
    if (lastmod) inner.push(`    <lastmod>${lastmod}</lastmod>`);
    return ['  <url>', ...inner, '  </url>'].join('\n');
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
