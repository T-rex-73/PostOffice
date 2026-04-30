import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/chat?room=guest | ?room=<username> (for admin to fetch all rooms)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const room   = searchParams.get('room')
  const isAdmin = searchParams.get('admin') === '1'

  if (isAdmin) {
    // global_admin fetches all rooms (latest message per room)
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  }

  if (!room) return NextResponse.json({ error: 'room required' }, { status: 400 })

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room', room)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST /api/chat  body: { room, sender, sender_role, message }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { room, sender, sender_role, message } = body

    if (!room || !sender || !message?.trim()) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{ room, sender, sender_role: sender_role || 'guest', message: message.trim() }])
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
