'use client'

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function UserDropdown() {
  const { user, signOut } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)

  if (!user) {
    return (
      <a
        href="/auth"
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-xs font-semibold"
      >
        Sign In
      </a>
    )
  }

  const initials = user.email?.charAt(0).toUpperCase() || 'U'

  return (
    <div className="relative">
      <div
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center font-bold cursor-pointer hover:ring-2 hover:ring-green-500"
      >
        {initials}
      </div>
      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute top-12 right-0 bg-white dark:bg-gray-800 border rounded-xl shadow-xl min-w-[200px] z-20">
            <div className="px-4 py-3 border-b">
              <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
