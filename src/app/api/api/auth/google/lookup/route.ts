import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()

    if (!email) return NextResponse.json({ found: false }, { status: 400 })

    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('name, username, role, approved, office_name, office_address, license_no, post_name')
      .eq('email', email)
      .maybeSingle()

    console.log('[lookup] email:', email, '| found:', existing?.username || 'no')

    if (existing) {
      return NextResponse.json({
        found: true,
        user: {
          name: existing.name,
          username: existing.username,
          role: existing.role,
          approved: existing.approved,
          office_name: existing.office_name || '',
          office_address: existing.office_address || '',
          license_no: existing.license_no || '',
          post_name: existing.post_name || '',
        },
      })
    }

    return NextResponse.json({ found: false })
  } catch (e) {
    console.error('[lookup] error:', e)
    return NextResponse.json({ found: false, error: String(e) }, { status: 500 })
  }
}
