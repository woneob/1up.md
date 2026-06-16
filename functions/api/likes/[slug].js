// GET    /api/likes/:slug → 현재 좋아요 수 반환 (증감 없음)
// POST   /api/likes/:slug → 좋아요 +1 후 반환 (원자적 upsert)
// DELETE /api/likes/:slug → 좋아요 -1 후 반환 (0 미만 방지)
// D1 바인딩: env.DB (wrangler.toml 참조)

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export async function onRequestGet({ params, env }) {
  const slug = params.slug;
  if (!slug) return json({ error: 'missing slug' }, 400);
  const row = await env.DB.prepare('SELECT count FROM likes WHERE slug = ?1')
    .bind(slug)
    .first();
  return json({ slug, count: row ? row.count : 0 });
}

export async function onRequestPost({ params, env }) {
  const slug = params.slug;
  if (!slug) return json({ error: 'missing slug' }, 400);
  const row = await env.DB.prepare(
    'INSERT INTO likes (slug, count) VALUES (?1, 1) ' +
      'ON CONFLICT(slug) DO UPDATE SET count = count + 1 RETURNING count'
  )
    .bind(slug)
    .first();
  return json({ slug, count: row ? row.count : 1 });
}

export async function onRequestDelete({ params, env }) {
  const slug = params.slug;
  if (!slug) return json({ error: 'missing slug' }, 400);
  const row = await env.DB.prepare(
    'INSERT INTO likes (slug, count) VALUES (?1, 0) ' +
      'ON CONFLICT(slug) DO UPDATE SET count = MAX(0, count - 1) RETURNING count'
  )
    .bind(slug)
    .first();
  return json({ slug, count: row ? row.count : 0 });
}
