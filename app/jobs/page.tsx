import SafeImage from '../components/SafeImage'
import { getGradient } from '../components/getGradient'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

interface Job {
  id: string
  short_id: number 
  title: string
  company: string
  location: string
  type: string
  source: string
  deadline: string | null
  description: string | null
  salary: string | null
  image_url: string | null
}

function makeSlug(title: string, shortId: number) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) + '-' + shortId
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
          const slug = makeSlug(job.title, job.short_id)
          return (
            <Link
  key={job.id}
  href={`/jobs/${slug}`}
  className="card flex flex-col group"
  style={{ borderLeft: '3px solid #16a34a' }}
>
  {/* IMAGE */}
  {job.image_url ? (<div className="w-full aspect-video overflow-hidden rounded-t-xl"><SafeImage src={job.image_url} alt={job.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>) : (<div className="w-full aspect-video overflow-hidden rounded-t-xl"><img src="/placeholder-job.svg" alt="Job" className="w-full h-full object-cover" /></div>)}

  {/* CONTENT */}
  <div className="p-5 flex flex-col flex-1">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-bold text-green-500 uppercase tracking-wide">{job.source}</span>
      {job.type && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/20 text-green-400">{job.type}</span>}
    </div>
    <h2 className="font-bold text-sm mb-2 line-clamp-2 group-hover:text-green-400 transition-colors leading-snug"
      style={{ color: 'var(--foreground)' }}>
      {job.title}
    </h2>
    <p className="text-xs mb-2" style={{ color: 'var(--muted-text)' }}>🏢 {job.company} · 📍 {job.location}</p>
    {job.salary && (
      <span className="text-xs font-bold text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded-lg mb-2 inline-block w-fit">
        💰 {job.salary}
      </span>
    )}
    <div className="mt-auto pt-3 border-t flex items-center justify-between"
      style={{ borderColor: 'var(--card-border)' }}>
      <span className="text-xs font-bold text-green-500 group-hover:translate-x-1 transition-transform inline-block">
        View & Apply →
      </span>
      <span className="text-xs" style={{ color: 'var(--muted-text)' }}>🤖 AI assist</span>
    </div>
  </div>
</Link>
          )
        })}
      </div>

      <div className="mt-12">
        <a href="https://pathsync-ai.vercel.app" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-between card border border-green-200 rounded-xl px-6 py-5 hover:bg-green-100 transition-colors">
          <div>
            <div className="font-bold card mb-1" >🤖 Let PathSync AI find your perfect job </div>
            <div className="text-sm text-green-600">Tell it your skills - it finds jobs you qualify for.</div>
          </div>
          <span className="card font-semibold text-sm whitespace-nowrap ml-6 bg-white/20 px-4 py-2 rounded-lg flex-shrink-0">
            Try free →
          </span>
        </a>
      </div>
    </div>
  )
}

