export interface Record {
  id: number
  owner_username: string
  recipient: string
  department: string
  address: string
  sub_district: string
  district: string
  province: string
  zip: string
  owner: string
  book_no: string
  quantity: number
  type: string
  tracking_er: string
  tracking_th: string
  recorded_at: string
  pdf_url: string
  created_at: string
}

// Role hierarchy:
//   global_admin → เห็นข้อมูลทั้งหมดทุกสำนักงาน + จัดการ user ทุกคน
//   admin        → เห็นข้อมูลเฉพาะสำนักงานตัวเอง (กรองด้วย office_name) + จัดการ user ในสำนักงานตัวเอง
//   user         → เห็นเฉพาะข้อมูลของตัวเอง (กรองด้วย owner_username)
export type UserRole = 'global_admin' | 'admin' | 'user'

// Duration type for access limits (set by global_admin only)
// 'day'       → expires after 1 day from access_start
// 'month'     → expires after 1 month from access_start
// 'year'      → expires after 1 year from access_start
// 'unlimited' → never expires (default)
export type AccessDuration = 'day' | 'month' | 'year' | 'unlimited'

export interface User {
  id: number
  name: string
  username: string
  password?: string
  role: UserRole
  approved: boolean
  office_name: string
  office_address: string
  office_zip: string
  license_no: string
  post_name: string
  line_uid?: string
  created_at: string
  // ── Access limit fields (managed by global_admin only) ────────────────────
  access_duration?: AccessDuration   // duration type
  access_start?: string              // ISO date when the limit period started
  access_until?: string              // computed expiry ISO date; null = unlimited
}

export interface Location {
  id: number
  sub_district: string
  district: string
  province: string
  zip_code: string
}

export interface SessionUser {
  name: string
  username: string
  role: UserRole
  approved: boolean
  office_name: string
  office_address: string
  office_zip: string
  license_no: string
  post_name: string
  // ── Access limit fields ────────────────────────────────────────────────────
  access_duration?: AccessDuration
  access_start?: string
  access_until?: string
}
