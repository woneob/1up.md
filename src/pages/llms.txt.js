import site from '~/data/site.config.yml';
import { getAllPosts } from '~/utils/posts.js';

const MAX_WIDTH = 120;
// 한글 등 전각 문자는 모노스페이스에서 2컬럼을 차지하므로 시각적 폭으로 계산한다.
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u;

function displayWidth(str) {
  let width = 0;
  for (const ch of str) width += WIDE.test(ch) ? 2 : 1;
  return width;
}

// 컬럼 수로 강제 절단하지 않고, 문장 끝(. ? ! …)이나 쉼표 등 의미 경계에서만
// 끊는다. 경계 사이 조각을 maxWidth까지 욕심껏 채우되, 한 조각이 폭을 넘겨도
// 그 안에서는 쪼개지 않는다.
function wrapLines(text, maxWidth) {
  const chunks = text.trim().split(/(?<=[.?!…,]["'”’)\]]*)\s+/u);
  const lines = [];
  let cur = '';

  for (const chunk of chunks) {
    if (!cur) cur = chunk;
    else if (displayWidth(cur) + 1 + displayWidth(chunk) <= maxWidth) cur += ` ${chunk}`;
    else { lines.push(cur); cur = chunk; }
  }
  if (cur) lines.push(cur);

  return lines;
}

export async function GET(context) {
  const siteUrl = context.site?.toString().replace(/\/$/, '') ?? site.url;

  // "> " 접두사(2컬럼)를 붙이므로 본문 폭은 그만큼 줄여서 래핑.
  const summary = wrapLines(site.description ?? site.tagline, MAX_WIDTH - 2)
    .map(line => `> ${line}`)
    .join('\n');

  const posts = getAllPosts().map(({ slug, date, frontmatter }) => {
    const lines = [
      `### ${frontmatter.title}`,
      `- URL: ${siteUrl}/${slug}`,
      `- 등록일: ${date}`,
    ];
    if (frontmatter.description) {
      // "- 요약: "(8컬럼) 다음 줄들은 같은 폭으로 들여써서 본문 시작 위치에 맞춘다.
      const indent = ' '.repeat(8);
      const desc = wrapLines(frontmatter.description, MAX_WIDTH - 8)
        .map((line, i) => (i === 0 ? `- 요약: ${line}` : `${indent}${line}`))
        .join('\n');
      lines.push(desc);
    }
    return lines.join('\n');
  });

  const content = [
    `# ${site.siteName}`,
    '',
    summary,
    '',
    `- Language: ${site.language.name}`,
    `- Author: ${site.author.name}`,
    '',
    '## Posts',
    '',
    posts.join('\n\n'),
    '',
    '## Optional',
    '',
    `- [RSS Feed](${siteUrl}/rss.xml)`,
    '',
  ].join('\n');

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
