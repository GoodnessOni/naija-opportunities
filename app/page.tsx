import { supabase } from './lib/supabase'
import Link from 'next/link'

interface Job {
  id: string
  title: string
  company: string
  location: string
  source: string
  apply_url: string
}

interface Scholarship {
  id: string
  title: string
  country: string
  level: string
  source: string
  apply_url: string
  amount: string | null
  description: string | null
}

function makeSlug(title: string, id: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id
}

export default async function Home() {
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(6)

  const { data: scholarships } = await supabase
    .from('scholarships')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(6)

  return (
    <div>
      {/* HERO */}
      <div className="bg-green-700 text-white rounded-2xl p-8 mb-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-3">Jobs & Scholarships for Nigerians 🇳🇬</h1>
        <p className="text-green-100 mb-6 text-sm md:text-base">Updated daily. Find your next opportunity.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/jobs" className="bg-white text-green-700 font-semibold px-5 py-2.5 rounded-full hover:bg-green-50 text-sm">
            Browse Jobs
          </Link>
          <Link href="/scholarships" className="border border-white text-white font-semibold px-5 py-2.5 rounded-full hover:bg-green-800 text-sm">
            Browse Scholarships
          </Link>
        </div>
      </div>

      {/* PATHSYNC BANNER */}
      <a href="https://pathsync-ai.vercel.app" target="_blank" rel="noopener noreferrer" className="block mb-8">
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-5 text-white hover:shadow-lg transition-shadow">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🤖</span>
                <span className="font-bold">Not sure where to start?</span>
              </div>
              <p className="text-green-100 text-sm">PathSync AI matches you to jobs and scholarships you actually qualify for — then writes your application letter.</p>
            </div>
            <div className="flex-shrink-0">
              <div className="inline-flex bg-white text-green-700 font-bold px-5 py-2.5 rounded-xl text-sm whitespace-nowrap">
                Try free →
              </div>
            </div>
          </div>
        </div>
      </a>

      {/* LATEST JOBS */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Latest Jobs</h2>
        <Link href="/jobs" className="text-sm text-green-700 font-medium hover:underline">View all →</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {jobs?.map((job: Job) => {
          const slug = makeSlug(job.title, job.id)
          return (
            <Link
              key={job.id}
              href={`/jobs/${slug}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-green-300 transition-all group"
            >
              <div className="text-xs text-green-700 font-semibold uppercase mb-1">{job.source}</div>
              <h3 className="font-semibold mb-1 text-sm group-hover:text-green-700 transition-colors line-clamp-2">{job.title}</h3>
              <p className="text-xs text-gray-500 mb-3">{job.company} · {job.location}</p>
              <div className="text-xs font-semibold text-green-700">View & Apply →</div>
            </Link>
          )
        })}
      </div>

      {/* LATEST SCHOLARSHIPS */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Latest Scholarships</h2>
        <Link href="/scholarships" className="text-sm text-green-700 font-medium hover:underline">View all →</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {scholarships?.map((s: Scholarship) => {
          const slug = makeSlug(s.title, s.id)
          return (
            <Link
              key={s.id}
              href={`/scholarships/${slug}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-blue-600 font-semibold uppercase">{s.source}</span>
                {s.level && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s.level}</span>}
              </div>
              <h3 className="font-semibold text-sm mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">{s.title}</h3>
              <p className="text-xs text-gray-500 mb-2">🌍 {s.country}</p>
              {s.amount && <p className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-lg mb-2 inline-block">💰 {s.amount}</p>}
              <div className="text-xs font-semibold text-blue-600 mt-2">View & Apply →</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}