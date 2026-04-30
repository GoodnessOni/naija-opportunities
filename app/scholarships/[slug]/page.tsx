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
  slug: string | null
}

interface Props {
  params: Promise<{ slug: string }>
}

// ── Parse bullet point text from Groq into clean array ──────────────────────
function parseBullets(text: string | null): string[] {
  if (!text) return []
  return text
    .replace(/^(bullet points?|list of documents?|steps?|requirements?)[:\s]*/i, '')
    .split(/\n|\*|•|–|-(?=\s)/)
    .map(line => line.trim())
    .filter(line => line.length > 3)
}

// ── Format slug from title + id ─────────────────────────────────────────────
function makeSlug(title: string, id: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id
}

async function enrichScholarship(scholarship: Scholarship): Promise<Scholarship> {
  if (scholarship.eligibility && scholarship.benefits && scholarship.how_to_apply) {
    return scholarship
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    // ── Key change: ask Groq to use pipe | as separator, NOT asterisks ──
    const prompt = `
You are extracting scholarship information.
Return ONLY a valid JSON object. No markdown. No backticks. No explanation.
CRITICAL: For list fields, separate items with the pipe character | NOT with asterisks or bullet points.

Scholarship title: ${scholarship.title}
Existing description: ${scholarship.description}

Return this exact JSON structure:
{
  "description": "2-3 sentence summary of what this scholarship is for",
  "eligibility": "Nigerian nationality | 3.5 CGPA or higher | Undergraduate student in Nigerian university",
  "benefits": "Full tuition coverage | Monthly stipend | Accommodation provided",
  "how_to_apply": "Visit the official website | Complete the online application form | Upload required documents | Await confirmation email",
  "documents_needed": "Academic transcript | Passport photograph | Recommendation letter | Birth certificate",
  "amount": "monetary value e.g 300000 per year or Full tuition",
  "duration": "how long e.g 4 years or 1 academic session"
}

RULES:
- Use pipe | to separate list items, never use * or bullet points
- Keep each value as a single string on one line
- If a field is unknown, make a reasonable guess based on the scholarship title
- Do not add any text outside the JSON object
`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // low temperature = more consistent output
    })

    const raw = completion.choices[0]?.message?.content || ''

    // ── Robust JSON extraction ──────────────────────────────────────────
    // 1. Strip markdown fences
    let cleaned = raw.replace(/```json|```/g, '').trim()

    // 2. Extract just the { } block
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON object found in Groq response')
    cleaned = jsonMatch[0]

    // 3. Fix any stray newlines inside JSON string values that break parsing
    cleaned = cleaned.replace(
      /"([^"]*)":\s*"([^"]*)"/g,
      (_match: string, key: string, value: string) => {
        const safe = value
          .replace(/\n/g, ' | ')   // newlines become pipes
          .replace(/\*/g, '')       // remove any asterisks
          .replace(/\s{2,}/g, ' ')  // collapse multiple spaces
          .trim()
        return `"${key}": "${safe}"`
      }
    )

    const data = JSON.parse(cleaned)

    // ── Save to Supabase so we don't call Groq again next time ──────────
    await supabase
      .from('scholarships')
      .update({
        description: data.description || scholarship.description,
        eligibility: data.eligibility || null,
        benefits: data.benefits || null,
        how_to_apply: data.how_to_apply || null,
        documents_needed: data.documents_needed || null,
        amount: data.amount || scholarship.amount,
        duration: data.duration || scholarship.duration,
      })
      .eq('id', scholarship.id)

    return { ...scholarship, ...data }
  } catch (e) {
    console.error('Groq enrichment error:', e)
    return scholarship // gracefully fall back to existing data
  }
}


export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const id = slug.slice(-36)
  const { data: s } = await supabase.from('scholarships').select('*').eq('id', id).single()
  return {
    title: s ? `${s.title} | NaijaOpportunities` : 'Scholarship | NaijaOpportunities',
    description: s ? `Apply for ${s.title}. ${s.description?.slice(0, 120)}` : '',
    openGraph: {
      title: s?.title,
      description: s?.description?.slice(0, 120),
    },
  }
}

export default async function ScholarshipPage({ params }: Props) {
  const { slug } = await params
  const id = slug.slice(-36)

  const { data: raw } = await supabase.from('scholarships').select('*').eq('id', id).single()

  if (!raw) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Scholarship not found</h1>
        <Link href="/scholarships" className="text-blue-600 hover:underline">← Back to scholarships</Link>
      </div>
    )
  }

  const s = await enrichScholarship(raw as Scholarship)

  // Fetch similar scholarships (same country or level, exclude current)
  const { data: similar } = await supabase
    .from('scholarships')
    .select('id, title, amount, country, level, source, slug')
    .neq('id', s.id)
    .eq('country', s.country)
    .limit(3)

  // WhatsApp share text
  const shareText = encodeURIComponent(
    `🎓 ${s.title}\n\n${s.description?.slice(0, 100)}...\n\n${s.amount ? `💰 ${s.amount}\n` : ''}${s.deadline ? `⏰ Deadline: ${s.deadline}\n` : ''}\nApply & check if you qualify 👇\nhttps://naija-opportunities.vercel.app/scholarships/${slug}\n\n🤖 Let PathSync AI write your application letter free: https://pathsync-ai.vercel.app`
  )
  const whatsappUrl = `https://wa.me/?text=${shareText}`

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link href="/scholarships" className="text-sm text-gray-500 hover:text-blue-600 mb-6 inline-block">
        ← Back to all scholarships
      </Link>

      {/* Main card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-5 shadow-sm">

        {/* Header badges */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-blue-600 font-semibold uppercase tracking-wide">{s.source}</span>
          {s.level && <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">{s.level}</span>}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-5 text-gray-900 leading-tight">{s.title}</h1>

        {/* Key info pills */}
        <div className="flex flex-wrap gap-3 mb-6">
          {s.amount && (
            <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-full px-4 py-2">
              <span className="text-lg">💰</span>
              <span className="text-sm font-semibold text-yellow-800">{s.amount}</span>
            </div>
          )}
          {s.duration && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-4 py-2">
              <span className="text-lg">📅</span>
              <span className="text-sm font-medium text-blue-800">{s.duration}</span>
            </div>
          )}
          {s.country && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
              <span className="text-lg">🌍</span>
              <span className="text-sm font-medium text-gray-700">{s.country}</span>
            </div>
          )}
          {s.deadline && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-4 py-2">
              <span className="text-lg">⏰</span>
              <span className="text-sm font-semibold text-red-700">Deadline: {s.deadline}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {s.description && (
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 mb-2 text-base">About this Scholarship</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{s.description}</p>
          </div>
        )}

        {/* Eligibility */}
        {s.eligibility && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-4">
            <h2 className="font-bold text-blue-900 mb-3 text-base">✅ Eligibility Criteria</h2>
            <ul className="space-y-2">
              {parseBullets(s.eligibility).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-blue-800 text-sm">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Benefits */}
        {s.benefits && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-5 mb-4">
            <h2 className="font-bold text-green-900 mb-3 text-base">🎁 What You Get</h2>
            <ul className="space-y-2">
              {parseBullets(s.benefits).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-green-800 text-sm">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">★</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* How to apply */}
        {s.how_to_apply && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-4">
            <h2 className="font-bold text-gray-900 mb-3 text-base">📋 How to Apply</h2>
            <ol className="space-y-2 list-none">
              {parseBullets(s.how_to_apply).map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-700 text-sm">
                  <span className="bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span>{item.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Documents needed */}
        {s.documents_needed && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mb-6">
            <h2 className="font-bold text-amber-900 mb-3 text-base">📁 Documents Needed</h2>
            <ul className="space-y-2">
              {parseBullets(s.documents_needed).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-amber-800 text-sm">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">📄</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Apply + Share buttons */}
        <div className="flex gap-3">
          <a
            href={s.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-600 text-white text-center font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm"
          >
            Apply Now →
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-green-600 transition-colors text-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Share
          </a>
        </div>
      </div>

      {/* PathSync AI Banner — BIG and unmissable */}
      <a
        href="https://pathsync-ai.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="block mb-5"
      >
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🤖</span>
                <span className="font-bold text-lg">Not sure if you qualify?</span>
              </div>
              <p className="text-green-100 text-sm mb-4 leading-relaxed">
                PathSync AI has a conversation with you, surfaces your hidden achievements,
                and tells you exactly which scholarships you qualify for — then writes your
                application letter and CV automatically.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {['🎯 Scholarship matching', '✉️ Application letter', '📄 CV generator', '📅 Deadline tracker'].map(f => (
                  <span key={f} className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">{f}</span>
                ))}
              </div>
              <div className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-green-50 transition-colors">
                Check if I qualify — it&apos;s free →
              </div>
            </div>
          </div>
        </div>
      </a>

      {/* Similar Scholarships */}
      {similar && similar.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Similar Scholarships</h2>
          <div className="flex flex-col gap-3">
            {similar.map((sim) => {
              const simSlug = sim.slug || makeSlug(sim.title, sim.id)
              return (
                <Link
                  key={sim.id}
                  href={`/scholarships/${simSlug}`}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 truncate transition-colors">{sim.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {sim.amount && <span className="text-xs text-yellow-700 font-medium">💰 {sim.amount}</span>}
                      {sim.country && <span className="text-xs text-gray-400">• {sim.country}</span>}
                    </div>
                  </div>
                  <span className="text-blue-400 text-sm font-medium ml-4 flex-shrink-0 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              )
            })}
          </div>
          <div className="mt-4 text-center">
            <Link href="/scholarships" className="text-sm text-blue-600 hover:underline font-medium">
              View all scholarships →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
