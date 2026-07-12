/**
 * 포스트 본문의 raw HTML(mdast `html` 노드) 에서 상대 경로 src/href 를
 * 포스트 슬러그 기준 절대 경로로 변환한다. trailing slash 는 제거(전역
 * trailingSlash: 'never' 정책).
 *
 *   src/content/posts/2026-04-20.digital-sickness/index.mdx
 *     <img src="images/foo.png">   →   <img src="/digital-sickness/images/foo.png">
 *
 * 주의: 포스트는 전부 MDX 라 저작자가 직접 쓴 raw HTML 은 JSX(mdxJsxElement)로
 * 파싱되어 `html` 노드가 아니므로 이 플러그인의 대상이 아니다. 실질적으로 이 플러그인은
 * [resolve-missing-images] 가 누락 이미지를 치환해 만든 `<img>` `html` 노드의 상대 src 를
 * 슬러그 절대 경로로 고치는 역할을 한다(그래서 그 플러그인보다 뒤에 등록).
 */
export default function resolvePostRelativeUrls() {
  const ABSOLUTE_OR_SCHEMED = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i;
  const URL_ATTR = /(\s(?:src|href)=)["']([^"']+)["']/g;

  return (tree, file) => {
    const filePath = (file.path ?? '').replace(/\\/g, '/');
    const match = filePath.match(/\/posts\/\d{4}-\d{2}-\d{2}\.([^/]+)\/index\.mdx?$/);

    if (!match) return;

    const slug = match[1];

    function walk(node) {
      if (node.type === 'html' && typeof node.value === 'string') {
        node.value = node.value.replace(URL_ATTR, (full, attr, url) => {
          if (ABSOLUTE_OR_SCHEMED.test(url)) return full;
          const [pathPart, ...rest] = url.split(/(?=[?#])/);
          const trimmed = pathPart.replace(/\/+$/, '');
          return `${attr}"/${slug}/${trimmed}${rest.join('')}"`;
        });
      }

      if (Array.isArray(node.children)) {
        for (const child of node.children) walk(child);
      }
    }

    walk(tree);
  };
}
