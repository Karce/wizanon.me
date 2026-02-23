import ToolCard from '../components/ToolCard'

const heroStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '3rem',
}

const taglineStyle: React.CSSProperties = {
  fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
  fontWeight: 700,
  marginBottom: '1rem',
  lineHeight: 1.3,
}

const goldText: React.CSSProperties = {
  color: 'var(--accent-gold)',
}

const subtitleStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '1.0625rem',
  maxWidth: '540px',
  margin: '0 auto',
  lineHeight: 1.6,
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '1.25rem',
}

const tools = [
  {
    title: 'Compound Interest Calculator',
    description: 'Calculate how your money grows over time with compound interest and regular contributions.',
    icon: '📈',
    to: '/compound-interest',
    available: true,
  },
  {
    title: 'Loan / Mortgage Calculator',
    description: 'Monthly payments, amortization schedule, and total interest for any loan.',
    icon: '🏠',
    to: '/loan-calculator',
    available: false,
  },
  {
    title: 'FIRE Calculator',
    description: 'Find out when you can reach financial independence and retire early.',
    icon: '🔥',
    to: '/fire-calculator',
    available: true,
  },
  {
    title: 'Inflation Adjuster',
    description: 'See what your money will be worth in the future after inflation.',
    icon: '💸',
    to: '/inflation-adjuster',
    available: false,
  },
  {
    title: 'Investment Comparison',
    description: 'Compare two investment scenarios side by side.',
    icon: '⚖️',
    to: '/investment-comparison',
    available: false,
  },
  {
    title: 'Savings Goal Calculator',
    description: 'Figure out how much to save each month to hit your target.',
    icon: '🎯',
    to: '/savings-goal',
    available: false,
  },
]

function Home() {
  return (
    <>
      <section style={heroStyle}>
        <h1 style={taglineStyle}>
          Financial tools that <span style={goldText}>mind their own business</span>
        </h1>
        <p style={subtitleStyle}>
          Privacy-respecting calculators that run entirely in your browser.
          No accounts, no tracking, no cookies. The wizard helps; the wizard asks nothing in return.
        </p>
      </section>
      <section style={gridStyle}>
        {tools.map((tool) => (
          <ToolCard key={tool.to} {...tool} />
        ))}
      </section>
    </>
  )
}

export default Home
