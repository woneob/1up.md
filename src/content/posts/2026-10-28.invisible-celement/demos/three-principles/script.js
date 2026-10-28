// Three Principles Demo: 인터랙션 처리 (클릭 피드백, CTA 토스트 알림)
function bind(demo) {
  if (demo.dataset.bound) return;
  demo.dataset.bound = '1';

  const disabledBtn = demo.querySelector('.tp-btn--disabled');
  const tooltip = demo.querySelector('.tp-tooltip');
  const ctaBtn = demo.querySelector('.tp-cta-btn');
  const toast = demo.querySelector('.tp-toast');

  // CTA 버튼 클릭 시 데모 토스트 표시
  if (ctaBtn && toast) {
    let timer = null;
    ctaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toast.hidden = false;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        toast.hidden = true;
      }, 2400);
    });
  }

  // 모바일 터치 대응: 비활성 버튼 탭 시 툴팁 토글 (Explain / Guide)
  if (disabledBtn && tooltip) {
    disabledBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // 모바일 환경에서 툴팁 표시 유지/토글
      tooltip.style.display = tooltip.style.display === 'none' ? 'block' : '';
    });
  }
}

function init() {
  for (const demo of document.querySelectorAll('.tp-demo')) {
    bind(demo);
  }
}

if (import.meta.env.PROD) {
  document.addEventListener('astro:page-load', init);
} else if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}

