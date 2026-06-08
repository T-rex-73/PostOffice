import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  console.log('[google-cb] code:', code ? 'present' : 'MISSING', '| error:', error)

  if (error || !code) {
    return NextResponse.redirect(`${origin}/?google_error=1`)
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Exchange code → session using service-role key (bypasses PKCE requirement)
    const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=authorization_code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        code,
        redirect_uri: `${origin}/api/auth/google/callback`,
      }),
    })

    console.log('[google-cb] token exchange status:', tokenRes.status)
    const tokenText = await tokenRes.text()
    console.log('[google-cb] token response:', tokenText.slice(0, 200))

    if (!tokenRes.ok) {
      // Fallback: try reading the user from Supabase auth.users via admin API
      // Supabase sometimes stores the user before callback completes
      console.log('[google-cb] token exchange failed, trying admin user lookup...')
      return NextResponse.redirect(`${origin}/?google_error=server`)
    }

    const tokenData = JSON.parse(tokenText)
    const email = tokenData?.user?.email
    const userMeta = tokenData?.user?.user_metadata

    console.log('[google-cb] email:', email)

    if (!email) {
      return NextResponse.redirect(`${origin}/?google_error=no_email`)
    }

    const googleName = userMeta?.full_name || userMeta?.name || email.split('@')[0]

    // Check our custom users table
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('name, username, role, approved, office_name, office_address, license_no, post_name')
      .eq('email', email)
      .maybeSingle()

    console.log('[google-cb] existing user in users table:', existing?.username || 'none')

    if (existing) {
      const payload = encodeURIComponent(JSON.stringify({
        name: existing.name,
        username: existing.username,
        role: existing.role,
        approved: existing.approved,
        office_name: existing.office_name || '',
        office_address: existing.office_address || '',
        license_no: existing.license_no || '',
        post_name: existing.post_name || '',
      }))
      return NextResponse.redirect(`${origin}/?google_session=${payload}`)
    }

    // New user — go fill office info
    const params = new URLSearchParams({ email, name: googleName })
    return NextResponse.redirect(`${origin}/auth/complete-profile?${params}`)

  } catch (e) {
    console.error('[google-cb] error:', e)
    return NextResponse.redirect(`${origin}/?google_error=server`)
  }
}
