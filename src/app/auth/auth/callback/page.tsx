'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function AuthCallback() {
  const [status, setStatus] = useState('กำลังเข้าสู่ระบบด้วย Google...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

        // FIX: Must use plain createClient() with NO custom storageKey.
        // handleGoogleLogin in page.tsx calls signInWithOAuth() using a plain
        // createClient() — it stores the PKCE code_verifier under the DEFAULT
        // localStorage key. If we use a different storageKey here,
        // exchangeCodeForSession() cannot find the verifier and always fails.
        const supabase = createClient(supabaseUrl, supabaseAnonKey)

        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const error = urlParams.get('error')

        if (error || !code) {
          console.error('[auth-callback] OAuth error or missing code:', error)
          window.location.href = '/?google_error=1'
          return
        }

        setStatus('กำลังยืนยันตัวตน...')

        // exchangeCodeForSession reads code_verifier from localStorage (PKCE).
        // Now succeeds because storageKey matches the one used by signInWithOAuth().
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        )

        if (exchangeError || !data?.session?.user) {
          console.error('[auth-callback] PKCE exchange failed:', exchangeError?.message)
          window.location.href = '/?google_error=server'
          return
        }

        // PKCE exchange succeeded — get user info from Supabase session
        const email = data.session.user.email
        const userMeta = data.session.user.user_metadata
        const googleName = userMeta?.full_name || userMeta?.name || email?.split('@')[0] || ''

        if (!email) {
          window.location.href = '/?google_error=no_email'
          return
        }

        setStatus('ตรวจสอบบัญชี...')

        // Look up our custom users table (separate from Supabase Auth)
        // The custom table stores username, role, approved, office info, etc.
        const res = await fetch('/api/auth/google/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: googleName }),
        })
        const result = await res.json()

        if (result.found) {
          const payload = encodeURIComponent(JSON.stringify(result.user))
          window.location.href = `/?google_session=${payload}`
        } else {
          // New Google user — redirect to fill in office info
          const params = new URLSearchParams({ email, name: googleName })
          window.location.href = `/auth/complete-profile?${params}`
        }
      } catch (e) {
        console.error('[auth-callback] unexpected error:', e)
        window.location.href = '/?google_error=server'
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-bold">{status}</p>
      </div>
    </div>
  )
}
