// 드롭다운 열림/닫힘 + 선택 전환. 기본 닫힘, 트리거로 토글, 선택·바깥클릭·Esc 로 닫힘.
// 초기 선택 상태는 SSR 이 확정 → 클릭/키보드로 선택만 갱신.
// hide 변형: 선택 항목을 hidden 처리(목록에서 사라짐).
// mark 변형: 선택 항목에 is-selected 부여(강조 표시).
function bind(dd) {
  if (dd.dataset.bound) return; // ClientRouter 재실행 대비 중복 바인딩 방지
  dd.dataset.bound = '1';

  const variant = dd.dataset.variant;
  const trigger = dd.querySelector('.dd-trigger');
  const valueEl = dd.querySelector('.dd-value');
  const options = [...dd.querySelectorAll('.dd-option')];

  const visibleOptions = () => options.filter((o) => !o.hidden);

  function open() {
    dd.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    visibleOptions()[0]?.focus();
  }
  function close(focusTrigger) {
    dd.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    if (focusTrigger) trigger.focus();
  }

  function apply(value) {
    dd.dataset.value = value;
    const label = dd.querySelector(`.dd-option[data-value="${value}"] .dd-label`);
    if (valueEl && label) valueEl.textContent = label.textContent;

    for (const opt of options) {
      const selected = opt.dataset.value === value;
      if (variant === 'hide') {
        opt.hidden = selected;
      } else {
        opt.classList.toggle('is-selected', selected);
        opt.setAttribute('aria-selected', selected ? 'true' : 'false');
      }
    }
  }

  trigger.addEventListener('click', () => {
    dd.classList.contains('is-open') ? close(true) : open();
  });
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    } else if (e.key === 'Escape') {
      close(false);
    }
  });

  for (const opt of options) {
    opt.addEventListener('click', () => {
      apply(opt.dataset.value);
      close(true);
    });
    opt.addEventListener('keydown', (e) => {
      const vis = visibleOptions();
      const i = vis.indexOf(opt);
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        apply(opt.dataset.value);
        close(true);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        (vis[i + 1] || vis[0]).focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        (vis[i - 1] || vis[vis.length - 1]).focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
      }
    });
  }
}

function init() {
  for (const dd of document.querySelectorAll('.dd-demo .dd')) bind(dd);

  // 바깥 클릭 시 열린 드롭다운 닫기 — document 리스너는 1회만 등록.
  if (!document.__ddOutsideBound) {
    document.__ddOutsideBound = true;
    document.addEventListener('click', (e) => {
      for (const dd of document.querySelectorAll('.dd-demo .dd.is-open')) {
        if (!dd.contains(e.target)) {
          dd.classList.remove('is-open');
          dd.querySelector('.dd-trigger')?.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }
}

// ClientRouter(운영)는 astro:page-load 로 매 네비게이션 재실행, dev 는 1회.
if (import.meta.env.PROD) {
  document.addEventListener('astro:page-load', init);
} else if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
