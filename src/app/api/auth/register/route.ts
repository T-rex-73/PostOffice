import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, username, password, email,
      officeName, officeAddress, officeZip, licenseNo, postName,
      googleEmail, isGoogleUser,
    } = body

    if (isGoogleUser) {
      // ── Google Registration ──
      if (!name || !googleEmail)
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
      if (!officeName || !officeAddress)
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลสำนักงานให้ครบ' }, { status: 400 })

      const { data: existing } = await supabaseAdmin
        .from('users').select('id').eq('email', googleEmail).single()
      if (existing)
        return NextResponse.json({ error: 'อีเมลนี้มีบัญชีอยู่แล้ว' }, { status: 409 })

      // สร้าง username จาก email prefix
      let baseUsername = googleEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '')
      let usernameCandidate = baseUsername
      let suffix = 1
      while (true) {
        const { data: dup } = await supabaseAdmin
          .from('users').select('id').eq('username', usernameCandidate).single()
        if (!dup) break
        usernameCandidate = `${baseUsername}${suffix++}`
      }

      const { error } = await supabaseAdmin.from('users').insert({
        name,
        username:       usernameCandidate,
        password:       '',
        email:          googleEmail,
        role:           'user',
        approved:       false,
        office_name:    officeName    || '',
        office_address: officeAddress || '',
        office_zip:     officeZip     || '',
        license_no:     licenseNo     || '',
        post_name:      postName      || '',
      })
      if (error) throw error
      return NextResponse.json({ success: true, username: usernameCandidate })
    } else {
      // ── Regular Registration ──
      if (!name || !username || !password)
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })

      const { data: existing } = await supabaseAdmin
        .from('users').select('id').eq('username', username).single()
      if (existing)
        return NextResponse.json({ error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' }, { status: 409 })

      if (email) {
        const { data: emailExisting } = await supabaseAdmin
          .from('users').select('id').eq('email', email).single()
        if (emailExisting)
          return NextResponse.json({ error: 'อีเมลนี้มีบัญชีอยู่แล้ว' }, { status: 409 })
      }

      // Step 1: validate only — do not insert yet (office info comes in next step)
      const isStep1 = body.step === 1
      if (isStep1) {
        return NextResponse.json({ success: true, step: 1 })
      }

      const { error } = await supabaseAdmin.from('users').insert({
        name,
        username,
        password,
        email:          email         || '',
        role:           'user',
        approved:       false,
        office_name:    officeName    || '',
        office_address: officeAddress || '',
        office_zip:     officeZip     || '',
        license_no:     licenseNo     || '',
        post_name:      postName      || '',
      })
      if (error) throw error
      return NextResponse.json({ success: true })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
