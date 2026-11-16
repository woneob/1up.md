// 보기 방식 전환 + 가리기 옵션.
// 단일 버튼(next·current)은 카드형 → 리스트형 → 갤러리형 순환, 세그먼트는 직접 선택.
const VIEWS = ['card', 'list', 'gallery'];
const LABELS = { card: '카드형', list: '리스트형', gallery: '갤러리형' };

const nextOf = (view) => VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length];

function bind(demo) {
  if (demo.dataset.bound) return; // ClientRouter 재실행 대비 중복 바인딩 방지
  demo.dataset.bound = '1';

  for (const col of demo.querySelectorAll('.vl-col')) {
    const { mode } = col.dataset;
    const preview = col.querySelector('.vl-preview');

    if (mode === 'segment') {
      const segs = col.querySelectorAll('.vl-seg');
      for (const seg of segs) {
        seg.addEventListener('click', () => {
          for (const s of segs) s.setAttribute('aria-pressed', String(s === seg));
          preview.dataset.view = seg.dataset.view;
        });
      }
      continue;
    }

    const button = col.querySelector('.vl-btn');
    button.addEventListener('click', () => {
      const view = nextOf(preview.dataset.view);
      preview.dataset.view = view;
      button.textContent = LABELS[mode === 'next' ? nextOf(view) : view];
    });
  }

  // 뒤로가기 시 브라우저가 체크 상태를 복원할 수 있어 초기 1회 동기화
  for (const input of demo.querySelectorAll('[data-option]')) {
    const sync = () => demo.classList.toggle(`is-${input.dataset.option}`, input.checked);
    input.addEventListener('change', sync);
    sync();
  }
}

function init() {
  for (const demo of document.querySelectorAll('.vl-demo')) bind(demo);
}

// ClientRouter(운영)는 astro:page-load 로 매 네비게이션 재실행, dev 는 1회.
if (import.meta.env.PROD) {
  document.addEventListener('astro:page-load', init);
} else if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
