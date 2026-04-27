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
}
