import { Link, Outlet } from 'react-router-dom'

const headerStyle: React.CSSProperties = {
  padding: '1rem 1.5rem',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg-secondary)',
}

const navStyle: React.CSSProperties = {
  maxWidth: '960px',
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const logoStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

const goldSpan: React.CSSProperties = {
  color: 'var(--accent-gold)',
}

const mainStyle: React.CSSProperties = {
  flex: 1,
  maxWidth: '960px',
  margin: '0 auto',
  padding: '2rem 1.5rem',
  width: '100%',
}

const footerStyle: React.CSSProperties = {
  padding: '1.5rem',
  borderTop: '1px solid var(--border)',
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: '0.875rem',
}

function Layout() {
  return (
    <>
      <header style={headerStyle}>
        <nav style={navStyle}>
          <Link to="/" style={{ ...logoStyle, textDecoration: 'none' }}>
            <span role="img" aria-label="wizard">🧙</span>
            <span>Wiz<span style={goldSpan}>anon</span></span>
          </Link>
          <Link to="/" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Tools
          </Link>
        </nav>
      </header>
      <main style={mainStyle}>
        <Outlet />
      </main>
      <footer style={footerStyle}>
        🧙‍♂️ No cookies. No tracking. No accounts. Just math.
      </footer>
    </>
  )
}

export default Layout
