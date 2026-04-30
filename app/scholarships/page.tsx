/// <reference types="react" />
import React from 'react'
import { supabase } from '../lib/supabase'
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
  amount: string | null
  slug: string | null
}

function makeSlug(title: string, id: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id
}

function getDeadlineUrgency(deadline: string | null): 'urgent' | 'soon' | 'open' | null {
  if (!deadline) return null
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 14) return 'urgent'
  if (days <= 30) return 'soon'
  return 'open'
}

export default async function ScholarshipsPage() {
  const { data: scholarships } = await supabase
    .from('scholarships')
    .select('*')
    .order('created_at', { ascending: false })

  const total = scholarships?.length ?? 0

  // Separate urgent deadlines
  const urgent = scholarships?.filter(s => {
    if (!s.deadline) return false
    const days = Math.ceil((new Date(s.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days <= 30 && days > 0
  }) ?? []

  return (
    <div>
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Scholarships for Nigerians 🎓</h1>
        <p className="text-gray-500">International and local scholarships — updated daily.</p>
      </div>

      {/* STATS ROW */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <div>
            <div className="text-xs text-blue-600 font-medium">Total</div>
            <div className="text-sm font-bold text-blue-900">{total} scholarships</div>
          </div>
        </div>
        {urgent.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <span className="text-xl">⏰</span>
            <div>
              <div className="text-xs text-red-600 font-medium">Closing Soon</div>
              <div className="text-sm font-bold text-red-900">{urgent.length} deadlines this month</div>
            </div>
          </div>
        )}
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-xl">🔄</span>
          <div>
            <div className="text-xs text-green-600 font-medium">Updated</div>
            <div className="text-sm font-bold text-green-900">Daily</div>
          </div>
        </div>
      </div>

      {/* PATHSYNC AI BANNER — BIG and unmissable */}
      <a
        href="https://pathsync-ai.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="block mb-8"
      >
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🤖</span>
                <span className="font-bold text-lg">Don&apos;t know which scholarship fits you?</span>
              </div>
              <p className="text-green-100 text-sm mb-3 leading-relaxed">
                PathSync AI has a conversation with you, finds your hidden achievements, 
                and matches you to scholarships you actually qualify for — then writes 
                your application letter and CV automatically.
              </p>
              <div className="flex flex-wrap gap-2">
                {['🎯 Smart matching', '✉️ Application letter', '📄 CV generator', '📅 Deadline tracker'].map(f => (
                  <span key={f} className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">{f}</span>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-6 py-3 rounded-xl text-sm hover:bg-green-50 transition-colors whitespace-nowrap">
                Try PathSync AI free →
              </div>
            </div>
          </div>
        </div>
      </a>

      {/* URGENT DEADLINES SECTION */}
      {urgent.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>⏰</span> Closing Soon — Apply Before It&apos;s Too Late
          </h2>
          <div className="flex flex-col gap-3">
            {urgent.slice(0, 3).map((s: Scholarship) => {
              const slug = s.slug || makeSlug(s.title, s.id)
              const days = Math.ceil((new Date(s.deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              return (
                <Link
                  key={s.id}
                  href={`/scholarships/${slug}`}
                  className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-5 py-4 hover:border-red-400 hover:shadow-sm transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-red-700 truncate transition-colors">{s.title}</p>
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
        <h2 className="text-lg font-bold text-gray-900">All Scholarships</h2>
        <span className="text-sm text-gray-500">{total} listings</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scholarships?.map((s: Scholarship) => {
          const slug = s.slug || makeSlug(s.title, s.id)
          const urgency = getDeadlineUrgency(s.deadline)
          return (
            <Link
              key={s.id}
              href={`/scholarships/${slug}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all group flex flex-col"
            >
              {/* Source + Level */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-blue-600 font-semibold uppercase tracking-wide">{s.source}</span>
                {s.level && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{s.level}</span>
                )}
              </div>

              {/* Title */}
              <h2 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug text-sm">
                {s.title}
              </h2>

              {/* Country */}
              <p className="text-xs text-gray-400 mb-2">🌍 {s.country}</p>

              {/* Description */}
              {s.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed flex-1">{s.description}</p>
              )}

              {/* Amount */}
              {s.amount && (
                <div className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-lg mb-2 inline-block w-fit">
                  💰 {s.amount}
                </div>
              )}

              {/* Deadline */}
              {s.deadline && (
                <p className={`text-xs font-medium mb-3 ${
                  urgency === 'urgent' ? 'text-red-600' :
                  urgency === 'soon' ? 'text-orange-500' : 'text-gray-500'
                }`}>
                  {urgency === 'urgent' ? '🔴' : urgency === 'soon' ? '🟡' : '📅'} Deadline: {s.deadline}
                </p>
              )}

              {/* CTA */}
              <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform inline-block">
                  View & Apply →
                </span>
                <span className="text-xs text-gray-300 group-hover:text-green-500 transition-colors">
                  🤖 AI match
                </span>
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
          className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-6 py-5 hover:bg-green-100 transition-colors"
        >
          <div>
            <div className="font-bold text-green-800 mb-1">🤖 Let PathSync AI find your perfect match</div>
            <div className="text-sm text-green-700">
              Tell it your course, CGPA, and what you do outside class — it finds scholarships you actually qualify for.
            </div>
          </div>
          <div className="text-green-700 font-semibold text-sm whitespace-nowrap ml-6 bg-green-200 px-4 py-2 rounded-lg flex-shrink-0">
            Try free →
          </div>
        </a>
      </div>
    </div>
  )
}
