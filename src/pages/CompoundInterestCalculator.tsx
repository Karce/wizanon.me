import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface ChartPoint {
  year: number
  totalContributions: number
  totalValue: number
  interestEarned: number
}

export const frequencies: Record<string, number> = {
  annually: 1,
  semiannually: 2,
  quarterly: 4,
  monthly: 12,
  daily: 365,
}

const contributionFrequencies: Record<string, { label: string; perYear: number }> = {
  weekly: { label: 'Weekly', perYear: 52 },
  biweekly: { label: 'Biweekly', perYear: 26 },
  monthly: { label: 'Monthly', perYear: 12 },
  quarterly: { label: 'Quarterly', perYear: 4 },
  annually: { label: 'Annual', perYear: 1 },
}

export function calculate(
  principal: number,
  annualRate: number,
  years: number,
  contributionAmount: number,
  contributionsPerYear: number,
  compoundingFrequency: number,
): ChartPoint[] {
  const data: ChartPoint[] = []
  const rate = annualRate / 100

  for (let year = 0; year <= years; year++) {
    const n = compoundingFrequency
    const t = year
    const r = rate

    // Future value of principal
    const fvPrincipal = principal * Math.pow(1 + r / n, n * t)

    // Future value of periodic contributions (annuity)
    // Convert contribution to per-compounding-period amount
    let fvContributions = 0
    if (contributionAmount > 0 && r > 0) {
      const periodicRate = r / n
      const totalPeriods = n * t
      const contributionPerPeriod = contributionAmount * (contributionsPerYear / n)
      fvContributions =
        contributionPerPeriod *
        ((Math.pow(1 + periodicRate, totalPeriods) - 1) / periodicRate)
    } else if (contributionAmount > 0 && r === 0) {
      fvContributions = contributionAmount * contributionsPerYear * t
    }

    const totalValue = fvPrincipal + fvContributions
    const totalContributions = principal + contributionAmount * contributionsPerYear * year

    data.push({
      year,
      totalContributions: Math.round(totalContributions * 100) / 100,
      totalValue: Math.round(totalValue * 100) / 100,
      interestEarned: Math.round((totalValue - totalContributions) * 100) / 100,
    })
  }

  return data
}

const formatCurrency = (value: number): string =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

function parseNum(s: string, fallback = 0): number {
  const n = parseFloat(s)
  return isNaN(n) ? fallback : n
}

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
}

const chartTitle: React.CSSProperties = {
  fontSize: '0.9375rem',
  fontWeight: 600,
  marginBottom: '1rem',
  paddingLeft: '0.5rem',
}

function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState('10000')
  const [rate, setRate] = useState('7')
  const [years, setYears] = useState('20')
  const [contributionAmount, setContributionAmount] = useState('500')
  const [contributionFreq, setContributionFreq] = useState('monthly')
  const [frequency, setFrequency] = useState('annually')

  const data = useMemo(
    () =>
      calculate(
        parseNum(principal),
        parseNum(rate),
        Math.max(1, Math.round(parseNum(years, 1))),
        parseNum(contributionAmount),
        contributionFrequencies[contributionFreq].perYear,
        frequencies[frequency],
      ),
    [principal, rate, years, contributionAmount, contributionFreq, frequency],
  )

  const final = data[data.length - 1]

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Compound Interest Calculator</h1>
      <p style={subheadingStyle}>
        See how your investments grow over time with the power of compound interest.
      </p>

      <div style={formGrid}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Initial Investment ($)</label>
          <input
            type="number"
            min="0"
            step="100"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Annual Interest Rate (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Time Period (years)</label>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={years}
            onChange={(e) => setYears(e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>
            {contributionFrequencies[contributionFreq].label} Contribution ($)
          </label>
          <input
            type="number"
            min="0"
            step="50"
            value={contributionAmount}
            onChange={(e) => setContributionAmount(e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Contribution Frequency</label>
          <select value={contributionFreq} onChange={(e) => setContributionFreq(e.target.value)}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annually">Annually</option>
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Compounding Frequency</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="annually">Annually</option>
            <option value="semiannually">Semi-annually</option>
            <option value="quarterly">Quarterly</option>
            <option value="monthly">Monthly</option>
            <option value="daily">Daily</option>
          </select>
        </div>
      </div>

      <div style={resultsGrid}>
        <div style={resultCard}>
          <div style={resultLabel}>Final Amount</div>
          <div style={{ ...resultValue, color: 'var(--accent-gold)' }}>
            {formatCurrency(final.totalValue)}
          </div>
        </div>
        <div style={resultCard}>
          <div style={resultLabel}>Total Contributions</div>
          <div style={{ ...resultValue, color: 'var(--accent-blue)' }}>
            {formatCurrency(final.totalContributions)}
          </div>
        </div>
        <div style={resultCard}>
          <div style={resultLabel}>Interest Earned</div>
          <div style={{ ...resultValue, color: 'var(--accent-green)' }}>
            {formatCurrency(final.interestEarned)}
          </div>
        </div>
      </div>

      <div style={chartContainer}>
        <div style={chartTitle}>Growth Over Time</div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-gold)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent-gold)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorContributions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="year"
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              label={{ value: 'Year', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 12 }}
            />
            <YAxis
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
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
                name === 'totalValue' ? 'Total Value' : 'Contributions',
              ]}
              labelFormatter={(label: number) => `Year ${label}`}
            />
            <Legend
              formatter={(value: string) =>
                value === 'totalValue' ? 'Total Value' : 'Contributions'
              }
              wrapperStyle={{ fontSize: '0.8125rem' }}
            />
            <Area
              type="monotone"
              dataKey="totalValue"
              stroke="var(--accent-gold)"
              fillOpacity={1}
              fill="url(#colorValue)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="totalContributions"
              stroke="var(--accent-blue)"
              fillOpacity={1}
              fill="url(#colorContributions)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default CompoundInterestCalculator
