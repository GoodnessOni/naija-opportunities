'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleGoogleSignIn = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 border rounded-2xl p-8 w-full max-w-md shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">
          Naija<span className="text-green-600">Opportunities</span>
        </h1>

        <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          <button onClick={() => setMode('signin')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'signin' ? 'bg-white dark:bg-gray-800 text-green-600 shadow' : ''}`}>
            Sign In
          </button>
          <button onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'signup' ? 'bg-white dark:bg-gray-800 text-green-600 shadow' : ''}`}>
            Sign Up
          </button>
        </div>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 border rounded-xl py-3 mb-4 hover:bg-gray-50 dark:hover:bg-gray-700">
          <svg width="20" height="20" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          {loading ? 'Loading...' : 'Continue with Google'}
        </button>

        <div className="relative text-center text-xs my-4">
          <span className="bg-white dark:bg-gray-800 px-2">or</span>
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200 -z-10" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border rounded-xl" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border rounded-xl" />
          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold">
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
      </div>
    </div>
  )
}
