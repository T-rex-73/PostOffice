import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// POST /api/auth/google/exchange
//
// Server-side fallback called by auth/callback/page.tsx after the client-side
// PKCE exchange succeeds. The client now passes { email, name } from the
// Supabase session — we just match against our custom `users` table.
//
// NOTE: Supabase's /auth/v1/token PKCE endpoint ALWAYS requires the original
// code_verifier — using a service-role key does NOT bypass this. So we no
// longer attempt a raw token exchange here. The client handles the OAuth
// exchange with exchangeCodeForSession(), then calls this endpoint with the
// resolved email to look up the custom users table.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'missing email' }, { status: 400 })
    }

    console.log('[exchange] looking up email:', email)

    const { data: existing } = await supabaseAdmin
      .from('users')
      .select(
        'name, username, role, approved, office_name, office_address, license_no, post_name'
      )
      .eq('email', email)
      .maybeSingle()

    console.log('[exchange] existing user:', existing?.username || 'none')

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

    const googleName = name || email.split('@')[0]
    return NextResponse.json({ found: false, email, name: googleName })
  } catch (e) {
    console.error('[exchange] unexpected error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
