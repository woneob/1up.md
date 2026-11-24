// YAML 블록 스칼라 줄바꿈을 공백으로 정규화.
export const oneLine = (str) => String(str ?? '').replace(/\s*\n\s*/g, ' ').trim();
