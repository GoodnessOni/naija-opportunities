'use client'
import { useState } from 'react'
import ScholarshipPlaceholder from './ScholarshipPlaceholder'
import JobPlaceholder from './JobPlaceholder'

export default function SafeImage({ 
  src, alt, className, type = 'job', title = ''
}: { 
  src: string
  alt: string
  className?: string
  type?: 'job' | 'scholarship'
  title?: string
}) {
  const [failed, setFailed] = useState(false)

  if (failed || !src || src === 'EMPTY' || src === 'NULL') {
    if (type === 'scholarship') return <ScholarshipPlaceholder title={title || alt} />
    return <JobPlaceholder title={title || alt} />
  }

  return (
    <img
      src={`/api/image-proxy?url=${encodeURIComponent(src)}`}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}