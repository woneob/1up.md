import site from '~/data/site.config.yml';

// JSON-LD 노드 그래프 빌더. site.config.yml 을 단일 출처로 사용(다른 엔드포인트와 동일).
// 모든 페이지는 baseGraph()(WebSite + Person + 로고 ImageObject)를 깔고, 페이지별
// 노드를 @id 참조로 연결한다. Google 은 페이지 단위로 평가하므로 참조가 같은 페이지
// 안에서 풀리도록 베이스 그래프를 전 페이지에 주입한다(DefaultLayout → Head).

const SITE_URL = site.url.replace(/\/$/, '');
const LOCALE = site.language.locale.replace('_', '-'); // ko_KR → ko-KR

const ID = {
  website: `${SITE_URL}/#website`,
  person: `${SITE_URL}/#person`,
  logo: `${SITE_URL}/#logo`,
};

// 본문 메타용 텍스트 정규화: YAML 블록 스칼라/폴디드로 들어온 줄바꿈을 공백으로.
const oneLine = (str) => String(str ?? '').replace(/\s*\n\s*/g, ' ').trim();

function socialUrls() {
  const s = site.author?.social ?? {};
  const urls = [];
  if (s.x) urls.push(`https://x.com/${s.x}`);
  if (s.github) urls.push(`https://github.com/${s.github}`);
  return urls;
}

function logoNode() {
  const icon = site.siteIcons.find((i) => i.sizes === '180x180') ?? site.siteIcons[0];
  return {
    '@type': 'ImageObject',
    '@id': ID.logo,
    url: `${SITE_URL}${icon.href}`,
    width: 180,
    height: 180,
  };
}

function personNode() {
  return {
    '@type': 'Person',
    '@id': ID.person,
    name: site.author.name,
    url: `${SITE_URL}/about`,
    image: { '@id': ID.logo },
    ...(site.author.email ? { email: `mailto:${site.author.email}` } : {}),
    sameAs: socialUrls(),
  };
}

function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': ID.website,
    url: SITE_URL,
    name: site.siteName,
    description: site.tagline,
    inLanguage: LOCALE,
    publisher: { '@id': ID.person },
  };
}

// 전 페이지 공통 노드.
export function baseGraph() {
  return [websiteNode(), personNode(), logoNode()];
}

function breadcrumbNode(pageUrl, items) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.item ? { item: it.item } : {}),
    })),
  };
}

// 목록 페이지에서 글을 가리키는 최소 BlogPosting 스텁(@id 로 상세 페이지 노드와 병합).
function postStub(slug) {
  return {
    '@type': 'BlogPosting',
    '@id': `${SITE_URL}/${slug}#article`,
    url: `${SITE_URL}/${slug}`,
  };
}

// 포스트 상세 — BlogPosting + BreadcrumbList.
export function postGraph(post, { url, coverUrl } = {}) {
  const fm = post.frontmatter;
  const pageUrl = (url ?? `${SITE_URL}/${post.slug}`).replace(/\/$/, '');
  const headline = oneLine(fm.title);
  // dateModified: updatedDate 가 없으면 datePublished 와 동일 값.
  const modified = fm.updatedDate || fm.pubDate;

  return [
    {
      '@type': 'BlogPosting',
      '@id': `${pageUrl}#article`,
      isPartOf: { '@id': ID.website },
      mainEntityOfPage: pageUrl,
      url: pageUrl,
      headline,
      ...(fm.description ? { description: oneLine(fm.description) } : {}),
      datePublished: fm.pubDate,
      dateModified: modified,
      author: { '@id': ID.person },
      publisher: { '@id': ID.person },
      ...(fm.tags?.length ? { keywords: fm.tags } : {}),
      ...(coverUrl ? { image: coverUrl } : { image: { '@id': ID.logo } }),
      inLanguage: LOCALE,
    },
    breadcrumbNode(pageUrl, [
      { name: 'Home', item: SITE_URL },
      { name: headline },
    ]),
  ];
}

// 홈(인덱스) — Blog + CollectionPage. posts: getAllPosts() 결과.
export function blogGraph(posts = []) {
  return [
    {
      '@type': ['CollectionPage', 'Blog'],
      '@id': `${SITE_URL}/#blog`,
      url: SITE_URL,
      name: site.siteName,
      description: site.tagline,
      isPartOf: { '@id': ID.website },
      inLanguage: LOCALE,
      mainEntity: { '@id': ID.person },
      blogPost: posts.map((p) => postStub(p.slug)),
    },
  ];
}

// about — ProfilePage(주체는 공유 Person @id).
export function profileGraph() {
  const pageUrl = `${SITE_URL}/about`;
  return [
    {
      '@type': 'ProfilePage',
      '@id': `${pageUrl}#profilepage`,
      url: pageUrl,
      name: `About — ${site.author.name}`,
      isPartOf: { '@id': ID.website },
      inLanguage: LOCALE,
      mainEntity: { '@id': ID.person },
    },
    breadcrumbNode(pageUrl, [
      { name: 'Home', item: SITE_URL },
      { name: 'About' },
    ]),
  ];
}

// 태그 목록/태그별 페이지 — CollectionPage + BreadcrumbList.
// breadcrumb: [{name,item?}, ...] (마지막 항목은 현재 페이지, item 생략).
export function collectionGraph({ url, name, description, slugs = [], breadcrumb = [] }) {
  const pageUrl = url.replace(/\/$/, '');
  return [
    {
      '@type': 'CollectionPage',
      '@id': `${pageUrl}#collection`,
      url: pageUrl,
      name,
      ...(description ? { description: oneLine(description) } : {}),
      isPartOf: { '@id': ID.website },
      inLanguage: LOCALE,
      ...(slugs.length ? { hasPart: slugs.map(postStub) } : {}),
    },
    breadcrumbNode(pageUrl, breadcrumb),
  ];
}
