import { supabase } from './lib/supabase'

export default async function sitemap() {
  const baseUrl = 'https://www.naijaopportunities.live'

  const { data: jobs } = await supabase.from('jobs').select('short_id, title, created_at')
  const { data: scholarships } = await supabase.from('scholarships').select('short_id, title, created_at')

  function makeSlug(title: string, shortId: number) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) + '-' + shortId
  }

  const jobUrls = (jobs || []).map(job => ({
    url: `${baseUrl}/jobs/${makeSlug(job.title, job.short_id)}`,
    lastModified: job.created_at,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const scholarshipUrls = (scholarships || []).map(s => ({
    url: `${baseUrl}/scholarships/${makeSlug(s.title, s.short_id)}`,
    lastModified: s.created_at,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${baseUrl}/jobs`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/scholarships`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    ...jobUrls,
    ...scholarshipUrls,
  ]
}