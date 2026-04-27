# ระบบบริหารจัดการงานไปรษณีย์ — Next.js + Supabase Edition

แปลงจาก Google Apps Script มาเป็น Next.js + Supabase เพื่อ deploy บน Vercel

---

## Stack

| ส่วน | เดิม (GAS) | ใหม่ |
|------|-----------|------|
| Database | Google Sheets | **Supabase (PostgreSQL)** |
| Template | Google Slides | **HTML/CSS + Browser Print** |
| Backend | GAS functions | **Next.js API Routes** |
| Hosting | GAS Web App | **Vercel** |
| Auth | Sheet row | **Custom table in Supabase** |

---

## การติดตั้ง

### 1. Clone และ install

```bash
git clone https://github.com/YOUR_USERNAME/postal-app.git
cd postal-app
npm install
```

### 2. ตั้งค่า Supabase

1. ไปที่ [supabase.com](https://supabase.com) → New Project
2. ไปที่ **SQL Editor** → New Query
3. Copy ทั้งหมดจาก `supabase/schema.sql` แล้ว Run
4. ไปที่ **Settings → API** แล้วก็อป:
   - `Project URL`
   - `anon public` key
   - `service_role` key (secret — ห้าม expose ใน frontend)

### 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` ที่ root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 4. Import ข้อมูลรหัสไปรษณีย์

ใน Supabase → Table Editor → `locations` → Import CSV
หรือใช้ SQL:
```sql
INSERT INTO locations (sub_district, district, province, zip_code)
VALUES ('พระปฐมเจดีย์', 'เมือง', 'นครปฐม', '73000');
-- ... ต่อด้วยข้อมูลทั้งหมด
```

### 5. รัน dev

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

**Login เริ่มต้น:** `admin` / `admin1234` (เปลี่ยนทันทีหลัง deploy!)

---

## Deploy บน Vercel

### วิธีที่ 1: Vercel CLI
```bash
npm i -g vercel
vercel
```

### วิธีที่ 2: GitHub + Vercel Dashboard
1. Push โค้ดขึ้น GitHub
2. ไปที่ [vercel.com](https://vercel.com) → New Project → Import จาก GitHub
3. ตั้งค่า Environment Variables ใน Vercel Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

---

## โครงสร้างโปรเจกต์

```
postal-app/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← หน้าหลัก (แปลงจาก index.html)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── print/
│   │   │   └── page.tsx          ← หน้าพิมพ์ซองจดหมาย
│   │   └── api/
│   │       ├── auth/login/       ← แทน loginUser()
│   │       ├── auth/register/    ← แทน registerUser()
│   │       ├── records/          ← แทน getRecords(), saveRecord()
│   │       ├── records/tracking/ ← แทน updateTrackingNumbers()
│   │       ├── records/search/   ← แทน searchRecord()
│   │       ├── users/            ← แทน getUsers(), approveUser()...
│   │       ├── locations/        ← แทน getLocationData()
│   │       └── delivery/         ← แทน saveDeliveryNote()
│   ├── components/
│   │   └── envelope/
│   │       └── EnvelopeTemplate.tsx  ← แทน Google Slides template
│   └── lib/
│       ├── supabase.ts           ← Supabase client
│       ├── api.ts                ← แทน google.script.run.*
│       ├── utils.ts              ← แทน GAS helpers
│       └── types.ts
├── supabase/
│   └── schema.sql                ← รัน SQL นี้ใน Supabase ก่อน
├── .env.example
├── .gitignore                    ← ไม่ commit .env.local!
└── README.md
```

---

## การเพิ่ม Template ซองจดหมาย

Template ซองตอนนี้เป็น HTML/CSS ใน `src/components/envelope/EnvelopeTemplate.tsx`

แก้ข้อมูลผู้ส่งได้ที่ component นั้นเลย:
```tsx
// ผู้ส่ง — แก้ที่นี่
<div style={{ fontWeight: 700 }}>สำนักงานที่ดินจังหวัด___</div>
<div>ที่อยู่...</div>
```

สำหรับ **ใบตอบรับ AR** สร้าง component แยกเพิ่มได้ใน `src/components/envelope/`

---

## Security Notes

- ⚠️ รหัสผ่านตอนนี้เก็บ plain text — แนะนำ install `bcryptjs` และ hash ก่อน production
- ⚠️ เปลี่ยนรหัส admin ทันทีหลัง deploy ครั้งแรก
- ✅ `SUPABASE_SERVICE_ROLE_KEY` ใช้เฉพาะ server-side (API Routes) เท่านั้น
- ✅ `.env.local` อยู่ใน `.gitignore` แล้ว
