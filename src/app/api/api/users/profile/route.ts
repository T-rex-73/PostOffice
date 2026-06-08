import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const username = new URL(req.url).searchParams.get('username') || ''
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('role, office_name, office_address, office_zip, license_no, post_name')
      .eq('username', username)
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
