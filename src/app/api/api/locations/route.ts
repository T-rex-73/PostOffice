import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// normalize district: เพิ่ม prefix ถ้าขาด
function normalizeDistrict(district: string, province: string): string {
  const d = district.trim()
  if (d.startsWith('อำเภอ') || d.startsWith('เขต')) return d
  if (province.includes('กรุงเทพ')) return 'เขต' + d
  return 'อำเภอ' + d
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  try {
    if (type === 'land_offices') {
      const q = searchParams.get('q') || ''
      let query = supabaseAdmin
        .from('land_offices')
        .select('office_name, address, sub_district, district, province, zip')
        .order('office_name')
        .limit(20)

      if (q) query = query.ilike('office_name', `%${q}%`)

      const { data, error } = await query
      if (error) throw error

      const normalized = (data || []).map((r: any) => ({
        office_name:  r.office_name?.trim() || '',
        address:      r.address?.trim()      || '',
        sub_district: r.sub_district?.trim() || '',
        district:     normalizeDistrict(r.district || '', r.province || ''),
        province:     r.province?.trim()     || '',
        zip:          String(r.zip || '').trim(),
      }))
      return NextResponse.json(normalized)
    }

    // default: locations table — ดึงทีละ 1000 rows จนครบ (Supabase default limit = 1000)
    let allData: any[] = []
    let from = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabaseAdmin
        .from('locations')
        .select('sub_district, district, province, zip_code')
        .order('province')
        .range(from, from + pageSize - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      allData = allData.concat(data)
      if (data.length < pageSize) break
      from += pageSize
    }

    return NextResponse.json(
      allData.map((r: any) => ({
        subDistrict: r.sub_district?.trim(),
        district:    r.district?.trim(),
        province:    r.province?.trim(),
        zipCode:     r.zip_code,
      }))
    )
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
