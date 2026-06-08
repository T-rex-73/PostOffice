import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildFullTracking } from '@/lib/utils'

// POST /api/delivery — save delivery note records
export async function POST(req: NextRequest) {
  try {
    const records: Record<string, string>[] = await req.json()

    const rows = records.map((r, i) => ({
      seq:       i + 1,
      recipient: r['__ชื่อผู้รับ'] || '',
      province:  r['__จังหวัด']    || '',
      tracking:  buildFullTracking(r['__เลขแท็กER'] || ''),
    }))

    const { error } = await supabaseAdmin.from('delivery_notes').insert(rows)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
