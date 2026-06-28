const getRobotsTxt = (sitemapURL) => [
  'User-agent: *',
  'Allow: /',
  '',
  `Content-Signal: ai-train=yes, search=yes, ai-input=yes`,
  `Sitemap: ${sitemapURL.href}`,
  '',
].join('\n');

export const GET = ({ site }) => {
  const sitemapURL = new URL('sitemap.xml', site);

  return new Response(getRobotsTxt(sitemapURL));
};
