-- 포스트 슬러그별 누적 조회수
CREATE TABLE IF NOT EXISTS views (
  slug  TEXT    PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
