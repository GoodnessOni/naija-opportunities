import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import Groq from 'groq-sdk'

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
  eligibility: string | null
  benefits: string | null
  how_to_apply: string | null
  documents_needed: string | null
  amount: string | null
  duration: string | null
}

interface Props {
  params: Promise<{ slug: string }>
}

async function enrichScholarship(scholarship: Scholarship): Promise<Scholarship> {
  if (scholarship.eligibility && scholarship.benefits && scholarship.how_to_apply) {
    return scholarship
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const prompt = `
You are extracting scholarship information.
Return ONLY a valid JSON object with no markdown, no backticks, no explanation.

Scholarship title: ${scholarship.title}
Existing description: ${scholarship.description}

Extract and return this exact JSON:
{
  "description": "2-3 sentence summary of what this scholarship is for",
  "eligibility": "eligibility requirements as bullet points e.g nationality, CGPA, year of study",
  "benefits": "what the scholar gets e.g amount per year, duration, accommodation, laptop, mentorship",
  "how_to_apply": "step by step application process",
  "documents_needed": "list of required documents",
  "amount": "monetary value if mentioned e.g $10,000 or full tuition",
  "duration": "how long the scholarship lasts"
}

If information is not available for a field, make a reasonable guess based on the title.
`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = completion.choices[0]?.message?.content || ''
    const cleaned = text
  .replace(/```json|```/g, '')
  .replace(/[\x00-\x1F\x7F]/g, ' ')
  .trim()
const data = JSON.parse(cleaned)

    await supabase
      .from('scholarships')
      .update({
        description: data.description || scholarship.description,
        eligibility: data.eligibility,
        benefits: data.benefits,
        how_to_apply: data.how_to_apply,
        documents_needed: data.documents_needed,
        amount: data.amount,
        duration: data.duration,
      })
      .eq('id', scholarship.id)

    return { ...scholarship, ...data }
  } catch (e) {
    console.error('Groq error:', e)
    return scholarship
  }
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

  const { data: raw } = await supabase
    .from('scholarships')
    .select('*')
    .eq('id', id)
    .single()

  if (!raw) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Scholarship not found</h1>
        <Link href="/scholarships" className="text-blue-600 hover:underline">← Back to scholarships</Link>
      </div>
    )
  }

  const s = await enrichScholarship(raw as Scholarship)

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/scholarships" className="text-sm text-gray-500 hover:text-blue-600 mb-6 inline-block">
        ← Back to all scholarships
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-blue-600 font-semibold uppercase">{s.source}</span>
          {s.level && <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">{s.level}</span>}
        </div>

        <h1 className="text-2xl font-bold mb-4">{s.title}</h1>

        <div className="space-y-2 mb-6">
          {s.amount && <p className="text-gray-700">💰 Amount: <span className="font-medium">{s.amount}</span></p>}
          {s.duration && <p className="text-gray-700">📅 Duration: <span className="font-medium">{s.duration}</span></p>}
          {s.country && <p className="text-gray-700">🌍 Country: <span className="font-medium">{s.country}</span></p>}
          {s.deadline && <p className="text-red-500">⏰ Deadline: <span className="font-medium">{s.deadline}</span></p>}
        </div>

        {s.description && (
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 mb-2">About this Scholarship</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{s.description}</p>
          </div>
        )}

        {s.eligibility && (
          <div className="bg-blue-50 rounded-xl p-4 mb-4">
            <h2 className="font-bold text-blue-900 mb-2">✅ Eligibility Criteria</h2>
            <p className="text-blue-800 text-sm leading-relaxed whitespace-pre-line">{s.eligibility}</p>
          </div>
        )}

        {s.benefits && (
          <div className="bg-green-50 rounded-xl p-4 mb-4">
            <h2 className="font-bold text-green-900 mb-2">🎁 What You Get</h2>
            <p className="text-green-800 text-sm leading-relaxed whitespace-pre-line">{s.benefits}</p>
          </div>
        )}

        {s.how_to_apply && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <h2 className="font-bold text-gray-900 mb-2">📋 How to Apply</h2>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{s.how_to_apply}</p>
          </div>
        )}

        {s.documents_needed && (
          <div className="bg-amber-50 rounded-xl p-4 mb-6">
            <h2 className="font-bold text-amber-900 mb-2">📁 Documents Needed</h2>
            <p className="text-amber-800 text-sm leading-relaxed whitespace-pre-line">{s.documents_needed}</p>
          </div>
        )}

        <a
          href={s.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-blue-600 text-white text-center font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Apply Now →
        </a>
      </div>

      <a
        href="https://pathsync-ai.vercel.app"
        target="_blank"
        className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-6 py-5 hover:bg-green-100 transition-colors mb-6"
      >
        <div>
          <div className="font-bold text-green-800 mb-1">🤖 Not sure if you qualify?</div>
          <div className="text-sm text-green-700">PathSync AI analyses your profile and tells you instantly — then writes your application letter.</div>
        </div>
        <div className="text-green-700 font-semibold text-sm whitespace-nowrap ml-4 bg-green-200 px-3 py-2 rounded-lg">Check if I qualify →</div>
      </a>

    </div>
  )
}