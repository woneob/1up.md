-- 포스트 슬러그별 누적 좋아요 수
CREATE TABLE IF NOT EXISTS likes (
  slug  TEXT    PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
