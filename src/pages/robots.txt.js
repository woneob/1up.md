const getRobotsTxt = (sitemapURL) => [
  'User-agent: *',
  'Allow: /',
  '',
  `Sitemap: ${sitemapURL.href}`,
  '',
].join('\n');

export const GET = ({ site }) => {
  const sitemapURL = new URL('sitemap-index.xml', site);

  return new Response(getRobotsTxt(sitemapURL));
};
