import path from 'node:path';
import readingTime from 'reading-time';

const POST_DIR_PATTERN = /^(\d{4}-\d{2}-\d{2})\.(.+)$/;

const postModules = import.meta.glob('/src/content/posts/*/index.md', { eager: true });
const coverModules = import.meta.glob(
  '/src/content/posts/*/images/cover.{jpg,jpeg,png,webp}',
  { eager: true, import: 'default' }
);

const coverByDir = Object.entries(coverModules).reduce((map, [filePath, img]) => {
  const dir = filePath.replace(/\\/g, '/').replace(/\/images\/[^/]+$/, '');
  if (!map[dir]) map[dir] = img;
  return map;
}, {});

function parsePostPath(filePath) {
  const dir = path.dirname(filePath).replace(/\\/g, '/');
  const base = path.basename(dir);
  const match = base.match(POST_DIR_PATTERN);

  if (!match) throw new Error(`포스트 디렉토리 형식 오류: ${base}`);

  return { dir, date: match[1], slug: match[2] };
}

let cachedPosts = null;

function loadPosts() {
  if (cachedPosts) return cachedPosts;

  cachedPosts = Object.entries(postModules)
    .map(([filePath, mod]) => {
      const { dir, date, slug } = parsePostPath(filePath);

      return {
        slug,
        date,
        dir,
        frontmatter: mod.frontmatter ?? {},
        module: mod,
        cover: coverByDir[dir] ?? null,
        stats: readingTime(mod.rawContent()),
      };
    })
    .sort((a, b) => new Date(b.frontmatter.pubDate).getTime() - new Date(a.frontmatter.pubDate).getTime());

  return cachedPosts;
}

export function getAllPosts() {
  return loadPosts();
}

export function getPostBySlug(slug) {
  return loadPosts().find(post => post.slug === slug) ?? null;
}
