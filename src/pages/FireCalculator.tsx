import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────

interface ChartPoint {
  age: number
  netWorth: number
  contributions: number
  fireNumber: number
}

interface FireTier {
  name: string
  emoji: string
  color: string
}

// ─── Helpers ─────────────────────────────────────────────────

const formatCurrency = (value: number): string =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

function getFireTier(annualExpenses: number): FireTier {
  if (annualExpenses <= 40_000) return { name: 'LeanFIRE', emoji: '🌱', color: '#4ade80' }
  if (annualExpenses <= 80_000) return { name: 'FIRE', emoji: '🔥', color: '#f59e0b' }
  if (annualExpenses <= 150_000) return { name: 'ChubbyFIRE', emoji: '🍔', color: '#fb923c' }
  return { name: 'FatFIRE', emoji: '👑', color: '#f472b6' }
}

function calculateCoastFire(
  fireNumber: number,
  currentAge: number,
  coastTargetAge: number,
  realReturn: number,
): number {
  const years = coastTargetAge - currentAge
  if (years <= 0) return fireNumber
  return fireNumber / Math.pow(1 + realReturn, years)
}

function simulate(
  currentAge: number,
  currentNetWorth: number,
  annualIncome: number,
  annualExpenses: number,
  retirementExpenses: number,
  investmentReturn: number,
  inflationRate: number,
  swr: number,
): { data: ChartPoint[]; fireAge: number | null; fireNumber: number } {
  const realReturn = (1 + investmentReturn / 100) / (1 + inflationRate / 100) - 1
  const fireNumber = retirementExpenses / (swr / 100)
  const annualSavings = annualIncome - annualExpenses
  const data: ChartPoint[] = []
  let netWorth = currentNetWorth
  let totalContributions = currentNetWorth
  let fireAge: number | null = null
  const maxAge = 80

  for (let age = currentAge; age <= maxAge; age++) {
    data.push({
      age,
      netWorth: Math.round(netWorth),
      contributions: Math.round(totalContributions),
      fireNumber: Math.round(fireNumber),
    })

    if (fireAge === null && netWorth >= fireNumber) {
      fireAge = age
    }

    // Grow portfolio, add savings (all in real/today's dollars)
    netWorth = netWorth * (1 + realReturn) + annualSavings
    totalContributions += annualSavings
  }

  return { data, fireAge, fireNumber }
}

// ─── Styles (matching existing patterns) ─────────────────────

const pageStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
}

const headingStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  marginBottom: '0.5rem',
}

const subheadingStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  marginBottom: '2rem',
  fontSize: '0.9375rem',
}

const formGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '1.25rem',
  marginBottom: '1.5rem',
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--text-secondary)',
  fontWeight: 500,
}

const resultsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '1rem',
  marginBottom: '2rem',
}

const resultCard: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '1.25rem',
  textAlign: 'center',
}

const resultLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.375rem',
}

const resultValue: React.CSSProperties = {
  fontSize: '1.375rem',
  fontWeight: 700,
}

const chartContainer: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '1.5rem 1rem 1rem',
  marginBottom: '2rem',
}

const chartTitle: React.CSSProperties = {
  fontSize: '0.9375rem',
  fontWeight: 600,
  marginBottom: '1rem',
  paddingLeft: '0.5rem',
}

const tierBadge = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  background: color + '20',
  color,
  border: `1px solid ${color}50`,
  borderRadius: '20px',
  padding: '0.25rem 0.75rem',
  fontSize: '0.8125rem',
  fontWeight: 600,
})

const sectionTitle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '1rem',
  marginTop: '0.5rem',
}

const infoBox: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '1.25rem',
  marginBottom: '2rem',
  fontSize: '0.875rem',
  lineHeight: 1.7,
  color: 'var(--text-secondary)',
}

// ─── Component ───────────────────────────────────────────────

function FireCalculator() {
  const [currentAge, setCurrentAge] = useState(30)
  const [annualIncome, setAnnualIncome] = useState(75000)
  const [annualExpenses, setAnnualExpenses] = useState(45000)
  const [retirementExpenses, setRetirementExpenses] = useState(40000)
  const [currentNetWorth, setCurrentNetWorth] = useState(50000)
  const [investmentReturn, setInvestmentReturn] = useState(7)
  const [inflationRate, setInflationRate] = useState(3)
  const [swr, setSwr] = useState(4)

  const { data, fireAge, fireNumber } = useMemo(
    () =>
      simulate(
        currentAge,
        currentNetWorth,
        annualIncome,
        annualExpenses,
        retirementExpenses,
        investmentReturn,
        inflationRate,
        swr,
      ),
    [currentAge, currentNetWorth, annualIncome, annualExpenses, retirementExpenses, investmentReturn, inflationRate, swr],
  )

  const realReturn = (1 + investmentReturn / 100) / (1 + inflationRate / 100) - 1
  const coastFireNumber = useMemo(
    () => calculateCoastFire(fireNumber, currentAge, 65, realReturn),
    [fireNumber, currentAge, realReturn],
  )

  const annualSavings = annualIncome - annualExpenses
  const savingsRate = annualIncome > 0 ? (annualSavings / annualIncome) * 100 : 0
  const yearsToFire = fireAge !== null ? fireAge - currentAge : null
  const tier = getFireTier(retirementExpenses)
  const monthlyPostFire = (fireNumber * (swr / 100)) / 12

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>FIRE Calculator</h1>
      <p style={subheadingStyle}>
        Find out when you can reach Financial Independence and Retire Early.
        All values are in today's dollars.
      </p>

      <div style={sectionTitle}>Your Finances</div>
      <div style={formGrid}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Current Age</label>
          <input
            type="number"
            min="16"
            max="80"
            step="1"
            value={currentAge}
            onChange={(e) => setCurrentAge(Number(e.target.value))}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Annual Take-Home Income ($)</label>
          <input
            type="number"
            min="0"
            step="1000"
            value={annualIncome}
            onChange={(e) => setAnnualIncome(Number(e.target.value))}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Annual Expenses ($)</label>
          <input
            type="number"
            min="0"
            step="1000"
            value={annualExpenses}
            onChange={(e) => setAnnualExpenses(Number(e.target.value))}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Retirement Annual Expenses ($)</label>
          <input
            type="number"
            min="0"
            step="1000"
            value={retirementExpenses}
            onChange={(e) => setRetirementExpenses(Number(e.target.value))}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Current Net Worth ($)</label>
          <input
            type="number"
            step="1000"
            value={currentNetWorth}
            onChange={(e) => setCurrentNetWorth(Number(e.target.value))}
          />
        </div>
      </div>

      <div style={sectionTitle}>Assumptions</div>
      <div style={formGrid}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Investment Return (%)</label>
          <input
            type="number"
            min="0"
            max="20"
            step="0.5"
            value={investmentReturn}
            onChange={(e) => setInvestmentReturn(Number(e.target.value))}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Inflation Rate (%)</label>
          <input
            type="number"
            min="0"
            max="15"
            step="0.5"
            value={inflationRate}
            onChange={(e) => setInflationRate(Number(e.target.value))}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Safe Withdrawal Rate (%)</label>
          <input
            type="number"
            min="2"
            max="6"
            step="0.25"
            value={swr}
            onChange={(e) => setSwr(Number(e.target.value))}
          />
        </div>
      </div>

      {/* ─── Results ─────────────────────────────────────── */}

      <div style={resultsGrid}>
        <div style={resultCard}>
          <div style={resultLabel}>Your FIRE Number</div>
          <div style={{ ...resultValue, color: 'var(--accent-gold)' }}>
            {formatCurrency(fireNumber)}
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <span style={tierBadge(tier.color)}>
              {tier.emoji} {tier.name}
            </span>
          </div>
        </div>
        <div style={resultCard}>
          <div style={resultLabel}>Years to FIRE</div>
          <div style={{ ...resultValue, color: yearsToFire !== null ? 'var(--accent-green)' : '#ef4444' }}>
            {yearsToFire !== null ? yearsToFire : '—'}
          </div>
          {fireAge !== null && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Age {fireAge}
            </div>
          )}
        </div>
        <div style={resultCard}>
          <div style={resultLabel}>Savings Rate</div>
          <div style={{ ...resultValue, color: savingsRate >= 50 ? 'var(--accent-green)' : savingsRate >= 20 ? 'var(--accent-gold)' : '#ef4444' }}>
            {savingsRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {formatCurrency(annualSavings)}/yr
          </div>
        </div>
        <div style={resultCard}>
          <div style={resultLabel}>CoastFIRE Number</div>
          <div style={{ ...resultValue, color: 'var(--accent-blue)' }}>
            {formatCurrency(coastFireNumber)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {currentNetWorth >= coastFireNumber ? '✅ Already coasting' : `Need ${formatCurrency(coastFireNumber - currentNetWorth)} more`}
          </div>
        </div>
        <div style={resultCard}>
          <div style={resultLabel}>Monthly Post-FIRE Income</div>
          <div style={{ ...resultValue, color: 'var(--accent-purple)' }}>
            {formatCurrency(monthlyPostFire)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            via {swr}% SWR
          </div>
        </div>
      </div>

      {/* ─── Chart ───────────────────────────────────────── */}

      <div style={chartContainer}>
        <div style={chartTitle}>Net Worth Projection (Today's Dollars)</div>
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-gold)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent-gold)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorContribs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="age"
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              label={{ value: 'Age', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 12 }}
            />
            <YAxis
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              tickFormatter={(v: number) =>
                v >= 1_000_000
                  ? `$${(v / 1_000_000).toFixed(1)}M`
                  : `$${(v / 1000).toFixed(0)}k`
              }
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
              }}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'netWorth'
                  ? 'Net Worth'
                  : name === 'contributions'
                  ? 'Total Contributions'
                  : 'FIRE Number',
              ]}
              labelFormatter={(label: number) => `Age ${label}`}
            />
            <Legend
              formatter={(value: string) =>
                value === 'netWorth'
                  ? 'Net Worth'
                  : value === 'contributions'
                  ? 'Contributions'
                  : 'FIRE Number'
              }
              wrapperStyle={{ fontSize: '0.8125rem' }}
            />
            <ReferenceLine
              y={fireNumber}
              stroke="#ef4444"
              strokeDasharray="8 4"
              strokeWidth={2}
              label={{
                value: `FIRE: ${formatCurrency(fireNumber)}`,
                position: 'right',
                fill: '#ef4444',
                fontSize: 12,
              }}
            />
            {fireAge !== null && (
              <ReferenceLine
                x={fireAge}
                stroke="var(--accent-green)"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{
                  value: `Age ${fireAge}`,
                  position: 'top',
                  fill: 'var(--accent-green)',
                  fontSize: 12,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="var(--accent-gold)"
              fillOpacity={1}
              fill="url(#colorNetWorth)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="contributions"
              stroke="var(--accent-blue)"
              fillOpacity={1}
              fill="url(#colorContribs)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ─── Explainer ───────────────────────────────────── */}

      <div style={infoBox}>
        <strong style={{ color: 'var(--text-primary)' }}>How is this calculated?</strong>
        <br /><br />
        Your <strong>FIRE number</strong> = Annual Retirement Expenses ÷ Safe Withdrawal Rate.
        This is the portfolio size needed so that withdrawals cover your living costs indefinitely.
        <br /><br />
        The <strong>4% Rule</strong> comes from the Trinity Study, which found that a 4% initial withdrawal rate
        (adjusted for inflation) had a ~95% success rate over 30 years with a balanced portfolio.
        For longer retirements (40–60 years), consider a more conservative 3.25–3.5% rate.
        <br /><br />
        <strong>CoastFIRE</strong> is the amount you need invested <em>today</em> such that compounding alone
        (with zero further contributions) reaches your FIRE number by age 65.
        <br /><br />
        All projections use <strong>real returns</strong> (investment return minus inflation) so every
        number shown is in today's purchasing power.
      </div>
    </div>
  )
}

export default FireCalculator
