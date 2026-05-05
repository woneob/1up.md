import path from 'node:path';
import site from '~/data/site.config.yml';

const POST_DIR_PATTERN = /^(\d{4}-\d{2}-\d{2})\.(.+)$/;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(value) {
  return `<![CDATA[${String(value).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

export async function GET(context) {
  const modules = import.meta.glob('/src/content/posts/*/index.md', { eager: true });

  const items = Object.entries(modules)
    .map(([filePath, mod]) => {
      const dir = path.basename(path.dirname(filePath));
      const match = dir.match(POST_DIR_PATTERN);

      if (!match) {
        throw new Error(`포스트 디렉토리 형식 오류: ${dir}`);
      }

      const slug = match[2];
      const { title, description, pubDate, tags } = mod.frontmatter;

      return { slug, title, description, pubDate, tags: tags ?? [] };
    })
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  const siteUrl = context.site?.toString().replace(/\/$/, '') ?? site.url;
  const feedUrl = `${siteUrl}/rss.xml`;

  const itemsXml = items
    .map(({ slug, title, description, pubDate, tags }) => {
      const link = `${siteUrl}/${slug}`;
      const categories = tags.map(tag => `    <category>${escapeXml(tag)}</category>`).join('\n');

      return [
        '  <item>',
        `    <title>${cdata(title)}</title>`,
        `    <link>${escapeXml(link)}</link>`,
        `    <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `    <pubDate>${new Date(pubDate).toUTCString()}</pubDate>`,
        `    <description>${cdata(description ?? '')}</description>`,
        categories,
        '  </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${cdata(site.siteName)}</title>
  <link>${escapeXml(siteUrl)}</link>
  <description>${cdata(site.description ?? site.tagline)}</description>
  <language>${escapeXml(site.language.locale)}</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${itemsXml}
</channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
