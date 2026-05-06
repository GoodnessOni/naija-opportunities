export default function JobPlaceholder({ title }: { title: string }) {
  const colors = [
    { bg1: '#15803d', bg2: '#22c55e' },
    { bg1: '#065f46', bg2: '#10b981' },
    { bg1: '#166534', bg2: '#4ade80' },
    { bg1: '#14532d', bg2: '#16a34a' },
    { bg1: '#052e16', bg2: '#15803d' },
  ]

  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const { bg1, bg2 } = colors[hash % colors.length]

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: `linear-gradient(135deg, ${bg1}, ${bg2})`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 500,
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        marginBottom: '8px',
      }}>
        NaijaOpportunities
      </div>
      <div style={{
        fontSize: '13px',
        fontWeight: 500,
        color: '#fff',
        textAlign: 'center',
        lineHeight: 1.4,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '11px',
        color: 'rgba(255,255,255,0.6)',
        marginTop: '8px',
      }}>
        Latest Jobs in Nigeria
      </div>
    </div>
  )
}