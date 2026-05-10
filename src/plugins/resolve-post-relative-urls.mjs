/**
 * 마크다운의 raw HTML(`<iframe>`, `<img>` 등)에서 상대 경로 src/href를
 * 포스트 슬러그 기준 절대 경로로 변환한다.
 *
 *   src/content/posts/2026-04-20.digital-sickness/index.md
 *     <iframe src="demos/motion-mismatch/" />
 *   →
 *     <iframe src="/digital-sickness/demos/motion-mismatch/" />
 *
 * 폴더명을 바꿔도 슬러그가 자동으로 따라가므로 본문 수정이 불필요하다.
 */
export default function resolvePostRelativeUrls() {
  const ABSOLUTE_OR_SCHEMED = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i;
  const URL_ATTR = /(\s(?:src|href)=)["']([^"']+)["']/g;

  return (tree, file) => {
    const filePath = (file.path ?? '').replace(/\\/g, '/');
    const match = filePath.match(/\/posts\/\d{4}-\d{2}-\d{2}\.([^/]+)\/index\.md$/);

    if (!match) return;

    const slug = match[1];

    function walk(node) {
      if (node.type === 'html' && typeof node.value === 'string') {
        node.value = node.value.replace(URL_ATTR, (full, attr, url) => {
          if (ABSOLUTE_OR_SCHEMED.test(url)) return full;
          return `${attr}"/${slug}/${url}"`;
        });
      }

      if (Array.isArray(node.children)) {
        for (const child of node.children) walk(child);
      }
    }

    walk(tree);
  };
}
