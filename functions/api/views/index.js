// GET /api/views?slugs=a,b,c → 여러 슬러그 조회수 배치 조회 (목록 페이지용)
// 응답: { counts: { a: 12, b: 0, ... } }  (없는 슬러그는 0)
// D1 바인딩: env.DB (wrangler.toml 참조)

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slugs = [
    ...new Set(
      (url.searchParams.get('slugs') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ].slice(0, 100); // 과도한 IN 절 방지

  const counts = Object.fromEntries(slugs.map((s) => [s, 0]));
  if (!slugs.length) return json({ counts });

  const placeholders = slugs.map((_, i) => `?${i + 1}`).join(',');
  const { results } = await env.DB.prepare(
    `SELECT slug, count FROM views WHERE slug IN (${placeholders})`
  )
    .bind(...slugs)
    .all();
  for (const r of results) counts[r.slug] = r.count;

  return json({ counts });
}
