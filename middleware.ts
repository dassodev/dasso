import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Allow auth page to load immediately without checks
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  if (isAuthPage) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res: response })

  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isCallback = request.nextUrl.pathname.startsWith('/auth/callback')

  // Skip middleware for callback route
  if (isCallback) {
    return response
  }

  if (!user && request.nextUrl.pathname !== '/') {
    // If user is not signed in and the current path is not / redirect the user to /auth
    const redirectUrl = new URL('/auth', request.url)
    request.nextUrl.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value)
    })
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.webp|.*\\.html).*)'],
}
