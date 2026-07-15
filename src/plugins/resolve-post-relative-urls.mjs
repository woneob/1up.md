/**
 * 포스트 본문 raw HTML(`html` 노드)의 상대 src/href → 슬러그 절대 경로 (trailing slash 제거).
 *
 *   posts/2026-04-20.digital-sickness/index.mdx
 *     <img src="images/foo.png">  →  <img src="/digital-sickness/images/foo.png">
 *
 * MDX 저작 raw HTML 은 JSX(mdxJsxElement)로 파싱돼 `html` 노드가 아니라 대상 아님.
 * 실질은 [resolve-missing-images] 가 만든 `<img>` `html` 노드 src 를 고침 (그 뒤에 등록).
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
