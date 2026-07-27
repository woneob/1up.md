import path from 'node:path';
import readingTime from 'reading-time';

const POST_DIR_PATTERN = /^(\d{4}-\d{2}-\d{2})\.(.+)$/;

// 콘텐츠 소스: draft 모드는 gitignore된 content.draft/, 그 외는 배포용 content/.
// import.meta.glob 은 정적 리터럴만 허용 → prod/dev 글로브를 쌍으로 선언하고 pick() 으로 선택.
const DRAFT = import.meta.env.MODE === 'draft';
const pick = (prod, dev) => (DRAFT ? dev : prod);

const postModules = pick(
  import.meta.glob('/src/content/posts/*/index.mdx', { eager: true }),
  import.meta.glob('/src/content.draft/posts/*/index.mdx', { eager: true }),
);
// MDX 는 rawContent()/compiledContent() 를 export 안 함 → readingTime 용 원문을
// ?raw 로 별도 로드 (키는 postModules 와 동일한 파일 경로).
const postRawModules = pick(
  import.meta.glob('/src/content/posts/*/index.mdx', { eager: true, query: '?raw', import: 'default' }),
  import.meta.glob('/src/content.draft/posts/*/index.mdx', { eager: true, query: '?raw', import: 'default' }),
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
        stats: readingTime(postRawModules[filePath] ?? ''),
      };
    })
    .sort((a, b) => new Date(b.frontmatter.pubDate).getTime() - new Date(a.frontmatter.pubDate).getTime());

  return cachedPosts;
}

// 기본은 unlisted 포스트 제외 — 목록·태그·RSS·llms 등 getAllPosts() 를 거치는 모든 연결점에서
// 자동으로 빠짐. includeUnlisted 는 페이지 생성이 필요한 [slug].astro getStaticPaths 전용.
export function getAllPosts({ includeUnlisted = false } = {}) {
  const posts = loadPosts();
  return includeUnlisted ? posts : posts.filter(post => !post.frontmatter.unlisted);
}

// 직접 URL 접근용 — unlisted 무관하게 슬러그로 조회 (상세는 항상 열람 가능).
export function getPostBySlug(slug) {
  return loadPosts().find(post => post.slug === slug) ?? null;
}
