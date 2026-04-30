import { supabase } from '../lib/supabase'
import Link from 'next/link'

interface Job {
  id: string
  title: string
  company: string
  location: string
  type: string
  source: string
  apply_url: string
  deadline: string | null
  description: string | null
  salary: string | null
}

function makeSlug(title: string, id: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id
}

export default async function JobsPage() {
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false })

  const total = jobs?.length ?? 0

  return (
    <div>
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Latest Jobs in Nigeria 💼</h1>
        <p className="text-gray-500">Fresh opportunities updated daily from top Nigerian job sites.</p>
      </div>

      {/* STATS ROW */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-xl">💼</span>
          <div>
            <div className="text-xs text-green-600 font-medium">Total</div>
            <div className="text-sm font-bold text-green-900">{total} jobs</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-xl">🔄</span>
          <div>
            <div className="text-xs text-blue-600 font-medium">Updated</div>
            <div className="text-sm font-bold text-blue-900">Daily</div>
          </div>
        </div>
      </div>

      {/* PATHSYNC AI BANNER */}
      <a href="https://pathsync-ai.vercel.app" target="_blank" rel="noopener noreferrer" className="block mb-8">
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🤖</span>
                <span className="font-bold text-lg">Want AI to write your CV & cover letter?</span>
              </div>
              <p className="text-green-100 text-sm mb-3 leading-relaxed">
                PathSync AI matches you to jobs you actually qualify for — then writes your CV and cover letter automatically.
              </p>
              <div className="flex flex-wrap gap-2">
                {['🎯 Job matching', '📄 CV generator', '✉️ Cover letter', '⚡ Instant results'].map(f => (
                  <span key={f} className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">{f}</span>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-6 py-3 rounded-xl text-sm hover:bg-green-50 transition-colors whitespace-nowrap">
                Try PathSync AI free →
              </div>
            </div>
          </div>
        </div>
      </a>

      {/* ALL JOBS GRID */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">All Jobs</h2>
        <span className="text-sm text-gray-500">{total} listings</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs?.map((job: Job) => {
          const slug = makeSlug(job.title, job.id)
          return (
            <Link
              key={job.id}
              href={`/jobs/${slug}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-green-300 transition-all group flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-green-700 font-semibold uppercase tracking-wide">{job.source}</span>
                {job.type && (
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">{job.type}</span>
                )}
              </div>

              <h2 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-700 transition-colors leading-snug text-sm">
                {job.title}
              </h2>

              <p className="text-xs text-gray-400 mb-2">🏢 {job.company} · 📍 {job.location}</p>

              {job.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed flex-1">{job.description}</p>
              )}

              {job.salary && (
                <div className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-lg mb-2 inline-block w-fit">
                  💰 {job.salary}
                </div>
              )}

              {job.deadline && (
                <p className="text-xs font-medium text-red-600 mb-3">⏰ Deadline: {job.deadline}</p>
              )}

              <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-green-700 group-hover:translate-x-1 transition-transform inline-block">
                  View & Apply →
                </span>
                <span className="text-xs text-gray-300 group-hover:text-green-500 transition-colors">
                  🤖 AI assist
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* BOTTOM PATHSYNC BANNER */}
      <div className="mt-12 mb-4">
        <a href="https://pathsync-ai.vercel.app" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-6 py-5 hover:bg-green-100 transition-colors">
          <div>
            <div className="font-bold text-green-800 mb-1">🤖 Let PathSync AI find your perfect job</div>
            <div className="text-sm text-green-700">Tell it your skills and experience — it finds jobs you actually qualify for.</div>
          </div>
          <div className="text-green-700 font-semibold text-sm whitespace-nowrap ml-6 bg-green-200 px-4 py-2 rounded-lg flex-shrink-0">
            Try free →
          </div>
        </a>
      </div>
    </div>
  )
}