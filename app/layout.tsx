import React from 'react'
import './globals.css'

export const metadata = {
  title: {
    default: 'NaijaOpportunities — Jobs & Scholarships for Nigerians',
    template: '%s | NaijaOpportunities',
  },
  description: 'Find the latest jobs and scholarships for Nigerian students and job seekers. Updated daily. Free forever.',
  keywords: ['Nigeria scholarships', 'Nigerian jobs', 'scholarships for Nigerians', 'Nigerian student opportunities', 'PTDF scholarship', 'MTN scholarship'],
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://naija-opportunities.vercel.app',
    title: 'NaijaOpportunities — Jobs & Scholarships for Nigerians',
    description: 'Find the latest jobs and scholarships for Nigerian students. Updated daily.',
    siteName: 'NaijaOpportunities',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NaijaOpportunities — Jobs & Scholarships for Nigerians',
    description: 'Find the latest jobs and scholarships for Nigerian students. Updated daily.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'var(--background)', color: 'var(--foreground)', minHeight: '100vh' }}>

        {/* NAVBAR */}
        <nav style={{ background: 'var(--card)', borderBottom: '1px solid var(--card-border)' }}
          className="sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
                <span className="text-white text-xs font-black">N</span>
              </div>
              <span className="font-bold text-base" style={{ color: 'var(--foreground)' }}>
                Naija<span className="text-green-600">Opportunities</span>
              </span>
            </a>
            <div className="flex items-center gap-3 md:gap-6">
              <a href="/jobs" className="text-xs md:text-sm font-medium transition-colors hover:text-green-600"
                style={{ color: 'var(--muted-text)' }}>Jobs</a>
              <a href="/scholarships" className="text-xs md:text-sm font-medium transition-colors hover:text-green-600"
                style={{ color: 'var(--muted-text)' }}>Scholarships</a>
              <a href="https://pathsync-ai.vercel.app" target="_blank"
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap">
                PathSync AI ✨
              </a>
            </div>
          </div>
        </nav>

        {/* PAGE */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>

        {/* FOOTER */}
        <footer style={{ borderTop: '1px solid var(--card-border)', background: 'var(--card)' }} className="mt-16">
          <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-green-600 flex items-center justify-center">
                  <span className="text-white text-xs font-black">N</span>
                </div>
                <span className="font-bold text-sm">NaijaOpportunities</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--muted-text)' }}>© 2026 OGverse. Built by a Nigerian student, for Nigerian students.</p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--muted-text)' }}>
              <a href="/about" className="hover:text-green-600 transition-colors">About</a>
              <a href="/privacy" className="hover:text-green-600 transition-colors">Privacy Policy</a>
              <a href="/contact" className="hover:text-green-600 transition-colors">Contact</a>
              <a href="https://pathsync-ai.vercel.app" target="_blank" className="text-green-600 font-semibold hover:underline">PathSync AI ✨</a>
            </div>
          </div>
        </footer>

      </body>
    </html>
  )
}