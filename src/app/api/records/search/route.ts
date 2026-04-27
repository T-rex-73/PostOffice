import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function mapRecord(r: any) {
  const addressParts = [
    r.address      || '',
    r.sub_district ? `ต.${r.sub_district}` : '',
    r.district     || '',
    r.province     ? `จ.${r.province}`     : '',
    r.zip          || '',
  ].filter(Boolean)
  const fullAddress = addressParts.join(' ')

  return {
    rowId:                 r.id,
    '__ชื่อผู้รับ':        r.recipient    || '',
    '__ถึง':               r.department   || '',
    '__ที่อยู่สำนักงาน':   fullAddress,
    '__ที่':               r.address      || '',
    '__ตำบล':              r.sub_district || '',
    '__อำเภอ':             r.district     || '',
    '__จังหวัด':           r.province     || '',
    '__รหัสไปรษณีย์':     r.zip          || '',
    '__เจ้าของเรื่อง':     r.owner        || '',
    '__เลขที่หนังสือ':     r.book_no      || '',
    '__จำนวน':             String(r.quantity || 1),
    '__ประเภท':            r.type         || '',
    '__เลขแท็กER':         r.tracking_er  || '',
    '__เลขแท็กTH':         r.tracking_th  || '',
    '__วันที่':            (r.recorded_at || '').split(',')[0].trim(),
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q          = (searchParams.get('q') || '').trim()
    const username   = searchParams.get('username')   || ''
    const role       = searchParams.get('role')       || 'user'
    const officeName = searchParams.get('officeName') || ''

    if (!q) return NextResponse.json([])

    let query = supabaseAdmin
      .from('records')
      .select('*')
      .or(`book_no.ilike.%${q}%,tracking_er.ilike.%${q}%,recipient.ilike.%${q}%,owner.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (role === 'global_admin') {
      // global_admin: เห็นทั้งหมด ไม่กรองอะไร
    } else if (role === 'admin') {
      // admin: เห็นเฉพาะ user ในสำนักงานเดียวกัน
      const { data: sameOfficeUsers, error: err } = await supabaseAdmin
        .from('users')
        .select('username')
        .eq('office_name', officeName)
      if (err) throw err
      const usernames = (sameOfficeUsers || []).map((u: any) => u.username)
      if (usernames.length > 0) {
        query = query.in('owner_username', usernames)
      } else {
        query = query.eq('owner_username', '__NO_MATCH__')
      }
    } else {
      // user: เห็นเฉพาะของตัวเอง
      query = query.eq('owner_username', username)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json((data || []).map(mapRecord))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
