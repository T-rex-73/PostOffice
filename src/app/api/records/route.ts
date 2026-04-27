import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { nowTimestamp } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from       = searchParams.get('from')
    const to         = searchParams.get('to')
    const owner      = searchParams.get('owner')
    const username   = searchParams.get('username')   || ''
    const role       = searchParams.get('role')       || 'user'
    const officeName = searchParams.get('officeName') || ''

    let query = supabaseAdmin
      .from('records')
      .select('*')
      .order('created_at', { ascending: false })

    if (role === 'global_admin') {
      // global_admin: เห็นข้อมูลทั้งหมดทุกสำนักงาน ไม่กรองอะไร
    } else if (role === 'admin') {
      // admin: เห็นเฉพาะข้อมูลของ user ในสำนักงานเดียวกัน (กรองด้วย office_name)
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

    if (owner) query = query.ilike('owner', `%${owner}%`)

    const { data, error } = await query
    if (error) throw error

    let result = data || []

    if (from || to) {
      const parseDate = (s: string) => {
        const [d, m, y] = s.split('/')
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
      }
      const fromDate = from ? parseDate(from) : null
      const toDate   = to   ? parseDate(to)   : null
      result = result.filter((r: any) => {
        if (!r.recorded_at) return false
        const d = parseDate(r.recorded_at.split(',')[0].trim())
        if (fromDate && d < fromDate) return false
        if (toDate) {
          const toEnd = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59)
          if (d > toEnd) return false
        }
        return true
      })
    }

    return NextResponse.json(result.map(mapRecord))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.bulk && Array.isArray(body.rows)) {
      const username = body.username || ''
      const rows = body.rows.map((fd: any) => buildRow(fd, username))
      const { error } = await supabaseAdmin.from('records').insert(rows)
      if (error) throw error
      return NextResponse.json({ success: true, count: rows.length })
    }

    const { data, error } = await supabaseAdmin
      .from('records')
      .insert(buildRow(body, body.username || ''))
      .select('id')
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, id: data?.id })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

function buildRow(formData: any, ownerUsername: string) {
  const bookNo = formData.BookFullNo ||
    (formData.BookVol ? `0020.${formData.BookVol}/${formData.BookNo}` : formData.BookNo || '')
  return {
    owner_username: ownerUsername,
    recipient:      formData.Recipient   || '',
    department:     formData.Department  || '',
    address:        formData.Address     || '',
    sub_district:   formData.SubDistrict || '',
    district:       formData.District    || '',
    province:       formData.Province    || '',
    zip:            formData.Zip         || '',
    owner:          formData.Owner       || '',
    book_no:        bookNo,
    quantity:       Number(formData.Quantity) || 1,
    type:           formData.Type        || '',
    tracking_er:    '',
    tracking_th:    '',
    recorded_at:    nowTimestamp(),
  }
}

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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.action === 'edit' && body.id) {
      const { error } = await supabaseAdmin
        .from('records')
        .update({
          recipient:    body.Recipient   || '',
          department:   body.Department  || '',
          address:      body.Address     || '',
          sub_district: body.SubDistrict || '',
          district:     body.District    || '',
          province:     body.Province    || '',
          zip:          body.Zip         || '',
          owner:        body.Owner       || '',
          book_no:      body.BookNo      || '',
          quantity:     Number(body.Quantity) || 1,
          type:         body.Type        || '',
        })
        .eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { ids, username, role, officeName } = body

    if (!Array.isArray(ids) || ids.length === 0)
      return NextResponse.json({ error: 'ไม่มีรายการที่ต้องการลบ' }, { status: 400 })

    let query = supabaseAdmin.from('records').delete().in('id', ids)

    // Security: users can only delete their own records; admins limited to their office
    if (role === 'global_admin') {
      // no extra filter — can delete any
    } else if (role === 'admin') {
      const { data: officeUsers } = await supabaseAdmin
        .from('users').select('username').eq('office_name', officeName)
      const usernames = (officeUsers || []).map((u: any) => u.username)
      query = query.in('owner_username', usernames)
    } else {
      query = query.eq('owner_username', username)
    }

    const { error } = await query
    if (error) throw error
    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
