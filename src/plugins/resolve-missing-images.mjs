/**
 * 존재하지 않는 파일을 가리키는 마크다운 이미지(`![](path)`)를 빌드 오류 대신
 * "깨진 이미지"로 처리한다.
 *
 * Astro 는 마크다운 이미지 문법을 빌드 시 import 로 변환해 최적화(Picture/avif)하는데,
 * 대상 파일이 없으면 rolldown 이 import resolve 에 실패해 빌드 전체가 죽는다
 * (`Rolldown failed to resolve import "images/foo.png"`). 초안 집필 중 아직 넣지 않은
 * 이미지를 참조하는 경우가 흔하므로, 그때 빌드가 멈추지 않도록 한다.
 *
 * 동작: 상대 경로 `image` 노드의 파일이 실제로 없으면 mdast `image` 노드를 raw HTML
 * `<img>` 노드로 치환한다. 이 플러그인은 `@astrojs/markdown-remark` 파이프라인에서
 * Astro 의 `remarkCollectImages`(이미지 → import 수집) 보다 **먼저** 도는 사용자 remark
 * 플러그인이므로, 치환된 노드는 이미지 수집 대상에서 빠져 import 가 생성되지 않는다.
 * 실제로 존재하는 이미지는 건드리지 않아 정상적으로 최적화된다.
 *
 * 치환된 `<img>` 의 상대 src 는 뒤이어 도는 [resolve-post-relative-urls] 가
 * 포스트 슬러그 기준 절대 경로로 변환하므로, 반드시 그 플러그인보다 앞에 등록해야 한다.
 * 결과적으로 프리뷰엔 깨진 이미지가 그대로 노출돼 작성자가 누락을 바로 알아챌 수 있다.
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
    if (!/\/posts\/\d{4}-\d{2}-\d{2}\.[^/]+\/index\.md$/.test(filePath)) return;

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
              `[resolve-missing-images] 이미지 파일 없음: "${child.url}" (${filePath}) — 빌드 오류 대신 깨진 이미지로 처리`
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
