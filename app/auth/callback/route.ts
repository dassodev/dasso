import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/auth'
    const type = requestUrl.searchParams.get('type')
    const hash = requestUrl.hash || request.headers.get('x-url-hash') || ''

    console.log('Callback URL:', request.url)
    console.log('Code:', code)
    console.log('Type:', type)
    console.log('Next:', next)
    console.log('Hash:', hash)

    // Try to get access token from the hash
    let accessToken = null
    if (hash) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
      accessToken = hashParams.get('access_token')
      console.log('Access token from hash:', !!accessToken)
    }

    const supabase = createRouteHandlerClient({ cookies })

    if (accessToken) {
      // Set the session using the access token
      const { data: { session }, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '',
      })

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw sessionError
      }

      if (!session?.user) {
        console.log('No user in session')
        throw new Error('No user in session')
      }

      console.log('User found:', session.user.email)
      console.log('Email verified:', session.user.email_confirmed_at)

      // Sign out to prevent auto-login
      await supabase.auth.signOut()

      // Redirect with success message
      const redirectUrl = new URL('/auth', requestUrl.origin)
      redirectUrl.searchParams.set('verified', 'true')
      redirectUrl.searchParams.set('message', 'Your email has been successfully verified! Please log in with your credentials')
      
      console.log('Redirecting to:', redirectUrl.toString())
      return NextResponse.redirect(redirectUrl)
    }

    if (!code) {
      console.log('No code or access token provided')
      throw new Error('No verification credentials provided')
    }

    // Exchange the code for a session
    console.log('Exchanging code for session...')
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error('Exchange error:', exchangeError)
      throw exchangeError
    }

    // Get the user to verify the email confirmation
    console.log('Getting user...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('User error:', userError)
      throw userError
    }

    if (!user) {
      console.log('No user found')
      throw new Error('No user found')
    }

    console.log('User found:', user.email)
    console.log('Email verified:', user.email_confirmed_at)

    // Sign out to prevent auto-login
    console.log('Signing out...')
    await supabase.auth.signOut()
    console.log('Sign out successful')

    // Construct redirect URL with success parameter
    const redirectUrl = new URL('/auth', requestUrl.origin)
    redirectUrl.searchParams.set('verified', 'true')
    redirectUrl.searchParams.set('message', 'Your email has been successfully verified! Please log in with your credentials')
    
    console.log('Redirecting to:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Verification error:', error)
    const redirectUrl = new URL('/auth', request.url)
    redirectUrl.searchParams.set('error', 'verification_failed')
    console.error('Redirecting to error URL:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl)
  }
}
