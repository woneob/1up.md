import path from 'node:path';
import readingTime from 'reading-time';

const POST_DIR_PATTERN = /^(\d{4}-\d{2}-\d{2})\.(.+)$/;

// 콘텐츠 소스: draft 모드(`astro dev --mode draft`)는 gitignore된 content.draft/,
// 그 외(dev/build)는 배포용 content/ 를 사용. import.meta.glob 은 패턴에 변수/
// 템플릿 보간을 허용하지 않으므로(정적 리터럴만), prod/dev 글로브를 쌍으로 선언하고
// pick() 으로 한 곳에서 고른다.
const DRAFT = import.meta.env.MODE === 'draft';
const pick = (prod, dev) => (DRAFT ? dev : prod);

const postModules = pick(
  import.meta.glob('/src/content/posts/*/index.md', { eager: true }),
  import.meta.glob('/src/content.draft/posts/*/index.md', { eager: true }),
);
const coverModules = pick(
  import.meta.glob('/src/content/posts/*/images/cover.{jpg,jpeg,png,webp}', { eager: true, import: 'default' }),
  import.meta.glob('/src/content.draft/posts/*/images/cover.{jpg,jpeg,png,webp}', { eager: true, import: 'default' }),
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

// 데모 라우트용 — 콘텐츠 소스 선택은 postModules 와 동일하게 pick() 을 거친다.
export function getDemoModules() {
  return pick(
    import.meta.glob('/src/content/posts/*/demos/*/index.astro', { eager: true }),
    import.meta.glob('/src/content.draft/posts/*/demos/*/index.astro', { eager: true }),
  );
}
