import React from 'react'
import './globals.css'

export const metadata = {
  title: 'NaijaOpportunities – Jobs & Scholarships for Nigerians',
  description: 'Find the latest jobs and scholarships for Nigerians. Updated daily.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">

        {/* NAVBAR */}
       <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
  <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
    <a href="/" className="text-base font-bold text-green-700 flex-shrink-0">
      🇳🇬 <span className="hidden sm:inline">Naija</span>Opportunities
    </a>
    <div className="flex items-center gap-2">
      <a href="/jobs" className="text-xs font-medium text-gray-600 hover:text-green-700">Jobs</a>
      <a href="/scholarships" className="text-xs font-medium text-gray-600 hover:text-green-700">Scholarships</a>
      <a href="https://pathsync-ai.vercel.app" target="_blank"
        className="bg-green-700 text-white px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap">
        PathSync AI ✨
      </a>
    </div>
  </div>
</nav>

        {/* PAGE CONTENT */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>

        {/* FOOTER */}
        <footer className="border-t border-gray-200 bg-white mt-16">
          <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © 2026 NaijaOpportunities. Updated daily.
            </p>
            <a href="https://pathsync-ai.vercel.app" target="_blank"
              className="text-sm bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-full hover:bg-green-100 transition-colors">
              🤖 Let PathSync AI match you to the perfect scholarship
            </a>
          </div>
        </footer>

      </body>
    </html>
  )
}
