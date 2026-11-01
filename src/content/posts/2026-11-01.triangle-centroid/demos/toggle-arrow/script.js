// 토글 펼침/접힘 + 보기 옵션(가이드·느리게·크게) 전환.
// 초기 상태(접힘)는 SSR 이 확정 → 클릭 시 aria-expanded·라벨·패널만 갱신.
const LABELS = { true: '접기', false: '펼쳐보기' };

function bind(demo) {
  if (demo.dataset.bound) return; // ClientRouter 재실행 대비 중복 바인딩 방지
  demo.dataset.bound = '1';

  for (const button of demo.querySelectorAll('.tg')) {
    const label = button.querySelector('.tg-label');
    const panel = document.getElementById(button.getAttribute('aria-controls'));

    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      label.textContent = LABELS[expanded];
      if (panel) panel.hidden = !expanded;
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
  for (const demo of document.querySelectorAll('.tg-demo')) bind(demo);
}

// ClientRouter(운영)는 astro:page-load 로 매 네비게이션 재실행, dev 는 1회.
if (import.meta.env.PROD) {
  document.addEventListener('astro:page-load', init);
} else if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
