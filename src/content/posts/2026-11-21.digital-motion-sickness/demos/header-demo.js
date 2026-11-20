// 자동 숨김 헤더 데모 동작
// - 스크롤 방향 전환 지점부터 임계값 이상 이동 시 헤더 상태 전환
// - push 모드: 헤더 높이 전환 중 발생하는 스크롤 보정은 방향 판정에서 제외
// - 레이아웃 읽기(위치 측정)·DOM 쓰기(동기화·수치 표시)는 프레임당 1회로 묶음(모바일 버벅임 완화)
const THRESHOLD = 16;
const SETTLE_MS = 260; // 헤더 전환(0.2s) + 여유

// 데스크톱(마우스)에서도 모바일처럼 화면을 잡고 위아래로 끌어 관성(requestAnimationFrame 감속)으로 스크롤
function setupSwipeScroll(scroller) {
  let pointerId = null;
  let startY = 0;
  let startScroll = 0;
  let lastY = 0;
  let lastTime = 0;
  let velocity = 0; // px/ms
  let inertiaFrame = 0;

  const stopInertia = () => {
    if (inertiaFrame) {
      cancelAnimationFrame(inertiaFrame);
      inertiaFrame = 0;
    }
    velocity = 0;
  };

  scroller.addEventListener('wheel', stopInertia, { passive: true });
  scroller.addEventListener('touchstart', stopInertia, { passive: true });
  scroller.addEventListener('selectstart', (event) => event.preventDefault());
  scroller.addEventListener('dragstart', (event) => event.preventDefault());

  scroller.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    stopInertia();
    pointerId = event.pointerId;
    startY = event.clientY;
    lastY = startY;
    startScroll = scroller.scrollTop;
    lastTime = performance.now();
    scroller.setAttribute('data-swiping', '');
    scroller.setPointerCapture(pointerId);
  });

  scroller.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    const now = performance.now();
    const dt = now - lastTime;
    const dy = event.clientY - lastY;
    scroller.scrollTop = startScroll - (event.clientY - startY);
    if (dt > 0) {
      const instV = -dy / dt;
      velocity = velocity * 0.35 + instV * 0.65;
      lastY = event.clientY;
      lastTime = now;
    }
  });

  const endSwipe = (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    scroller.removeAttribute('data-swiping');

    // 손을 떼기 직전 멈춰 있었다면 관성 생략
    if (performance.now() - lastTime > 80 || Math.abs(velocity) < 0.08) {
      velocity = 0;
      return;
    }

    let pos = scroller.scrollTop;
    let prevTime = performance.now();
    const coast = (now) => {
      const dt = Math.min(now - prevTime, 48);
      prevTime = now;
      pos += velocity * dt;
      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
      scroller.scrollTop = pos;
      velocity *= Math.pow(0.94, dt / 16.67);

      if (Math.abs(velocity) < 0.03 || pos <= 0 || pos >= maxScroll) {
        inertiaFrame = 0;
        velocity = 0;
        return;
      }
      inertiaFrame = requestAnimationFrame(coast);
    };
    inertiaFrame = requestAnimationFrame(coast);
  };

  scroller.addEventListener('pointerup', endSwipe);
  scroller.addEventListener('pointercancel', endSwipe);

  return stopInertia;
}

function setupPhone(phone, { onInput, onMeasure }) {
  const scroller = phone.querySelector('[data-scroller]');
  const content = phone.querySelector('[data-content]');
  const push = phone.dataset.mode === 'push';

  let last = scroller.scrollTop;
  let anchor = last; // 방향이 마지막으로 바뀐 위치
  let direction = 0;
  let settleUntil = 0;
  let frame = 0;

  const offset = () => content.getBoundingClientRect().top - phone.getBoundingClientRect().top;
  let contentTop = offset();

  // 본문의 화면상 위치 변화량 누적
  const measure = () => {
    const top = offset();
    onMeasure(phone, 0, Math.abs(top - contentTop));
    contentTop = top;
  };

  // 프레임당 1회 측정, 헤더 전환 중이면 끝날 때까지 매 프레임 계속
  const tick = () => {
    measure();
    frame = performance.now() < settleUntil ? requestAnimationFrame(tick) : 0;
  };
  const scheduleMeasure = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const setHidden = (hidden) => {
    if (phone.hasAttribute('data-hidden') === hidden) return;
    phone.toggleAttribute('data-hidden', hidden);
    settleUntil = performance.now() + SETTLE_MS;
    scheduleMeasure();
  };

  scroller.addEventListener('scroll', () => {
    const y = scroller.scrollTop;
    const delta = y - last;
    if (delta === 0) return;

    const settling = push && performance.now() < settleUntil;
    onMeasure(phone, Math.abs(delta), 0);
    scheduleMeasure();
    onInput(phone, y);

    const sign = Math.sign(delta);
    if (sign !== direction) {
      direction = sign;
      anchor = last;
    }
    last = y;
    if (settling) {
      anchor = y;
      return;
    }

    if (y <= 0) setHidden(false);
    else if (direction > 0 && y - anchor > THRESHOLD) setHidden(true);
    else if (direction < 0 && anchor - y > THRESHOLD) setHidden(false);
  }, { passive: true });

  const stopSwipe = setupSwipeScroll(scroller);

  return {
    scroller,
    stopSwipe,
    reset() {
      stopSwipe();
      // 전환 없이 즉시 초기 상태로 되돌린 뒤 기준 위치 재측정
      phone.setAttribute('data-instant', '');
      scroller.scrollTop = 0;
      phone.removeAttribute('data-hidden');
      last = 0;
      anchor = 0;
      direction = 0;
      settleUntil = 0;
      contentTop = offset();
      phone.removeAttribute('data-instant');
    },
  };
}

// 창 크기로 확대
// - 브라우저 전체 화면(Fullscreen API) 아님, data-expanded 고정 레이어로 창에 맞춤
// - 확대 중 바깥 페이지 스크롤 잠금, Esc 로 닫기
// - 펼치거나 닫을 때 스크롤 위치·헤더 상태를 처음으로(측정값은 유지)
let expanded = null;
const resets = new WeakMap(); // phone → reset()

function setExpanded(phone, on) {
  const button = phone.querySelector('[data-expand]');
  const label = on ? '원래 크기로 보기' : '크게 보기';
  button.setAttribute('aria-label', label);
  button.title = label;
  phone.toggleAttribute('data-expanded', on);
  // 헤더 높이가 바뀐 뒤 본문 위치를 다시 재야 측정값에 섞이지 않음
  resets.get(phone)?.();
  // 페이지 스크롤 잠금 + 전역 scrollbar-gutter: stable 이 남기는 우측 빈 띠 제거
  document.documentElement.style.overflow = on ? 'hidden' : '';
  document.documentElement.style.scrollbarGutter = on ? 'auto' : '';
  expanded = on ? phone : null;
}

// 뒤로 가기로 닫기: 펼칠 때 엔트리 1개 push, 닫을 때 back
// - 착지할 엔트리의 state 를 null 로 비워야 ClientRouter onPopState 가 즉시 return(같은 URL 재네비게이션 방지)
// - ImageLightbox 와 같은 방식
let savedState = null;
let pushed = false;
let popping = false;

function pushHistoryEntry() {
  if (pushed) return;
  savedState = history.state;
  history.replaceState(null, '');
  history.pushState(savedState, '', location.href);
  pushed = true;
}

function restoreHistoryState() {
  if (savedState !== null && history.state === null) history.replaceState(savedState, '');
  savedState = null;
}

function popHistoryEntry() {
  if (!pushed) return;
  pushed = false;
  popping = true;
  history.back();
}

function close({ fromPopState = false } = {}) {
  const phone = expanded;
  if (!phone) return;
  setExpanded(phone, false);
  if (!fromPopState) popHistoryEntry();
}

function toggleExpanded(phone) {
  if (expanded === phone) {
    close();
    return;
  }
  setExpanded(phone, true);
  pushHistoryEntry();
}

addEventListener('popstate', () => {
  if (popping) {
    popping = false;
    restoreHistoryState();
    return;
  }
  if (!pushed) return;
  pushed = false;
  restoreHistoryState();
  close({ fromPopState: true });
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && expanded) close();
});
document.addEventListener('astro:before-swap', () => {
  if (expanded) setExpanded(expanded, false);
  pushed = false;
  savedState = null;
});

function init() {
  for (const demo of document.querySelectorAll('[data-header-demo]')) {
    if (demo.dataset.bound) continue;
    demo.dataset.bound = 'true';

    const sync = demo.hasAttribute('data-sync');
    const totals = new Map(); // phone → { scrolled, moved }
    let active = null; // 사용자가 직접 조작 중인 화면

    const render = (phone) => {
      const unit = phone.closest('.unit');
      const out = (key) => unit.querySelector(`[data-out="${key}"]`);
      if (!out('scrolled')) return;
      const { scrolled, moved } = totals.get(phone);
      const diff = Math.round(moved) - Math.round(scrolled);
      out('scrolled').textContent = `${Math.round(scrolled)}px`;
      out('moved').textContent = `${Math.round(moved)}px`;
      out('diff').textContent = `${diff > 0 ? '+' : ''}${diff}px`;
      out('diff').closest('[data-diff]').dataset.diff = Math.abs(diff) <= 1 ? '0' : String(diff);
    };

    // 수치 표시: 프레임당 1회
    const dirty = new Set();
    let renderFrame = 0;
    const scheduleRender = (phone) => {
      dirty.add(phone);
      renderFrame ||= requestAnimationFrame(() => {
        renderFrame = 0;
        for (const target of dirty) render(target);
        dirty.clear();
      });
    };

    // 동기화: 직접 조작 중인 화면의 마지막 위치만 프레임당 1회 반영
    let syncY = 0;
    let syncSource = null;
    let syncFrame = 0;
    const applySync = () => {
      syncFrame = 0;
      for (const other of phones) {
        if (other.phone !== syncSource && other.scroller.scrollTop !== syncY) other.scroller.scrollTop = syncY;
      }
    };

    const phones = [...demo.querySelectorAll('[data-phone]')].map((phone) => {
      totals.set(phone, { scrolled: 0, moved: 0 });
      const api = setupPhone(phone, {
        onMeasure(target, scrolled, moved) {
          const total = totals.get(target);
          total.scrolled += scrolled;
          total.moved += moved;
          scheduleRender(target);
        },
        onInput(source, y) {
          if (!sync || source !== active) return;
          syncY = y;
          syncSource = source;
          syncFrame ||= requestAnimationFrame(applySync);
        },
      });
      resets.set(phone, api.reset);
      phone.querySelector('[data-expand]').addEventListener('click', () => toggleExpanded(phone));
      for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown', 'focusin']) {
        api.scroller.addEventListener(type, () => {
          if (active && active !== phone) {
            for (const other of phones) {
              if (other.phone !== phone) other.stopSwipe();
            }
          }
          active = phone;
        }, { passive: true });
      }
      return { phone, ...api };
    });

    // 화면별 이동 거리 표시
    for (const toggle of demo.querySelectorAll('[data-meter-toggle]')) {
      toggle.addEventListener('change', () => {
        toggle.closest('[data-phone]').toggleAttribute('data-meter-on', toggle.checked);
      });
    }

    demo.querySelector('[data-reset]')?.addEventListener('click', () => {
      for (const { phone, reset } of phones) {
        reset();
        totals.set(phone, { scrolled: 0, moved: 0 });
        render(phone);
      }
    });
  }
}

document.addEventListener('astro:page-load', init);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
