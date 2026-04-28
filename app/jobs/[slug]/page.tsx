import { supabase } from '../../lib/supabase'
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
  description: string
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  // UUID is always the last 36 characters of the slug
  const id = slug.slice(-36)
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single()

  return {
    title: job ? `${job.title} at ${job.company} | NaijaOpportunities` : 'Job | NaijaOpportunities',
    description: job ? `Apply for ${job.title} at ${job.company} in ${job.location}.` : '',
  }
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params
  const id = slug.slice(-36)

  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single()

  if (!job) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Job not found</h1>
        <Link href="/jobs" className="text-green-700 hover:underline">← Back to jobs</Link>
      </div>
    )
  }

  const j = job as Job

  return (
    <div className="max-w-2xl mx-auto">
      {/* BACK */}
      <Link href="/jobs" className="text-sm text-gray-500 hover:text-green-700 mb-6 inline-block">
        ← Back to all jobs
      </Link>

      {/* JOB CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-green-700 font-semibold uppercase">{j.source}</span>
          {j.type && (
            <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full">{j.type}</span>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-2">{j.title}</h1>
        <p className="text-gray-500 mb-1">🏢 {j.company}</p>
        <p className="text-gray-500 mb-1">📍 {j.location}</p>
        {j.deadline && <p className="text-red-500 text-sm mb-4">⏰ Deadline: {j.deadline}</p>}

        {j.description && (
          <div className="mt-4 mb-6">
            <h2 className="font-semibold mb-2">About this role</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{j.description}</p>
          </div>
        )}

        {/* APPLY BUTTON */}
        <a
          href={j.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-green-700 text-white text-center font-semibold py-3 rounded-xl hover:bg-green-800 transition-colors"
        >
          Apply Now →
        </a>
      </div>

      {/* PATHSYNC BANNER */}
      <a
        href="https://pathsyncai.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-6 py-4 hover:bg-green-100 transition-colors"
      >
        <div>
          <div className="font-semibold text-green-800 mb-1">🤖 Want AI to find jobs for you?</div>
          <div className="text-sm text-green-700">PathSync AI matches you to opportunities based on your profile</div>
        </div>
        <div className="text-green-700 font-semibold text-sm whitespace-nowrap ml-4">Try PathSync AI →</div>
      </a>
    </div>
  )
}