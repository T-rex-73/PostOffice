import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ── Role helpers ──────────────────────────────────────────────────────────────
// global_admin → จัดการได้ทุกคน ทุกสำนักงาน
// admin        → จัดการได้เฉพาะ user ในสำนักงานตัวเอง
// user         → ไม่มีสิทธิ์จัดการใคร
const canManage = (role: string | null) => role === 'global_admin' || role === 'admin'
const isGlobalAdmin = (role: string | null) => role === 'global_admin'

// ── GET /api/users ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const currentRole   = searchParams.get('role')
    const currentOffice = searchParams.get('officeName') || ''

    if (!canManage(currentRole))
      return NextResponse.json({ error: 'ไม่อนุญาต' }, { status: 403 })

    let query = supabaseAdmin
      .from('users')
      .select('name, username, role, approved, created_at, office_name, access_duration, access_start, access_until, access_month_count')
      .order('office_name', { ascending: true })
      .order('created_at',  { ascending: true })

    if (isGlobalAdmin(currentRole)) {
      // global_admin: เห็นทุก user ทุกสำนักงาน
    } else {
      // admin: เห็นเฉพาะ user ในสำนักงานตัวเอง
      query = query.eq('office_name', currentOffice)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── Permission check: admin ต้องอยู่สำนักงานเดียวกับ target ────────────────
async function checkPermission(
  currentRole: string | null,
  currentOffice: string | null,
  targetUsername: string
): Promise<{ error: string | null }> {
  if (!canManage(currentRole))
    return { error: 'ไม่อนุญาต' }

  if (isGlobalAdmin(currentRole))
    return { error: null } // global_admin ผ่านเสมอ

  // admin: ต้องตรวจว่า target อยู่สำนักงานเดียวกัน
  const { data: target, error } = await supabaseAdmin
    .from('users')
    .select('office_name')
    .eq('username', targetUsername)
    .single()
  if (error || !target)
    return { error: 'ไม่พบผู้ใช้เป้าหมาย' }
  if (target.office_name !== currentOffice)
    return { error: 'ไม่สามารถจัดการผู้ใช้ต่างสำนักงานได้' }
  return { error: null }
}

// ── PATCH /api/users ──────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, username, currentUsername, currentRole, currentOffice, ...rest } = body

    if (!username)
      return NextResponse.json({ error: 'username required' }, { status: 400 })
    if (!canManage(currentRole))
      return NextResponse.json({ error: 'ไม่อนุญาต' }, { status: 403 })

    // ดึงข้อมูล target user
    const { data: target, error: targetError } = await supabaseAdmin
      .from('users')
      .select('role, office_name')
      .eq('username', username)
      .single()
    if (targetError || !target)
      return NextResponse.json({ error: 'ไม่พบผู้ใช้เป้าหมาย' }, { status: 400 })

    // ป้องกันแก้ไข global_admin
    if (target.role === 'global_admin' && ['revoke', 'changeRole', 'delete'].includes(action))
      return NextResponse.json({ error: 'ไม่สามารถเปลี่ยนแปลง global admin ได้' }, { status: 403 })

    // admin ต้องตรวจสิทธิ์ว่า target อยู่สำนักงานเดียวกัน
    const perm = await checkPermission(currentRole, currentOffice, username)
    if (perm.error)
      return NextResponse.json({ error: perm.error }, { status: 403 })

    let update: Record<string, unknown> = {}

    switch (action) {
      case 'approve':
        update = { approved: true }
        break
      case 'revoke':
        update = { approved: false }
        break
      case 'changeRole':
        // admin ไม่สามารถเลื่อนใครเป็น global_admin ได้
        if (!isGlobalAdmin(currentRole) && rest.role === 'global_admin')
          return NextResponse.json({ error: 'ไม่สามารถตั้ง global admin ได้' }, { status: 403 })
        update = { role: rest.role }
        break
      case 'setLimit': {
        // Only global_admin can set access limits
        if (!isGlobalAdmin(currentRole))
          return NextResponse.json({ error: 'เฉพาะ global admin เท่านั้นที่สามารถตั้งค่าระยะเวลาการใช้งานได้' }, { status: 403 })
        const duration = rest.access_duration as string
        const validDurations = ['day', 'month', 'year', 'unlimited']
        if (!validDurations.includes(duration))
          return NextResponse.json({ error: 'ระยะเวลาไม่ถูกต้อง' }, { status: 400 })
        const now = new Date()
        let accessUntil: string | null = null
        // month_count: how many months (only relevant when duration === 'month')
        const monthCount = typeof rest.month_count === 'number' && rest.month_count > 0 ? Math.floor(rest.month_count) : 1
        if (duration === 'day') {
          const d = new Date(now); d.setDate(d.getDate() + 1); accessUntil = d.toISOString()
        } else if (duration === 'month') {
          const d = new Date(now); d.setMonth(d.getMonth() + monthCount); accessUntil = d.toISOString()
        } else if (duration === 'year') {
          const d = new Date(now); d.setFullYear(d.getFullYear() + 1); accessUntil = d.toISOString()
        }
        // 'unlimited' → accessUntil stays null
        update = {
          access_duration: duration,
          access_month_count: duration === 'month' ? monthCount : null,
          access_start: now.toISOString(),
          access_until: accessUntil,
        }
        break
      }
      case 'edit':
        update = { name: rest.name }
        if (rest.password && rest.password.length >= 6) update.password = rest.password
        break
      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(update)
      .eq('username', username)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── DELETE /api/users ─────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const username      = searchParams.get('username')
    const currentRole   = searchParams.get('role')
    const currentOffice = searchParams.get('officeName') || ''

    if (!username)
      return NextResponse.json({ error: 'username required' }, { status: 400 })
    if (!canManage(currentRole))
      return NextResponse.json({ error: 'ไม่อนุญาต' }, { status: 403 })

    // ดึงข้อมูล target
    const { data: target, error: targetError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('username', username)
      .single()
    if (targetError || !target)
      return NextResponse.json({ error: 'ไม่พบผู้ใช้เป้าหมาย' }, { status: 400 })
    if (target.role === 'global_admin')
      return NextResponse.json({ error: 'ไม่สามารถลบ global admin ได้' }, { status: 403 })

    // ตรวจสิทธิ์
    const perm = await checkPermission(currentRole, currentOffice, username)
    if (perm.error)
      return NextResponse.json({ error: perm.error }, { status: 403 })

    const { error } = await supabaseAdmin.from('users').delete().eq('username', username)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
