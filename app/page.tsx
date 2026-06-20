import SafeImage from './components/SafeImage'
import ScholarshipPlaceholder from './components/ScholarshipPlaceholder'
import { supabase } from './lib/supabase'
import Link from 'next/link'

// Add Metadata so your Home page looks good on Social Media
export const metadata = {
  title: 'NaijaOpportunities — Jobs & Scholarships for Nigerians',
  description: 'The #1 free platform for Nigerian students and job seekers. Updated daily.',
}

function makeSlug(title: string, shortId: number) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) + '-' + shortId
}

export default async function Home() {
  // Fetch latest 6 of each
  const { data: jobs } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(6)
  const today = new Date().toISOString().split('T')[0]
  const { data: scholarships } = await supabase.from('scholarships').select('*').or(`deadline.is.null,deadline.gte.${today}`).order('created_at', { ascending: false }).limit(6)

  return (
    <div>
      {/* HERO SECTION */}
      <div className="relative overflow-hidden rounded-3xl mb-8 p-8 md:p-12"
        style={{ background: 'linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            🔄 Updated every 6 hours
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3 leading-tight">
            Jobs & Scholarships<br />
            <span className="text-green-200">for Nigerians</span>
          </h1>
          <p className="text-green-100 mb-8 text-sm md:text-base max-w-md mx-auto">
            The #1 free platform for Nigerian students and job seekers. Fresh opportunities, updated daily.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/jobs" className="bg-white text-green-700 font-bold px-6 py-3 rounded-2xl hover:bg-green-50 transition-colors text-sm shadow-lg">
              Browse Jobs 💼
            </Link>
            <Link href="/scholarships" className="border-2 border-white text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/10 transition-colors text-sm">
              Scholarships 🎓
            </Link>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Opportunities', value: '500+', icon: '🎯' }, // Hardcoded for now since you are limiting the query to 6
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

      {/* LATEST JOBS */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold" style={{ color: 'var(--foreground)' }}>Latest Jobs</h2>
        <Link href="/jobs" className="text-sm text-green-600 font-semibold hover:underline">View all →</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {jobs?.map((job) => (
          <Link key={job.id} href={`/jobs/${makeSlug(job.title, job.short_id)}`}
            className="card flex flex-col group"
            style={{ borderLeft: '3px solid #16a34a' }}>
            <div className="w-full aspect-video overflow-hidden rounded-t-xl">
              <SafeImage 
                src={job.image_url || ''} 
                alt={job.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                type="job" 
                title={job.title} 
              />
            </div>
            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-green-600 uppercase tracking-wide">{job.source}</span>
                {job.type && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" 
                    style={{ background: 'var(--green-light)', color: 'var(--green)' }}>{job.type}</span>
                )}
              </div>
              <h3 className="font-bold text-sm mb-2 line-clamp-2 group-hover:text-green-600 transition-colors leading-snug" style={{ color: 'var(--foreground)' }}>
                {job.title}
              </h3>
              <p className="text-xs mb-3" style={{ color: 'var(--muted-text)' }}>🏢 {job.company} · 📍 {job.location}</p>
              <div className="mt-auto pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                <span className="text-xs font-bold text-green-600 group-hover:translate-x-1 transition-transform inline-block">View & Apply →</span>
                <span className="text-xs" style={{ color: 'var(--muted-text)' }}>🤖 AI assist</span>
              </div>
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
          <Link key={s.id} href={`/scholarships/${makeSlug(s.title, s.short_id)}`}
            className="card flex flex-col group"
            style={{ borderLeft: '3px solid #2563eb' }}>
            <div className="w-full aspect-video overflow-hidden rounded-t-xl">
              {s.image_url ? (
                <SafeImage 
                  src={s.image_url} 
                  alt={s.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  type="scholarship" 
                  title={s.title} 
                />
              ) : (
                <ScholarshipPlaceholder title={s.title} />
              )}
            </div>
            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{s.source}</span>
                {s.level && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">{s.level}</span>}
              </div>
              <h3 className="font-bold text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug" style={{ color: 'var(--foreground)' }}>
                {s.title}
              </h3>
              <p className="text-xs mb-2" style={{ color: 'var(--muted-text)' }}>🌍 {s.country}</p>
              {s.amount && <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-lg mb-2 inline-block w-fit">💰 {s.amount}</span>}
              <div className="mt-auto pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform inline-block">View & Apply →</span>
                <span className="text-xs" style={{ color: 'var(--muted-text)' }}>🤖 AI match</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {/* WHATSAPP COMMUNITY BANNER */}
      <div className="mt-10">
        
          href="https://chat.whatsapp.com/IkNg6DbUyMVHucULkqjjF1"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-3xl p-6 text-white"
          style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">💬</span>
                <span className="font-bold text-lg">Join our WhatsApp Community</span>
              </div>
              <p className="text-green-100 text-sm">Get daily scholarship and job alerts sent straight to your WhatsApp. Free, no spam.</p>
            </div>
            <div className="flex-shrink-0">
              <span className="inline-block bg-white text-green-700 font-bold px-6 py-3 rounded-2xl text-sm whitespace-nowrap">
                Join Now →
              </span>
            </div>
          </div>
        </a>
      </div>
    </div>
  )
}
