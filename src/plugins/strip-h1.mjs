/**
 * 마크다운 본문의 H1(`# 제목`)을 모두 제거한다.
 *
 * 페이지 제목의 단일 출처는 frontmatter `title` 이며, 본문 H1 은 raw 마크다운을
 * 뷰어(예: GitHub)로 볼 때의 가독성을 위한 장식일 뿐 사이트에서는 의미가 없다.
 * frontmatter `title` 과 내용이 달라도, H1 이 복수여도 상관없이 전부 제거한다.
 *
 * remark(mdast) 단계에서 제거하므로 Astro 의 heading 수집(rehype)보다 앞서며,
 * 따라서 본문에서 사라질 뿐 아니라 getHeadings() / 목차(PostToc)에도 잡히지 않는다.
 */
export default function stripH1() {
  return (tree) => {
    function walk(node) {
      if (!Array.isArray(node.children)) return;

      node.children = node.children.filter(
        (child) => !(child.type === 'heading' && child.depth === 1)
      );

      for (const child of node.children) walk(child);
    }

    walk(tree);
  };
}
