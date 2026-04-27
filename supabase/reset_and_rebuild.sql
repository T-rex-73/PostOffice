-- ==========================================
-- สำหรับ DB ที่มีข้อมูลอยู่แล้ว (ไม่ต้อง DROP)
-- แค่ปรับ role ของ admin เดิม และเพิ่ม column ที่ขาด
-- ==========================================

-- 1. เพิ่ม column office_zip ถ้ายังไม่มี
ALTER TABLE users ADD COLUMN IF NOT EXISTS office_zip TEXT DEFAULT '';

-- 2. เพิ่ม constraint ตรวจ role (optional — ถ้าต้องการ strict)
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('global_admin', 'admin', 'user'));

-- 3. อัปเดต admin เดิมให้เป็น global_admin
UPDATE users
SET role        = 'global_admin',
    office_name = '',
    approved    = true
WHERE username = 'admin';

-- 4. อัปเดต user เก่าที่ role = 'office admin' → 'admin'
UPDATE users SET role = 'admin' WHERE role = 'office admin';

-- 5. อัปเดต user เก่าที่ role = 'global admin' → 'global_admin'
UPDATE users SET role = 'global_admin' WHERE role = 'global admin';

-- 6. เพิ่ม index office_name ถ้ายังไม่มี
CREATE INDEX IF NOT EXISTS idx_users_office_name ON users(office_name);

-- ตรวจสอบผล
SELECT username, role, approved, office_name FROM users ORDER BY role, username;
