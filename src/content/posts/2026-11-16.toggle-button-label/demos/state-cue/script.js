// 2상태 버튼 전환 + 상태 표시 옵션.
// 아이콘·영상·상태 표시 노출은 CSS 가 data-on 으로 결정 → 여기선 data-on·이름만 갱신.
// 이름 = 누르면 일어날 일(미래 동작 방식, aria-pressed 미사용).
const LABELS = {
  play: { false: '재생하기', true: '일시정지하기' },
  mic: { false: '음소거 해제하기', true: '음소거하기' },
};

function bind(demo) {
  if (demo.dataset.bound) return; // ClientRouter 재실행 대비 중복 바인딩 방지
  demo.dataset.bound = '1';

  for (const col of demo.querySelectorAll('.sc-col')) {
    const button = col.querySelector('.sc-btn');
    button.addEventListener('click', () => {
      const on = String(col.dataset.on !== 'true');
      col.dataset.on = on;
      button.setAttribute('aria-label', LABELS[col.dataset.kind][on]);
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
  for (const demo of document.querySelectorAll('.sc-demo')) bind(demo);
}

// ClientRouter(운영)는 astro:page-load 로 매 네비게이션 재실행, dev 는 1회.
if (import.meta.env.PROD) {
  document.addEventListener('astro:page-load', init);
} else if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
