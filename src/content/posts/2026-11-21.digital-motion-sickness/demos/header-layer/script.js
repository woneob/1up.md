// 3D 레이어 & 윈도우 마스크(오프스크린) 데모 동작
// - 구멍(화면) 안쪽 드래그: 모바일 스와이프 + 관성(requestAnimationFrame 감속) 스크롤
// - 구멍 바깥(무대·유리 마스크) 드래그: 3D 시점(rotateX / rotateY) 자유 회전
const THRESHOLD = 16;
const DEFAULT_RX = 12;
const DEFAULT_RY = -20;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

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
}

function init() {
  for (const demo of document.querySelectorAll('[data-layer-demo]')) {
    if (demo.dataset.bound) continue;
    demo.dataset.bound = 'true';

    const stage = demo.querySelector('[data-stage]');
    const scene = demo.querySelector('[data-scene]');
    const proxy = demo.querySelector('[data-scroll-proxy]');
    const spacer = demo.querySelector('[data-scroll-spacer]');
    const track = demo.querySelector('[data-body-track]');
    const headerBadge = demo.querySelector('[data-badge="header"]');
    const bodyBadge = demo.querySelector('[data-badge="body"]');
    const viewRadios = [...demo.querySelectorAll('[data-view-option]')];

    let rx = 0;
    let ry = 0;
    let entered = false;
    let last = 0;
    let anchor = 0;
    let direction = 0;

    const syncSpacer = () => {
      spacer.style.blockSize = `${track.scrollHeight}px`;
      scene.style.setProperty('--scroll', `${proxy.scrollTop}px`);
    };
    syncSpacer();
    setupSwipeScroll(proxy);

    const applyAngles = (nextRx, nextRy) => {
      rx = clamp(nextRx, -45, 45);
      ry = clamp(nextRy, -65, 65);
      scene.style.setProperty('--rx', `${rx.toFixed(1)}deg`);
      scene.style.setProperty('--ry', `${ry.toFixed(1)}deg`);
    };

    const switchTo3d = () => {
      demo.dataset.view = '3d';
      const radio3d = viewRadios.find((r) => r.value === '3d');
      if (radio3d) radio3d.checked = true;
      applyAngles(DEFAULT_RX, DEFAULT_RY);
    };

    const setHidden = (hidden) => {
      demo.toggleAttribute('data-hidden', hidden);
    };

    proxy.addEventListener('scroll', () => {
      const y = proxy.scrollTop;
      scene.style.setProperty('--scroll', `${y}px`);

      const delta = y - last;
      if (delta === 0) return;

      const sign = Math.sign(delta);
      if (sign !== direction) {
        direction = sign;
        anchor = last;
      }
      last = y;

      if (y <= 0) setHidden(false);
      else if (direction > 0 && y - anchor > THRESHOLD) setHidden(true);
      else if (direction < 0 && anchor - y > THRESHOLD) setHidden(false);
    }, { passive: true });

    // 구멍 바깥(무대·유리 마스크) 드래그로 3D 회전 (구멍 안쪽은 스와이프 스크롤 전용)
    let dragId = null;
    let startX = 0;
    let startY = 0;
    let startRx = 0;
    let startRy = 0;

    stage.addEventListener('selectstart', (event) => event.preventDefault());
    stage.addEventListener('dragstart', (event) => event.preventDefault());

    stage.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || proxy.contains(event.target)) return;

      entered = true;
      dragId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startRx = rx;
      startRy = ry;
      demo.setAttribute('data-dragging', '');
      stage.setPointerCapture(dragId);

      if (demo.dataset.view === '2d') {
        demo.dataset.view = '3d';
        const radio3d = viewRadios.find((r) => r.value === '3d');
        if (radio3d) radio3d.checked = true;
      }
    });

    stage.addEventListener('pointermove', (event) => {
      if (event.pointerId !== dragId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      applyAngles(startRx - dy * 0.35, startRy + dx * 0.45);
    });

    const endDrag = (event) => {
      if (event.pointerId !== dragId) return;
      dragId = null;
      demo.removeAttribute('data-dragging');
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    for (const option of demo.querySelectorAll('[data-mode-option]')) {
      option.addEventListener('change', () => {
        const push = option.value === 'push';
        demo.dataset.mode = option.value;
        headerBadge.textContent = push ? '헤더 (본문과 같은 층)' : '헤더 층 (분리됨)';
        bodyBadge.textContent = push ? '본문 (헤더를 따라 이동)' : '본문 층 (고정)';
        syncSpacer();
      });
    }

    for (const option of viewRadios) {
      option.addEventListener('click', () => {
        entered = true;
        demo.dataset.view = option.value;
        if (option.value === '3d') applyAngles(DEFAULT_RX, DEFAULT_RY);
        else applyAngles(0, 0);
      });
    }

    // 처음에는 정면(2d)으로 있다가 화면(뷰포트) 안으로 들어오면 3D 측면으로 회전
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entered) continue;
        entered = true;
        io.disconnect();
        setTimeout(() => {
          if (demo.dataset.view === '2d') switchTo3d();
        }, 220);
      }
    }, { threshold: 0.45 });
    io.observe(stage);
  }
}

document.addEventListener('astro:page-load', init);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
