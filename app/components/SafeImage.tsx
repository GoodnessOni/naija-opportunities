'use client'
export default function SafeImage({ src, alt, className }: { src: string, alt: string, className?: string }) {
  return (
    <img src={src} alt={alt} className={className} onError={(e) => { e.currentTarget.parentElement!.style.display = 'none' }} />
  )
}
