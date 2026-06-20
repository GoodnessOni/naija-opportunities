import ScholarshipPlaceholder from '../components/ScholarshipPlaceholder'
import SafeImage from '../components/SafeImage'
import { getGradient } from '../components/getGradient'
/// <reference types="react" />
import React from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
interface Scholarship {
  id: string
  short_id: number 
  title: string
  provider: string
  country: string
  level: string
  source: string
  apply_url: string
  deadline: string | null
  description: string
  amount: string | null
  slug: string | null
  image_url: string | null
}

function makeSlug(title: string, id: string | number): string {
   return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) + '-' + id
}


function getDeadlineUrgency(deadline: string | null): 'urgent' | 'soon' | 'open' | null {
  if (!deadline) return null
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 14) return 'urgent'
  if (days <= 30) return 'soon'
  return 'open'
}

export default async function ScholarshipsPage() {
  const today = new Date().toISOString().split('T')[0]

const { data: scholarships } = await supabase
  .from('scholarships')
  .select('*')
  .or(`deadline.is.null,deadline.gte.${today}`)
  .order('created_at', { ascending: false })

  const total = scholarships?.length ?? 0

  // Separate urgent deadlines
  const urgent = (scholarships as Scholarship[])?.filter(s => {
    if (!s.deadline) return false
    const days = Math.ceil((new Date(s.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days <= 30 && days > 0
  }) ?? []

  return (
  <div>
      {/* HEADER */}
     <div className="mb-6">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2" style={{ color: 'var(--foreground)' }}>
      Scholarships for Nigerians 🎓
      </h1>
    <p className="text-sm" style={{ color: 'var(--muted-text)' }}>International and local scholarships updated daily.</p>
   </div>
      {/* STATS ROW */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="card px-4 py-2.5 flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <div>
            <div className="text-xs text-blue-600 font-medium">Total</div>
            <div className="text-sm font-bold text-blue-400">{total} scholarships</div>
          </div>
        </div>
        {urgent.length > 0 && (
          <div className="card border border-red-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <span className="text-xl">⏰</span>
            <div>
              <div className="text-xs text-red-600 font-medium">Closing Soon</div>
              <div className="text-sm font-bold text-red-900">{urgent.length} deadlines this month</div>
            </div>
          </div>
        )}
        <div className="card border border-green-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-xl">🔄</span>
          <div>
            <div className="text-xs text-green-400 font-medium">Updated</div>
            <div className="text-sm font-bold text-green-400">Daily</div>
          </div>
        </div>
      </div>

      {/* PATHSYNC AI BANNER — BIG and unmissable */}
      <a href="https://pathsync-ai.vercel.app" target="_blank" rel="noopener noreferrer"
        className="block mb-8 rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }}>
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🤖</span>
              <span className="font-bold text-white text-lg">Don't know which scholarship fits you?</span>
            </div>
            <p className="text-green-200 text-sm mb-3">PathSync AI matches you to scholarships you qualify for — then writes your application letter and CV.</p>
            <div className="flex flex-wrap gap-2">
              {['🎯 Smart matching', '✉️ Application letter', '📄 CV generator', '📅 Deadline tracker'].map(f => (
                <span
                  key={f}
                  style={{ background: 'linear-gradient(135deg, #064e3b 0%, #15803d 60%, #16a34a 100%)' }}
                  className="text-white text-xs px-3 py-1 rounded-full font-medium"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-shrink-0">
            <span
              className="inline-block font-bold px-6 py-3 rounded-2xl text-sm whitespace-nowrap bg-white text-green-800"
            >
              Try PathSync AI free →
            </span>
          </div>
        </div>
      </a>

      {/* URGENT DEADLINES SECTION */}
      {urgent.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <span>⏰</span> Closing Soon — Apply Before It&apos;s Too Late
          </h2>
          <div className="flex flex-col gap-3">
            {urgent.slice(0, 3).map((s: Scholarship) => {
              const slug = makeSlug(s.title, s.short_id)
              const days = Math.ceil((new Date(s.deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              return (
                <Link
                  key={s.id}
                  href={`/scholarships/${slug}`}
                  className="flex items-center justify-between card border border-red-200 rounded-xl px-5 py-4 hover:border-red-400 hover:shadow-sm transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold group-hover:text-red-700 truncate transition-colors" style={{ color: 'var(--foreground)' }}>{s.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {s.amount && <span className="text-xs text-yellow-700 font-medium">💰 {s.amount}</span>}
                      <span className="text-xs text-gray-400">• {s.country}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-lg">{days}d left</span>
                    <span className="text-red-400 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ALL SCHOLARSHIPS GRID */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>All Scholarships</h2>
        <span className="text-sm" style={{ color: 'var(--muted-text)' }}>{total} listings</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scholarships?.map((s: Scholarship) => {
          const slug = makeSlug(s.title, s.short_id)
          const urgency = getDeadlineUrgency(s.deadline)
          return (
            <Link
  key={s.id}
  href={`/scholarships/${slug}`}
  className="card flex flex-col group"
  style={{ borderLeft: '3px solid #2563eb' }}
>
  {/* IMAGE */}
{s.image_url ? (
  <div className="w-full aspect-video overflow-hidden rounded-t-xl">
    <SafeImage src={s.image_url} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    type="scholarship"
  title={s.title} />
  </div>
) : (
  <div className="w-full aspect-video overflow-hidden rounded-t-xl">
    <ScholarshipPlaceholder title={s.title} />
  </div>
)}

  {/* CONTENT */}
  <div className="p-5 flex flex-col flex-1">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">{s.source}</span>
      {s.level && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/20 text-blue-400">{s.level}</span>}
    </div>
    <h2 className="font-bold text-sm mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors leading-snug"
      style={{ color: 'var(--foreground)' }}>
      {s.title}
    </h2>
    <p className="text-xs mb-2" style={{ color: 'var(--muted-text)' }}>🌍 {s.country}</p>
    {s.amount && (
      <span className="text-xs font-bold text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded-lg mb-2 inline-block w-fit">
        💰 {s.amount}
      </span>
    )}
    {s.deadline && (
      <p className={`text-xs font-medium mb-3 ${
        urgency === 'urgent' ? 'text-red-500' :
        urgency === 'soon' ? 'text-orange-400' : ''
      }`} style={urgency === 'open' ? { color: 'var(--muted-text)' } : undefined}>
        {urgency === 'urgent' ? '🔴' : urgency === 'soon' ? '🟡' : '📅'} Deadline: {s.deadline}
      </p>
    )}
    <div className="mt-auto pt-3 border-t flex items-center justify-between"
      style={{ borderColor: 'var(--card-border)' }}>
      <span className="text-xs font-bold text-blue-500 group-hover:translate-x-1 transition-transform inline-block">
        View & Apply →
      </span>
      <span className="text-xs" style={{ color: 'var(--muted-text)' }}>🤖 AI match</span>
    </div>
  </div>
</Link>
          )
        })}
      </div>

      {/* BOTTOM PATHSYNC BANNER */}
      <div className="mt-12 mb-4">
        <a
          href="https://pathsync-ai.vercel.app"
  target="_blank"
  rel="noopener noreferrer"
  className="block rounded-2xl px-6 py-5 transition-colors mt-12 mb-4"
  style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }}
>
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <div className="font-bold text-white mb-1">🤖 PathSync AI finds your match</div>
      <div className="text-sm text-green-100">Tell it your CGPA and course — it finds scholarships you qualify for.</div>
    </div>
    <div className="text-white font-semibold text-sm whitespace-nowrap bg-white/20 px-4 py-2 rounded-lg self-start sm:self-auto flex-shrink-0">
      Try free →
    </div>
  </div>
</a>
      </div>
    </div>
  )
}


