import { supabase } from './lib/supabase'
import Link from 'next/link'

function makeSlug(title: string, id: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id
}

export default async function Home() {
  const { data: jobs } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(6)
  const { data: scholarships } = await supabase.from('scholarships').select('*').order('created_at', { ascending: false }).limit(6)

  return (
    <div>
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl mb-8 p-8 md:p-12"
        style={{ background: 'linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'white', transform: 'translate(-30%, 30%)' }} />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            🔄 Updated every 6 hours
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3 leading-tight">
            Jobs & Scholarships<br />
            <span className="text-green-200">for Nigerians 🇳🇬</span>
          </h1>
          <p className="text-green-100 mb-8 text-sm md:text-base max-w-md mx-auto">
            The #1 free platform for Nigerian students and job seekers. Fresh opportunities, updated daily.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/jobs"
              className="bg-white text-green-700 font-bold px-6 py-3 rounded-2xl hover:bg-green-50 transition-colors text-sm shadow-lg">
              Browse Jobs 💼
            </Link>
            <Link href="/scholarships"
              className="border-2 border-white text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/10 transition-colors text-sm">
              Scholarships 🎓
            </Link>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Opportunities', value: `${(jobs?.length ?? 0) + (scholarships?.length ?? 0)}+`, icon: '🎯' },
          { label: 'Updated', value: 'Daily', icon: '🔄' },
          { label: 'Always', value: 'Free', icon: '✅' },
        ].map(stat => (
          <div key={stat.label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="font-extrabold text-lg text-green-600">{stat.value}</div>
            <div className="text-xs" style={{ color: 'var(--muted-text)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* PATHSYNC BANNER */}
      <a href="https://pathsync-ai.vercel.app" target="_blank" rel="noopener noreferrer"
        className="block mb-10 rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }}>
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🤖</span>
              <span className="font-bold text-white text-lg">Not sure where to start?</span>
            </div>
            <p className="text-green-200 text-sm leading-relaxed">
              PathSync AI analyses your profile, finds opportunities you qualify for, and writes your application letter — free.
            </p>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-block bg-white text-green-800 font-bold px-5 py-2.5 rounded-2xl text-sm whitespace-nowrap">
              Try free →
            </span>
          </div>
        </div>
      </a>

      {/* LATEST JOBS */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold" style={{ color: 'var(--foreground)' }}>Latest Jobs</h2>
        <Link href="/jobs" className="text-sm text-green-600 font-semibold hover:underline">View all →</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {jobs?.map((job) => (
          <Link key={job.id} href={`/jobs/${makeSlug(job.title, job.id)}`}
            className="card p-5 flex flex-col group"
            style={{ borderLeft: '3px solid #16a34a' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-green-600 uppercase tracking-wide">{job.source}</span>
              {job.type && <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--green-light)', color: 'var(--green)' }}>{job.type}</span>}
            </div>
            <h3 className="font-bold text-sm mb-2 line-clamp-2 group-hover:text-green-600 transition-colors leading-snug">
              {job.title}
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--muted-text)' }}>🏢 {job.company} · 📍 {job.location}</p>
            <div className="mt-auto pt-3 border-t flex items-center justify-between"
              style={{ borderColor: 'var(--card-border)' }}>
              <span className="text-xs font-bold text-green-600 group-hover:translate-x-1 transition-transform inline-block">
                View & Apply →
              </span>
              <span className="text-xs" style={{ color: 'var(--muted-text)' }}>🤖 AI assist</span>
            </div>
          </Link>
        ))}
      </div>

      {/* LATEST SCHOLARSHIPS */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold" style={{ color: 'var(--foreground)' }}>Latest Scholarships</h2>
        <Link href="/scholarships" className="text-sm text-green-600 font-semibold hover:underline">View all →</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scholarships?.map((s) => (
          <Link key={s.id} href={`/scholarships/${makeSlug(s.title, s.id)}`}
            className="card p-5 flex flex-col group"
            style={{ borderLeft: '3px solid #2563eb' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{s.source}</span>
              {s.level && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">{s.level}</span>}
            </div>
            <h3 className="font-bold text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
              {s.title}
            </h3>
            <p className="text-xs mb-2" style={{ color: 'var(--muted-text)' }}>🌍 {s.country}</p>
            {s.amount && (
              <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-lg mb-2 inline-block w-fit">
                💰 {s.amount}
              </span>
            )}
            <div className="mt-auto pt-3 border-t flex items-center justify-between"
              style={{ borderColor: 'var(--card-border)' }}>
              <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform inline-block">
                View & Apply →
              </span>
              <span className="text-xs" style={{ color: 'var(--muted-text)' }}>🤖 AI match</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}