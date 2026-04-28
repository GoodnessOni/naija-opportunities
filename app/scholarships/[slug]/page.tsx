import { supabase } from '../../lib/supabase'
import Link from 'next/link'

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

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const id = slug.slice(-36)
  const { data: s } = await supabase
    .from('scholarships')
    .select('*')
    .eq('id', id)
    .single()

  return {
    title: s ? `${s.title} | NaijaOpportunities` : 'Scholarship | NaijaOpportunities',
    description: s ? `Apply for ${s.title}. ${s.description?.slice(0, 120)}` : '',
  }
}

export default async function ScholarshipPage({ params }: Props) {
  const { slug } = await params
  const id = slug.slice(-36)

  const { data: s } = await supabase
    .from('scholarships')
    .select('*')
    .eq('id', id)
    .single()

  if (!s) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Scholarship not found</h1>
        <Link href="/scholarships" className="text-blue-600 hover:underline">← Back to scholarships</Link>
      </div>
    )
  }

  const scholarship = s as Scholarship

  return (
    <div className="max-w-2xl mx-auto">

      <Link href="/scholarships" className="text-sm text-gray-500 hover:text-blue-600 mb-6 inline-block">
        ← Back to all scholarships
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-blue-600 font-semibold uppercase">{scholarship.source}</span>
          {scholarship.level && (
            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">{scholarship.level}</span>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-4">{scholarship.title}</h1>

        <div className="space-y-2 mb-6">
          {scholarship.provider && <p className="text-gray-500">🏛️ Provider: <span className="text-gray-900 font-medium">{scholarship.provider}</span></p>}
          {scholarship.country && <p className="text-gray-500">🌍 Country: <span className="text-gray-900 font-medium">{scholarship.country}</span></p>}
          {scholarship.level && <p className="text-gray-500">🎓 Level: <span className="text-gray-900 font-medium">{scholarship.level}</span></p>}
          {scholarship.deadline && <p className="text-red-500">⏰ Deadline: <span className="font-medium">{scholarship.deadline}</span></p>}
        </div>

        {scholarship.description && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h2 className="font-semibold mb-2">About this scholarship</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{scholarship.description}</p>
          </div>
        )}

        <a
          href={scholarship.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-blue-600 text-white text-center font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Apply Now →
        </a>
      </div>

      <a
        href="https://pathsyncai.com"
        target="_blank"
        className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-6 py-4 hover:bg-green-100 transition-colors"
      >
        <div>
          <div className="font-semibold text-green-800 mb-1">🤖 Let AI find your perfect scholarship</div>
          <div className="text-sm text-green-700">PathSync AI matches you to scholarships based on your profile</div>
        </div>
        <div className="text-green-700 font-semibold text-sm whitespace-nowrap ml-4">Try PathSync AI →</div>
      </a>

    </div>
  )
}