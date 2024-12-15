'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Mail, Apple, Facebook } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

// Carousel images configuration
const carouselImages = [
  {
    src: '/images/auth-carousel/slide1.png',
    alt: 'Master Chinese Characters',
    title: '开始学习',
    description: 'Start your learning journey today'
  },
  {
    src: '/images/auth-carousel/slide2.png',
    alt: 'Practice Writing',
    title: '练习写作',
    description: 'Learn proper stroke order'
  },
  {
    src: '/images/auth-carousel/slide3.png',
    alt: 'Track Progress',
    title: '跟踪进度',
    description: 'Monitor your improvement'
  },
]

function AuthContent() {
  // UI state - initialize immediately
  const [currentImage, setCurrentImage] = useState(0)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [rememberMe, setRememberMe] = useState(() => {
    // Initialize rememberMe from localStorage, default to false
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rememberMe') === 'true'
    }
    return false
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signUp, signInWithGoogle, signInWithFacebook, resetPassword, user } = useAuth()

  // Update localStorage when rememberMe changes
  useEffect(() => {
    localStorage.setItem('rememberMe', rememberMe.toString())
  }, [rememberMe])

  // Clear form fields when component unmounts or user logs out
  useEffect(() => {
    return () => {
      setEmail('')
      setPassword('')
    }
  }, [])

  // Clear form when switching between login/signup
  useEffect(() => {
    setEmail('')
    setPassword('')
    setError('')
    setSuccess('')
  }, [isLogin])

  // Start auth check in parallel with UI render
  useEffect(() => {
    if (user) {
      router.push('/')
    }
    setIsAuthChecking(false)
  }, [user, router])

  // Handle URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hash = window.location.hash
    
    console.log('Processing authentication response...')
    
    const verified = params.get('verified')
    const message = params.get('message')
    const verificationError = params.get('error')
    
    if (verified === 'true' && message) {
      console.log('Email verification successful')
      setSuccess(decodeURIComponent(message))
      setIsLogin(true)
      setTimeout(() => setSuccess(''), 5000)
    } else if (verificationError) {
      console.log('Email verification failed')
      setError('Email verification failed. Please try again or contact support.')
      setTimeout(() => setError(''), 5000)
    }

    if (hash && !verified && !verificationError) {
      console.log('Processing authentication callback...')
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      callbackUrl.hash = hash
      window.location.href = callbackUrl.toString()
      return
    }

    if (verified || verificationError || hash) {
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      console.log('Authentication flow completed')
    }
  }, [searchParams])

  useEffect(() => {
    setError('')
    setSuccess('')
  }, [isLogin])

  // Carousel auto-rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % carouselImages.length)
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (isForgotPassword) {
        await resetPassword(email)
        setSuccess('Password reset instructions have been sent to your email')
        return
      }

      if (isLogin) {
        await signIn(email, password, rememberMe)
        router.push('/')
      } else {
        await signUp(email, password)
        setSuccess('Please check your email for a verification link')
        setEmail('')
        setPassword('')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo Placeholder */}
        <div className="flex justify-center">
          <div className="bg-gray-200 rounded-lg p-4 text-xl font-bold text-gray-600">
            DassoShu Logo
          </div>
        </div>

        {/* Image Carousel */}
        <div className="relative bg-transparent rounded-lg aspect-[16/9] overflow-hidden mb-8">
          {carouselImages.map((image, index) => (
            <div
              key={image.src}
              className={cn(
                "absolute inset-0 transition-all duration-500 transform",
                index === currentImage 
                  ? "opacity-100 translate-x-0" 
                  : index < currentImage 
                    ? "opacity-0 -translate-x-full"
                    : "opacity-0 translate-x-full"
              )}
            >
              <div className="relative h-full w-full flex flex-col items-center justify-center">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="h-[70%] w-auto object-contain"
                />
                <div className="mt-4 text-center">
                  <h3 className="text-gray-800 text-2xl font-bold mb-2">{image.title}</h3>
                  <p className="text-gray-600">{image.description}</p>
                </div>
              </div>
            </div>
          ))}
          
          {/* Carousel Navigation Dots */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-3">
            {carouselImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImage(index)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-300 transform",
                  index === currentImage 
                    ? "bg-gray-800 scale-110" 
                    : "bg-gray-400 hover:bg-gray-600"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Auth tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={cn(
              "flex-1 py-2 text-center text-gray-600",
              isLogin && "border-b-2 border-gray-800 font-semibold text-gray-800"
            )}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={cn(
              "flex-1 py-2 text-center text-gray-600",
              !isLogin && "border-b-2 border-gray-800 font-semibold text-gray-800"
            )}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success/Error Messages */}
          {(success || error) && (
            <div className={cn(
              "p-3 rounded-md text-sm font-medium mb-4",
              success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            )}>
              {success || error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white pl-10 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="Enter your email"
                  required
                />
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white pr-10 focus:outline-none focus:ring-1 focus:ring-gray-400"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {isLogin && !isForgotPassword && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-gray-900 focus:ring-gray-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {isForgotPassword && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Back to Login
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            {isForgotPassword ? 'Reset Password' : isLogin ? 'Login' : 'Sign Up'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="flex items-center justify-center py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <span className="sr-only">Sign in with Google</span>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => signInWithFacebook()}
              className="flex items-center justify-center py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <span className="sr-only">Sign in with Facebook</span>
              <Facebook className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="flex items-center justify-center py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <span className="sr-only">Sign in with Apple</span>
              <Apple className="h-5 w-5" />
            </button>
          </div>

          <p className="text-center text-sm text-gray-600">
            <a href="#" className="hover:text-gray-800">Terms of Service</a>
            {' | '}
            <a href="#" className="hover:text-gray-800">Privacy Policy</a>
          </p>
        </form>
      </div>

      {/* Show loading indicator only during auth check */}
      {isAuthChecking && (
        <div className="absolute top-4 right-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
      )}
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthContent />
    </Suspense>
  )
}
