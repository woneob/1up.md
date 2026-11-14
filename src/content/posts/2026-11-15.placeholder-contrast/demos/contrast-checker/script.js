import { luminance, toRgb, toHex, contrast } from '../colors.js';

const parseHex = (value) => {
  const text = value.trim().replace(/^#/, '');
  if (!/^([\da-f]{3}|[\da-f]{6})$/i.test(text)) return null;
  return toHex(toRgb(text));
};

const floorRatio = (a, b) => Math.floor(contrast(luminance(toRgb(a)), luminance(toRgb(b))) * 100) / 100;

const toHsl = ([r, g, b]) => {
  const [R, G, B] = [r, g, b].map((v) => v / 255);
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l];
};
const fromHsl = ([h, s, l]) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
};

// 색상(H)·채도(S)는 유지하고 명도(L)만 어두운/밝은 쪽으로 움직여, 기준을 처음 넘는 색 중 변화가 작은 쪽을 제안
function suggestColor(fg, bg, min) {
  const [h, s, l] = toHsl(toRgb(fg));
  let best = null;
  for (const dir of [-1, 1]) {
    for (let step = 1; step <= 1000; step++) {
      const nl = l + (dir * step) / 1000;
      if (nl < 0 || nl > 1) break;
      const hex = toHex(fromHsl([h, s, nl]));
      if (floorRatio(hex, bg) >= min) {
        if (!best || step < best.step) best = { hex, step };
        break;
      }
    }
  }
  return best?.hex ?? null;
}

function init() {
  for (const demo of document.querySelectorAll('[data-contrast-checker]')) {
    if (demo.dataset.bound) continue;
    demo.dataset.bound = 'true';
    const keys = ['foreground', 'background'];
    const pickers = Object.fromEntries(keys.map((k) => [k, demo.querySelector(`[data-picker="${k}"]`)]));
    const texts = Object.fromEntries(keys.map((k) => [k, demo.querySelector(`[data-text="${k}"]`)]));
    const ratioOut = demo.querySelector('[data-out="ratio"]');
    const state = {};
    const radios = [...demo.querySelectorAll('[data-option]')];
    const needOut = demo.querySelector('[data-out="need"]');
    const result = demo.querySelector('.result');
    const badge = demo.querySelector('[data-out="badge"]');
    const table = JSON.parse(result.dataset.minTable);
    const preview = demo.querySelector('[data-preview]');
    const suggest = demo.querySelector('[data-suggest]');
    const applyBtn = demo.querySelector('[data-apply]');
    const colors = Object.fromEntries(keys.map((k) => [k, parseHex(texts[k].value)]));

    // 선택된 라디오 → state, 선택지 설명 갱신
    function readOptions() {
      for (const radio of radios) {
        if (!radio.checked) continue;
        state[radio.dataset.option] = radio.value;
        demo.querySelector(`[data-desc-of="${radio.dataset.option}"]`).textContent = radio.dataset.desc;
      }
    }

    function render() {
      readOptions();
      const value = contrast(luminance(toRgb(colors.foreground)), luminance(toRgb(colors.background)));
      const ratio = Math.floor(value * 100) / 100;
      const min = table[state.level][state.size];
      const pass = ratio >= min;
      preview.style.setProperty('--fg', colors.foreground);
      preview.style.setProperty('--bg', colors.background);
      preview.dataset.size = state.size;
      ratioOut.value = `${ratio.toFixed(2)}:1`;
      result.dataset.pass = String(pass);
      badge.value = pass ? '통과' : '실패';
      const suggestion = pass ? null : suggestColor(colors.foreground, colors.background, min);
      suggest.hidden = !suggestion;
      if (suggestion) {
        suggest.style.setProperty('--suggest', suggestion);
        applyBtn.dataset.color = suggestion;
        suggest.querySelector('[data-out="suggest-hex"]').textContent = suggestion;
        suggest.querySelector('[data-out="suggest-ratio"]').textContent = `${floorRatio(suggestion, colors.background).toFixed(2)}:1`;
      }
      needOut.textContent = `${state.level} 기준 ${min}:1 이상`;
    }

    function setColor(key, hex) {
      colors[key] = hex;
      pickers[key].value = hex.toLowerCase();
      texts[key].value = hex;
      texts[key].removeAttribute('aria-invalid');
      render();
    }

    for (const key of keys) {
      pickers[key].addEventListener('input', () => setColor(key, parseHex(pickers[key].value)));
      texts[key].addEventListener('input', () => {
        const hex = parseHex(texts[key].value);
        if (!hex) return texts[key].setAttribute('aria-invalid', 'true');
        colors[key] = hex;
        pickers[key].value = hex.toLowerCase();
        texts[key].removeAttribute('aria-invalid');
        render();
      });
      texts[key].addEventListener('blur', () => setColor(key, colors[key]));
    }
    for (const radio of radios) radio.addEventListener('change', render);
    // contenteditable 은 maxlength 가 없어 입력 후 길이를 잘라 제한
    for (const el of demo.querySelectorAll('[data-max]')) {
      const max = Number(el.dataset.max);
      const clamp = () => {
        if (el.textContent.length <= max) return;
        el.textContent = el.textContent.slice(0, max);
        getSelection().selectAllChildren(el);
        getSelection().collapseToEnd();
      };
      el.addEventListener('beforeinput', (event) => {
        if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') event.preventDefault();
      });
      el.addEventListener('input', (event) => { if (!event.isComposing) clamp(); });
      el.addEventListener('compositionend', clamp);
    }
    // 클립보드 복사: 성공 시 아이콘을 체크로 바꿨다가 1.5초 뒤 복원
    for (const button of demo.querySelectorAll('[data-copy]')) {
      let timer;
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(colors[button.dataset.copy]);
        } catch {
          return;
        }
        button.dataset.copied = '';
        button.title = '복사됨';
        clearTimeout(timer);
        timer = setTimeout(() => {
          delete button.dataset.copied;
          button.title = '복사';
        }, 1500);
      });
    }
    applyBtn.addEventListener('click', () => setColor('foreground', applyBtn.dataset.color));
    render();
  }
}
document.addEventListener('astro:page-load', init);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
