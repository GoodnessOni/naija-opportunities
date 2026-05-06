export default function ScholarshipPlaceholder({ title }: { title: string }) {
  const colors = [
    { bg1: '#185FA5', bg2: '#378ADD' },
    { bg1: '#3C3489', bg2: '#7F77DD' },
    { bg1: '#0F6E56', bg2: '#1D9E75' },
    { bg1: '#993556', bg2: '#D4537E' },
    { bg1: '#854F0B', bg2: '#BA7517' },
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
    </div>
  )
}