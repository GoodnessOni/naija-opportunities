import { supabase } from '../lib/supabase'
import Link from 'next/link'

interface Job {
  id: string
  title: string
  company: string
  location: string
  type: string
  source: string
  deadline: string | null
  description: string | null
  salary: string | null
}

function makeSlug(title: string, id: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id
}

export default async function JobsPage() {
  const { data: jobs } = await supabase.from('jobs').select('*').order('created_at', { ascending: false })
  const total = jobs?.length ?? 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2" style={{ color: 'var(--foreground)' }}>
          Latest Jobs in Nigeria 💼
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted-text)' }}>Fresh opportunities updated daily from top Nigerian job sites.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { icon: '💼', label: 'Total', value: `${total} jobs` },
          { icon: '🔄', label: 'Updated', value: 'Daily' },
          { icon: '✅', label: 'Cost', value: 'Free' },
        ].map(s => (
          <div key={s.label} className="card px-4 py-3 flex items-center gap-3">
            <span className="text-xl">{s.icon}</span>
            <div>
              <div className="text-xs font-medium text-green-600">{s.label}</div>
              <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <a href="https://pathsync-ai.vercel.app" target="_blank" rel="noopener noreferrer"
        className="block mb-8 rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }}>
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🤖</span>
              <span className="font-bold text-white">Want AI to write your CV & cover letter?</span>
            </div>
            <p className="text-green-200 text-sm">PathSync AI matches you to jobs you qualify for and writes your application automatically.</p>
          </div>
          <span className="flex-shrink-0 inline-block bg-white text-green-800 font-bold px-5 py-2.5 rounded-2xl text-sm whitespace-nowrap">
            Try free →
          </span>
        </div>
      </a>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold" style={{ color: 'var(--foreground)' }}>All Jobs</h2>
        <span className="text-sm" style={{ color: 'var(--muted-text)' }}>{total} listings</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs?.map((job: Job) => {
          const slug = makeSlug(job.title, job.id)
          return (
            <Link key={job.id} href={`/jobs/${slug}`}
              className="card p-5 flex flex-col group"
              style={{ borderLeft: '3px solid #16a34a' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-green-600 uppercase tracking-wide">{job.source}</span>
                {job.type && <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--green-light)', color: 'var(--green)' }}>{job.type}</span>}
              </div>
              <h2 className="font-bold text-sm mb-2 line-clamp-2 group-hover:text-green-600 transition-colors leading-snug">
                {job.title}
              </h2>
              <p className="text-xs mb-2" style={{ color: 'var(--muted-text)' }}>🏢 {job.company} · 📍 {job.location}</p>
              {job.description && (
                <p className="text-xs line-clamp-2 mb-3 leading-relaxed flex-1" style={{ color: 'var(--muted-text)' }}>
                  {job.description}
                </p>
              )}
              {job.salary && (
                <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-lg mb-2 inline-block w-fit">
                  💰 {job.salary}
                </span>
              )}
              {job.deadline && <p className="text-xs text-red-500 mb-2">⏰ Deadline: {job.deadline}</p>}
              <div className="mt-auto pt-3 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--card-border)' }}>
                <span className="text-xs font-bold text-green-600 group-hover:translate-x-1 transition-transform inline-block">
                  View & Apply →
                </span>
                <span className="text-xs" style={{ color: 'var(--muted-text)' }}>🤖 AI assist</span>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-12">
        <a href="https://pathsync-ai.vercel.app" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-between rounded-2xl px-6 py-5 transition-colors"
          style={{ background: 'var(--green-light)', border: '1px solid #bbf7d0' }}>
          <div>
            <div className="font-bold text-green-800 mb-1">🤖 Let PathSync AI find your perfect job</div>
            <div className="text-sm text-green-700">Tell it your skills — it finds jobs you qualify for.</div>
          </div>
          <span className="text-green-700 font-bold text-sm whitespace-nowrap ml-6 bg-white px-4 py-2 rounded-xl flex-shrink-0">
            Try free →
          </span>
        </a>
      </div>
    </div>
  )
}