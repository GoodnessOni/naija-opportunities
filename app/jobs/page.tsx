import { supabase } from '../lib/supabase'

interface Job {
  id: string
  title: string
  company: string
  location: string
  type: string
  source: string
  apply_url: string
  deadline: string | null
}

export default async function JobsPage() {
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Latest Jobs in Nigeria 🇳🇬</h1>
        <p className="text-gray-500">Fresh opportunities updated daily from top Nigerian job sites.</p>
      </div>

      {/* JOB COUNT */}
      <div className="text-sm text-gray-500 mb-6">
        Showing <span className="font-semibold text-gray-900">{jobs?.length ?? 0}</span> jobs
      </div>

      {/* JOB CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs?.map((job: Job) => (
          <a
            key={job.id}
            href={`/jobs/${job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${job.id}`}
            rel="noopener noreferrer"
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-green-300 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-green-700 font-semibold uppercase">{job.source}</span>
              {job.type && (
                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                  {job.type}
                </span>
              )}
            </div>
            <h2 className="font-semibold text-gray-900 mb-1 line-clamp-2">{job.title}</h2>
            <p className="text-sm text-gray-500 mb-3">{job.company} · {job.location}</p>
            {job.deadline && (
              <p className="text-xs text-red-500">Deadline: {job.deadline}</p>
            )}
            <div className="mt-3 text-xs font-semibold text-green-700">Apply now →</div>
          </a>
        ))}
      </div>
    </div>
  )
}