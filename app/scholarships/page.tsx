import { supabase } from '../lib/supabase'

interface Scholarship {
  id: string
  title: string
  provider: string
  country: string
  level: string
  source: string
  apply_url: string
  deadline: string | null
  description: string
}

export default async function ScholarshipsPage() {
  const { data: scholarships } = await supabase
    .from('scholarships')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Scholarships for Nigerians 🎓</h1>
        <p className="text-gray-500">International and local scholarships updated daily.</p>
      </div>

      {/* COUNT */}
      <div className="text-sm text-gray-500 mb-6">
        Showing <span className="font-semibold text-gray-900">{scholarships?.length ?? 0}</span> scholarships
      </div>

      {/* PATHSYNC BANNER */}
      <a
        href="https://pathsyncai.com"
        target="_blank"
        className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-6 py-4 mb-8 hover:bg-green-100 transition-colors"
      >
        <div>
          <div className="font-semibold text-green-800 mb-1">🤖 Let AI find your perfect scholarship</div>
          <div className="text-sm text-green-700">PathSync AI matches you to scholarships based on your profile</div>
        </div>
        <div className="text-green-700 font-semibold text-sm whitespace-nowrap ml-4">Try PathSync AI →</div>
      </a>

      {/* SCHOLARSHIP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scholarships?.map((s: Scholarship) => (
          <a
            key={s.id}
            href={`/scholarships/${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${s.id}`}
            rel="noopener noreferrer"
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-blue-600 font-semibold uppercase">{s.source}</span>
              {s.level && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  {s.level}
                </span>
              )}
            </div>
            <h2 className="font-semibold text-gray-900 mb-1 line-clamp-2">{s.title}</h2>
            <p className="text-sm text-gray-500 mb-2">{s.country}</p>
            {s.description && (
              <p className="text-xs text-gray-400 line-clamp-2 mb-3">{s.description}</p>
            )}
            {s.deadline && (
              <p className="text-xs text-red-500 mb-2">Deadline: {s.deadline}</p>
            )}
            <div className="mt-3 text-xs font-semibold text-blue-600">Apply now →</div>
          </a>
        ))}
      </div>
    </div>
  )
}