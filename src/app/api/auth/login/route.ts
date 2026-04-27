import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { username, password, mode } = await req.json()

    if (!username || !password)
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })

    const identifier = username.trim()
    const isEmailMode = mode === 'email'
    const field = isEmailMode ? 'email' : 'username'

    console.log(`[login] mode=${mode} field=${field} value=${identifier}`)

    // Fetch user by username OR email — separate from password check
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('name, username, password, role, approved, office_name, office_address, license_no, post_name, email')
      .eq(field, identifier)
      .maybeSingle()

    console.log('[login] user found:', user ? `yes (@${user.username})` : 'no')
    if (fetchError) console.error('[login] db error:', fetchError.message)

    if (fetchError)
      return NextResponse.json({ error: 'เกิดข้อผิดพลาดฐานข้อมูล: ' + fetchError.message }, { status: 500 })

    if (!user)
      return NextResponse.json({ error: isEmailMode ? 'ไม่พบอีเมลนี้ในระบบ' : 'ไม่พบชื่อผู้ใช้นี้ในระบบ' }, { status: 401 })

    // Compare password
    if (user.password !== password) {
      console.log('[login] password mismatch')
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 })
    }

    // Return user data without password
    const { password: _pw, ...safeUser } = user
    console.log('[login] success:', safeUser.username)
    return NextResponse.json(safeUser)

  } catch (e) {
    console.error('[login] unexpected error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
