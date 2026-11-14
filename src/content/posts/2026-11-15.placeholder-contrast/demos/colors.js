export const toRgb = (hex) => {
  let value = hex.replace(/^#/, '');
  if (value.length === 3) value = [...value].map((c) => c + c).join('');
  if (!/^[\da-f]{6}$/i.test(value)) throw new Error('유효한 HEX 색상이 아닙니다.');
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
};
export const toHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
export const luminance = (rgb) => rgb.map((v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
export const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
