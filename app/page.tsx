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
      <div className="bg-green-700 text-white rounded-2xl p-10 mb-10 text-center">
        <h1 className="text-3xl font-bold mb-3">Jobs & Scholarships for Nigerians 🇳🇬</h1>
        <p className="text-green-100 mb-6">Updated daily. Find your next opportunity.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/jobs" className="bg-white text-green-700 font-semibold px-5 py-2 rounded-full hover:bg-green-50">
            Browse Jobs
          </Link>
          <Link href="/scholarships" className="border border-white text-white font-semibold px-5 py-2 rounded-full hover:bg-green-800">
            Browse Scholarships
          </Link>
        </div>
      </div>

      {/* LATEST JOBS */}
      <h2 className="text-xl font-bold mb-4">Latest Jobs</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {(jobs as Job[])?.map(job => (
          <a key={job.id} href={job.apply_url} target="_blank"
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="text-xs text-green-700 font-semibold uppercase mb-1">{job.source}</div>
            <h3 className="font-semibold mb-1">{job.title}</h3>
            <p className="text-sm text-gray-500">{job.company} · {job.location}</p>
          </a>
        ))}
      </div>
      <Link href="/jobs" className="text-green-700 font-semibold hover:underline">View all jobs →</Link>

      {/* LATEST SCHOLARSHIPS */}
      <h2 className="text-xl font-bold mb-4 mt-10">Latest Scholarships</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {(scholarships as Scholarship[])?.map(s => (
          <a key={s.id} href={s.apply_url} target="_blank"
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="text-xs text-blue-600 font-semibold uppercase mb-1">{s.source}</div>
            <h3 className="font-semibold mb-1">{s.title}</h3>
            <p className="text-sm text-gray-500">{s.country} · {s.level}</p>
          </a>
        ))}
      </div>
      <Link href="/scholarships" className="text-green-700 font-semibold hover:underline">View all scholarships →</Link>
    </div>
  )
}   