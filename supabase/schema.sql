-- ==========================================
-- RESET & REBUILD — รันอันนี้ใน Supabase SQL Editor
-- ลบทุกอย่างแล้วสร้างใหม่สะอาด
-- ==========================================

-- ลบ tables เก่าทั้งหมด
DROP TABLE IF EXISTS delivery_notes CASCADE;
DROP TABLE IF EXISTS records        CASCADE;
DROP TABLE IF EXISTS locations      CASCADE;
DROP TABLE IF EXISTS users          CASCADE;

-- ==========================================
-- สร้างใหม่
-- ==========================================

-- Role hierarchy:
--   global_admin → เห็นและจัดการได้ทุกอย่าง ทุกสำนักงาน
--   admin        → เห็นและจัดการได้เฉพาะในสำนักงานตัวเอง
--   user         → เห็นเฉพาะข้อมูลของตัวเอง

CREATE TABLE users (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  username       TEXT UNIQUE NOT NULL,
  password       TEXT NOT NULL,
  role           TEXT DEFAULT 'user' CHECK (role IN ('global_admin', 'admin', 'user')),
  approved       BOOLEAN DEFAULT FALSE,
  office_name    TEXT DEFAULT '',
  office_address TEXT DEFAULT '',
  office_zip     TEXT DEFAULT '',
  license_no     TEXT DEFAULT '',
  post_name      TEXT DEFAULT '',
  line_uid       TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE records (
  id             BIGSERIAL PRIMARY KEY,
  owner_username TEXT NOT NULL DEFAULT '',
  recipient      TEXT NOT NULL,
  department     TEXT DEFAULT '',
  address        TEXT DEFAULT '',
  sub_district   TEXT DEFAULT '',
  district       TEXT DEFAULT '',
  province       TEXT DEFAULT '',
  zip            TEXT DEFAULT '',
  owner          TEXT DEFAULT '',
  book_no        TEXT DEFAULT '',
  quantity       INTEGER DEFAULT 1,
  type           TEXT DEFAULT '',
  tracking_er    TEXT DEFAULT '',
  tracking_th    TEXT DEFAULT '',
  recorded_at    TEXT DEFAULT '',
  pdf_url        TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE locations (
  id           BIGSERIAL PRIMARY KEY,
  sub_district TEXT,
  district     TEXT,
  province     TEXT,
  zip_code     TEXT
);

CREATE TABLE delivery_notes (
  id         BIGSERIAL PRIMARY KEY,
  seq        INTEGER,
  recipient  TEXT,
  province   TEXT,
  tracking   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Global Admin default (ไม่มี office_name — ดูได้ทุกสำนักงาน)
-- ==========================================
INSERT INTO users (name, username, password, role, approved, office_name, office_address, license_no, post_name)
VALUES (
  'ผู้ดูแลระบบ',
  'admin',
  'admin1234',
  'global_admin',
  true,
  '',
  '',
  '',
  ''
);

-- ==========================================
-- ปิด RLS
-- ==========================================
ALTER TABLE users          DISABLE ROW LEVEL SECURITY;
ALTER TABLE records        DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations      DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- Index
-- ==========================================
CREATE INDEX idx_records_owner_username ON records(owner_username);
CREATE INDEX idx_records_tracking_er    ON records(tracking_er);
CREATE INDEX idx_records_owner          ON records(owner);
CREATE INDEX idx_records_created_at     ON records(created_at DESC);
CREATE INDEX idx_users_office_name      ON users(office_name);
CREATE INDEX idx_locations_zip          ON locations(zip_code);

-- ==========================================
-- ตรวจสอบ — ต้องเห็น admin เป็น global_admin
-- ==========================================
SELECT username, role, approved, office_name FROM users;
