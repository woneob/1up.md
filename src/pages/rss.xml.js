import site from '~/data/site.config.yml';
import { getAllPosts } from '~/utils/posts.js';

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
  const items = getAllPosts().map(({ slug, frontmatter }) => ({
    slug,
    title: frontmatter.title,
    description: frontmatter.description,
    pubDate: frontmatter.pubDate,
    tags: frontmatter.tags ?? [],
  }));

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

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `  <title>${cdata(site.siteName)}</title>`,
    `  <link>${escapeXml(siteUrl)}</link>`,
    `  <description>${cdata(site.description ?? site.tagline)}</description>`,
    `  <language>${escapeXml(site.language.locale)}</language>`,
    `  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `  <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    itemsXml,
    '</channel>',
    '</rss>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
