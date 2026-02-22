import { Link } from 'react-router-dom'

interface ToolCardProps {
  title: string
  description: string
  icon: string
  to: string
  available: boolean
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '1.5rem',
  transition: 'all 0.2s',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
}

const iconStyle: React.CSSProperties = {
  fontSize: '2rem',
}

const titleStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
}

const descStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
}

const badgeStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  padding: '0.25rem 0.625rem',
  borderRadius: '999px',
  alignSelf: 'flex-start',
  fontWeight: 500,
}

function ToolCard({ title, description, icon, to, available }: ToolCardProps) {
  const card = (
    <div
      style={{
        ...cardStyle,
        cursor: available ? 'pointer' : 'default',
        opacity: available ? 1 : 0.6,
      }}
      onMouseEnter={(e) => {
        if (available) {
          e.currentTarget.style.borderColor = 'var(--accent-purple)'
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = 'var(--shadow)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <span style={iconStyle}>{icon}</span>
      <span style={titleStyle}>{title}</span>
      <span style={descStyle}>{description}</span>
      <span
        style={{
          ...badgeStyle,
          background: available ? 'rgba(139, 92, 246, 0.15)' : 'rgba(107, 100, 128, 0.15)',
          color: available ? 'var(--accent-purple)' : 'var(--text-muted)',
        }}
      >
        {available ? 'Available' : 'Coming Soon'}
      </span>
    </div>
  )

  if (!available) return card

  return (
    <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      {card}
    </Link>
  )
}

export default ToolCard
