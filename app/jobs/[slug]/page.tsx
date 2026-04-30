import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import Groq from 'groq-sdk'

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
  eligibility: string | null
  benefits: string | null
  how_to_apply: string | null
  documents_needed: string | null
  salary: string | null
  experience: string | null
}

interface Props {
  params: Promise<{ slug: string }>
}

function parseBullets(text: string | null): string[] {
  if (!text) return []
  return text
    .replace(/^(bullet points?|list of documents?)[:\s]*/i, '')
    .split(/\||\n|\*|•/)
    .map(line => line.trim())
    .filter(line => line.length > 3)
}

function makeSlug(title: string, id: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id
}

async function enrichJob(job: Job): Promise<Job> {
  if (job.eligibility && job.benefits && job.how_to_apply) {
    return job
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const prompt = `
You are extracting job information from a job listing.
Return ONLY a valid JSON object. No markdown. No backticks. No explanation.
CRITICAL: For list fields, separate items with the pipe character | NOT with asterisks or bullet points.

Job title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Existing description: ${job.description}

Return this exact JSON structure:
{
  "description": "2-3 sentence summary of what this role is about and what the company does",
  "eligibility": "Bachelor's degree in relevant field | Minimum 2 years experience | Strong communication skills",
  "benefits": "Competitive salary | Health insurance | Pension contribution | Annual leave",
  "how_to_apply": "Visit the company website | Complete online application form | Upload CV and cover letter | Await response within 2 weeks",
  "documents_needed": "Updated CV | Cover letter | Academic certificates | Valid ID",
  "salary": "salary range if known or Competitive",
  "experience": "years of experience required e.g 2-3 years or Entry level"
}

RULES:
- Use pipe | to separate list items, never use * or bullet points
- Keep each value as a single string on one line
- Make reasonable guesses based on the job title if information is not available
- Do not add any text outside the JSON object
`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    })

    const raw = completion.choices[0]?.message?.content || ''
    let cleaned = raw.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    cleaned = jsonMatch[0]
    cleaned = cleaned.replace(
      /"([^"]*)":\s*"([^"]*)"/g,
      (_match: string, key: string, value: string) => {
        const safe = value.replace(/\n/g, ' | ').replace(/\*/g, '').replace(/\s{2,}/g, ' ').trim()
        return `"${key}": "${safe}"`
      }
    )

    const data = JSON.parse(cleaned)

    await supabase.from('jobs').update({
      description: data.description || job.description,
      eligibility: data.eligibility || null,
      benefits: data.benefits || null,
      how_to_apply: data.how_to_apply || null,
      documents_needed: data.documents_needed || null,
      salary: data.salary || null,
      experience: data.experience || null,
    }).eq('id', job.id)

    return { ...job, ...data }
  } catch (e) {
    console.error('Groq job enrichment error:', e)
    return job
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const id = slug.slice(-36)
  const { data: job } = await supabase.from('jobs').select('*').eq('id', id).single()
  return {
    title: job ? `${job.title} | NaijaOpportunities` : 'Job | NaijaOpportunities',
    description: job ? `Apply for ${job.title} at ${job.company} in ${job.location}.` : '',
  }
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params
  const id = slug.slice(-36)

  const { data: raw } = await supabase.from('jobs').select('*').eq('id', id).single()

  if (!raw) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Job not found</h1>
        <Link href="/jobs" className="text-green-700 hover:underline">← Back to jobs</Link>
      </div>
    )
  }

  const job = await enrichJob(raw as Job)

  const { data: similar } = await supabase
    .from('jobs')
    .select('id, title, company, location, source')
    .neq('id', job.id)
    .limit(3)

  const shareText = encodeURIComponent(
    `💼 ${job.title}\n\n${job.description?.slice(0, 100)}...\n\n${job.salary ? `💰 ${job.salary}\n` : ''}${job.location ? `📍 ${job.location}\n` : ''}\nView & Apply 👇\nhttps://naija-opportunities.vercel.app/jobs/${slug}\n\n🤖 Let PathSync AI write your CV: https://pathsync-ai.vercel.app`
  )
  const whatsappUrl = `https://wa.me/?text=${shareText}`

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/jobs" className="text-sm text-gray-500 hover:text-green-700 mb-6 inline-block">
        ← Back to all jobs
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-green-700 font-semibold uppercase tracking-wide">{job.source}</span>
          {job.type && <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">{job.type}</span>}
        </div>

        <h1 className="text-2xl font-bold mb-5 text-gray-900 leading-tight">{job.title}</h1>

        <div className="flex flex-wrap gap-3 mb-6">
          {job.salary && (
            <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-full px-4 py-2">
              <span>💰</span>
              <span className="text-sm font-semibold text-yellow-800">{job.salary}</span>
            </div>
          )}
          {job.experience && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-4 py-2">
              <span>⚡</span>
              <span className="text-sm font-medium text-blue-800">{job.experience}</span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
              <span>📍</span>
              <span className="text-sm font-medium text-gray-700">{job.location}</span>
            </div>
          )}
          {job.deadline && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-4 py-2">
              <span>⏰</span>
              <span className="text-sm font-semibold text-red-700">Deadline: {job.deadline}</span>
            </div>
          )}
        </div>

        {job.description && (
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 mb-2">About this Role</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{job.description}</p>
          </div>
        )}

        {job.eligibility && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-4">
            <h2 className="font-bold text-blue-900 mb-3">✅ Requirements</h2>
            <ul className="space-y-2">
              {parseBullets(job.eligibility).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-blue-800 text-sm">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {job.benefits && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-5 mb-4">
            <h2 className="font-bold text-green-900 mb-3">🎁 Benefits</h2>
            <ul className="space-y-2">
              {parseBullets(job.benefits).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-green-800 text-sm">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">★</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {job.how_to_apply && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-4">
            <h2 className="font-bold text-gray-900 mb-3">📋 How to Apply</h2>
            <ol className="space-y-2 list-none">
              {parseBullets(job.how_to_apply).map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-700 text-sm">
                  <span className="bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span>{item.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {job.documents_needed && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mb-6">
            <h2 className="font-bold text-amber-900 mb-3">📁 Documents Needed</h2>
            <ul className="space-y-2">
              {parseBullets(job.documents_needed).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-amber-800 text-sm">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">📄</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
            className="flex-1 bg-green-700 text-white text-center font-semibold py-3 rounded-xl hover:bg-green-800 transition-colors text-sm">
            Apply Now →
          </a>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-green-600 transition-colors text-sm">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Share
          </a>
        </div>
      </div>

      {/* PATHSYNC BANNER */}
      <a href="https://pathsync-ai.vercel.app" target="_blank" rel="noopener noreferrer" className="block mb-5">
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🤖</span>
                <span className="font-bold text-lg">Want AI to write your CV & cover letter?</span>
              </div>
              <p className="text-green-100 text-sm mb-4 leading-relaxed">
                PathSync AI analyses your profile, matches you to jobs you qualify for, and automatically writes your CV and cover letter.
              </p>
              <div className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-5 py-2.5 rounded-xl text-sm">
                Try PathSync AI free →
              </div>
            </div>
          </div>
        </div>
      </a>

      {similar && similar.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Similar Jobs</h2>
          <div className="flex flex-col gap-3">
            {similar.map((sim) => (
              <Link key={sim.id} href={`/jobs/${makeSlug(sim.title, sim.id)}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-green-300 hover:shadow-sm transition-all group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-green-700 truncate">{sim.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{sim.company} · {sim.location}</p>
                </div>
                <span className="text-green-400 ml-4 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}