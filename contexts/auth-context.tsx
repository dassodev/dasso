'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Provider } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithFacebook: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  updateProfile: (profile: { username?: string; avatar_url?: string; full_name?: string }) => Promise<void>
  isEmailVerified: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEmailVerified, setIsEmailVerified] = useState(false)

  useEffect(() => {
    const checkAndHandleSession = async () => {
      // Check active sessions and sets the user
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setIsEmailVerified(session?.user?.email_confirmed_at != null)
      setLoading(false)

      // Check if there's a stored session expiry
      const storedExpiry = localStorage.getItem('sessionExpiry')
      if (storedExpiry && session) {
        const expiryTime = parseInt(storedExpiry)
        const now = new Date().getTime()
        
        if (now >= expiryTime) {
          // Session has expired, sign out
          await supabase.auth.signOut()
          localStorage.removeItem('sessionExpiry')
        } else {
          // Set up timeout for remaining time
          const timeUntilExpiry = expiryTime - now
          setTimeout(async () => {
            await supabase.auth.signOut()
            localStorage.removeItem('sessionExpiry')
          }, timeUntilExpiry)
        }
      }
    }

    checkAndHandleSession()

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsEmailVerified(session?.user?.email_confirmed_at != null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string, rememberMe: boolean) => {
    // Sign in with password
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({ 
      email, 
      password
    })
    if (signInError) throw signInError

    // If remember me is false, we'll sign out after 1 hour
    if (!rememberMe && session) {
      const expiryTime = new Date().getTime() + (60 * 60 * 1000) // 1 hour from now
      localStorage.setItem('sessionExpiry', expiryTime.toString())
      
      // Set up a timeout to sign out when the session should expire
      const timeUntilExpiry = expiryTime - new Date().getTime()
      setTimeout(async () => {
        await supabase.auth.signOut()
      }, timeUntilExpiry)
    } else {
      // If remember me is true, remove any existing expiry
      localStorage.removeItem('sessionExpiry')
    }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth`,
        data: {
          email: email,
        }
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signInWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (error) throw error
  }

  const updateProfile = async (profile: { username?: string; avatar_url?: string; full_name?: string }) => {
    const { error } = await supabase.auth.updateUser({
      data: profile,
    })
    if (error) throw error
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithFacebook,
    resetPassword,
    updatePassword,
    updateProfile,
    isEmailVerified,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 