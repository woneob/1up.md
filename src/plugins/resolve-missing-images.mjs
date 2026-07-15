/**
 * 존재하지 않는 이미지(`![](path)`)를 빌드 오류 대신 깨진 이미지로 처리.
 *
 * Astro 는 md 이미지를 빌드 시 import 로 변환해 최적화하는데, 파일이 없으면 rolldown
 * resolve 실패로 빌드 전체가 죽음 (초안에서 아직 안 넣은 이미지 참조 시 흔함).
 *
 * - 파일 없는 상대 `image` 노드를 raw HTML `<img>` 로 치환 (존재 이미지는 무수정 → 정상 최적화)
 * - remarkCollectImages(이미지→import) 보다 먼저 돌아 치환 노드는 import 대상에서 빠짐
 * - 치환된 상대 src 는 [resolve-post-relative-urls] 가 절대 경로로 변환 → 그 앞에 등록
 */
import fs from 'node:fs';
import path from 'node:path';

const ABSOLUTE_OR_SCHEMED = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i;

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function resolveMissingImages() {
  return (tree, file) => {
    const filePath = (file.path ?? '').replace(/\\/g, '/');
    if (!/\/posts\/\d{4}-\d{2}-\d{2}\.[^/]+\/index\.mdx?$/.test(filePath)) return;

    const baseDir = path.dirname(file.path);

    function walk(node) {
      if (!Array.isArray(node.children)) return;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        if (
          child.type === 'image' &&
          typeof child.url === 'string' &&
          !ABSOLUTE_OR_SCHEMED.test(child.url)
        ) {
          const relPath = decodeURIComponent(child.url.split(/[?#]/)[0]);
          const absPath = path.resolve(baseDir, relPath);

          if (!fs.existsSync(absPath)) {
            console.warn(
              `[resolve-missing-images] 이미지 파일 없음: "${child.url}" (${filePath}) — 깨진 이미지로 처리`
            );
            const alt = escapeHtml(child.alt ?? '');
            const title = child.title ? ` title="${escapeHtml(child.title)}"` : '';
            node.children[i] = {
              type: 'html',
              value: `<img src="${child.url}" alt="${alt}"${title}>`,
            };
            continue;
          }
        }

        walk(child);
      }
    }

    walk(tree);
  };
}
