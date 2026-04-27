import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeTrackingER } from '@/lib/utils'

// PATCH /api/records/tracking
export async function PATCH(req: NextRequest) {
  try {
    const updates: { rowId: number; trackingER: string; trackingTH: string }[] = await req.json()

    for (const item of updates) {
      const erVal = normalizeTrackingER(item.trackingER)
      const thVal = String(item.trackingTH || '').replace(/\D/g, '')

      const { error } = await supabaseAdmin
        .from('records')
        .update({ tracking_er: erVal, tracking_th: thVal })
        .eq('id', item.rowId)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
