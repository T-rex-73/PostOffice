import { NextRequest, NextResponse } from 'next/server'

// NOTE: This route is kept for backwards compatibility but Google OAuth
// should now be initiated CLIENT-SIDE via the Supabase JS SDK (signInWithOAuth).
// Client-side initiation ensures the PKCE code_verifier is stored in localStorage.
// See: AuthPage → handleGoogleLogin in app/page.tsx
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  // Redirect to home — the Google button there will handle OAuth properly
  return NextResponse.redirect(`${origin}/`)
}
