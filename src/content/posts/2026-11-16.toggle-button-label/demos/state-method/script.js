// 토글 전환. 표시(채움·아이콘·글자)는 CSS 가 속성으로 결정 → 여기선 속성만 갱신.
// - aria-pressed 보유 버튼: 현재 상태 방식(이름 고정)
// - data-muted 보유 버튼: 미래 동작 방식(글자가 이름, aria-pressed 미사용)
function bind(demo) {
  if (demo.dataset.bound) return; // ClientRouter 재실행 대비 중복 바인딩 방지
  demo.dataset.bound = '1';

  for (const button of demo.querySelectorAll('[data-toggle]')) {
    button.addEventListener('click', () => {
      if (button.hasAttribute('aria-pressed')) {
        button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
      } else {
        button.dataset.muted = String(button.dataset.muted !== 'true');
      }
    });
  }
}

function init() {
  for (const demo of document.querySelectorAll('.sm-demo')) bind(demo);
}

// ClientRouter(운영)는 astro:page-load 로 매 네비게이션 재실행, dev 는 1회.
if (import.meta.env.PROD) {
  document.addEventListener('astro:page-load', init);
} else if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
