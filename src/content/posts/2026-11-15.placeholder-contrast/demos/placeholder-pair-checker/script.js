import { MIN, parseHex, ratio, solve } from './logic.js';

const MESSAGES = {
  text: (value) => `입력 글자색과 배경의 명암비 ${value.toFixed(2)}:1 — 두 기준을 함께 만족하려면 ${MIN.background * MIN.text}:1(${MIN.background} × ${MIN.text}) 이상 필요`,
  background: () => '이 배경색에서는 어떤 글자색으로도 두 기준을 함께 만족할 수 없음 — 배경을 더 밝거나 어둡게 조정 필요',
};

function init() {
  for (const demo of document.querySelectorAll('[data-pair-checker]')) {
    if (demo.dataset.bound) continue;
    demo.dataset.bound = 'true';
    const keys = ['background', 'text'];
    const pickers = Object.fromEntries(keys.map((k) => [k, demo.querySelector(`[data-picker="${k}"]`)]));
    const texts = Object.fromEntries(keys.map((k) => [k, demo.querySelector(`[data-text="${k}"]`)]));
    const out = (name) => demo.querySelector(`[data-out="${name}"]`);
    const range = demo.querySelector('[data-range]');
    const notice = demo.querySelector('[data-notice]');
    const pairBox = demo.querySelector('[data-pair]');
    const applyBtn = demo.querySelector('[data-apply]');
    const colors = Object.fromEntries(keys.map((k) => [k, parseHex(texts[k].value)]));

    function render() {
      const result = solve(colors.background, colors.text, demo.querySelector('[name="pc-tone"]:checked').value);
      const ok = result.status === 'ok';
      colors.placeholder = result.placeholder;
      demo.dataset.status = result.status;
      demo.style.setProperty('--bg', colors.background);
      demo.style.setProperty('--fg', colors.text);
      demo.style.setProperty('--ph', result.placeholder);
      out('title').textContent = ok ? '추천 플레이스홀더 색' : '기준에 맞는 플레이스홀더 색 없음';
      out('placeholder').value = result.placeholder;
      out('badge').value = ok ? '통과' : '실패';
      for (const key of keys) {
        const value = ratio(result.placeholder, colors[key]);
        out(`ratio-${key}`).textContent = `${value.toFixed(2)}:1`;
        demo.querySelector(`[data-check="${key}"]`).dataset.pass = String(value >= MIN[key]);
      }

      range.hidden = !result.range;
      result.range?.forEach((hex, i) => {
        out(`range-${i}`).textContent = hex;
        demo.querySelector(`[data-range-chip="${i}"]`).style.setProperty('--c', hex);
      });

      notice.hidden = ok;
      if (!ok) out('message').textContent = MESSAGES[result.status](ratio(colors.background, colors.text));
      pairBox.hidden = !result.pair;
      if (result.pair) {
        applyBtn.dataset.color = result.pair.text;
        for (const key of ['text', 'placeholder']) {
          out(`pair-${key}`).textContent = result.pair[key];
          demo.querySelector(`[data-pair-chip="${key}"]`).style.setProperty('--c', result.pair[key]);
        }
      }
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
    for (const radio of demo.querySelectorAll('[name="pc-tone"]')) radio.addEventListener('change', render);
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
    applyBtn.addEventListener('click', () => setColor('text', applyBtn.dataset.color));
    render();
  }
}
document.addEventListener('astro:page-load', init);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
