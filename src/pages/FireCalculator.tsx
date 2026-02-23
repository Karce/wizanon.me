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

interface IncomeStream {
  id: number
  name: string
  monthlyAmount: number
  startAge: number
  endAge: number | null // null = lifetime
}

interface OneTimeExpense {
  id: number
  name: string
  amount: number
  age: number
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

function getHealthcareCost(
  age: number,
  enabled: boolean,
  preMedicareCost: number,
  postMedicareCost: number,
): number {
  if (!enabled) return 0
  return age < 65 ? preMedicareCost : postMedicareCost
}

function getIncomeAtAge(streams: IncomeStream[], age: number): number {
  let total = 0
  for (const stream of streams) {
    if (age >= stream.startAge && (stream.endAge === null || age <= stream.endAge)) {
      total += stream.monthlyAmount * 12
    }
  }
  return total
}

function getOneTimeExpenseAtAge(expenses: OneTimeExpense[], age: number): number {
  let total = 0
  for (const exp of expenses) {
    if (exp.age === age) {
      total += exp.amount
    }
  }
  return total
}

interface SimResult {
  data: ChartPoint[]
  fireAge: number | null
  fireNumber: number
  effectiveFireNumber: number
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
  incomeStreams: IncomeStream[],
  oneTimeExpenses: OneTimeExpense[],
  healthcareEnabled: boolean,
  preMedicareCost: number,
  postMedicareCost: number,
): SimResult {
  const realReturn = (1 + investmentReturn / 100) / (1 + inflationRate / 100) - 1
  const baseFireNumber = retirementExpenses / (swr / 100)

  // Effective FIRE number accounts for guaranteed income at retirement
  // We use the largest income stream overlap with early retirement (age 67 for SS)
  // This is a simplified "steady state" — the chart does full year-by-year
  const ssIncome = getIncomeAtAge(incomeStreams, 67)
  const effectiveRetirementExpenses = Math.max(0, retirementExpenses - ssIncome)
  const effectiveFireNumber = effectiveRetirementExpenses / (swr / 100)

  const annualSavings = annualIncome - annualExpenses
  const data: ChartPoint[] = []
  let netWorth = currentNetWorth
  let totalContributions = currentNetWorth
  let fireAge: number | null = null
  let retired = false
  const maxAge = 85

  for (let age = currentAge; age <= maxAge; age++) {
    data.push({
      age,
      netWorth: Math.round(netWorth),
      contributions: Math.round(totalContributions),
      fireNumber: Math.round(baseFireNumber),
    })

    // Check FIRE status: net worth covers expenses minus income streams
    const incomeAtAge = getIncomeAtAge(incomeStreams, age)
    const healthcareCost = getHealthcareCost(age, healthcareEnabled, preMedicareCost, postMedicareCost)
    const totalRetirementExpenses = retirementExpenses + healthcareCost
    const netExpenses = Math.max(0, totalRetirementExpenses - incomeAtAge)
    const dynamicFireNumber = swr > 0 ? netExpenses / (swr / 100) : 0

    if (fireAge === null && netWorth >= dynamicFireNumber && age > currentAge) {
      fireAge = age
      retired = true
    }

    // One-time expenses hit the portfolio directly
    const oneTimeCost = getOneTimeExpenseAtAge(oneTimeExpenses, age)
    netWorth -= oneTimeCost

    if (!retired) {
      // Pre-retirement: grow portfolio + add savings
      netWorth = netWorth * (1 + realReturn) + annualSavings
      totalContributions += annualSavings
    } else {
      // Post-retirement: grow portfolio, withdraw expenses, add income streams
      const withdrawal = totalRetirementExpenses - incomeAtAge
      netWorth = netWorth * (1 + realReturn) - Math.max(0, withdrawal)
    }
  }

  return { data, fireAge, fireNumber: baseFireNumber, effectiveFireNumber }
}

// ─── Styles ──────────────────────────────────────────────────

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

const toggleRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginBottom: '1rem',
}

const toggleSwitch: React.CSSProperties = {
  position: 'relative',
  width: '44px',
  height: '24px',
  flexShrink: 0,
  cursor: 'pointer',
}

const toggleTrack = (active: boolean): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  borderRadius: '12px',
  background: active ? 'var(--accent-purple)' : 'var(--bg-input)',
  border: `1px solid ${active ? 'var(--accent-purple)' : 'var(--border)'}`,
  transition: 'all 0.2s',
})

const toggleKnob = (active: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: '3px',
  left: active ? '22px' : '3px',
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  background: 'var(--text-primary)',
  transition: 'left 0.2s',
})

const toggleLabel: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--text-primary)',
  fontWeight: 500,
}

const collapsibleContent = (open: boolean): React.CSSProperties => ({
  maxHeight: open ? '600px' : '0',
  overflow: 'hidden',
  transition: 'max-height 0.3s ease',
})

const itemRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '0.75rem',
  flexWrap: 'wrap',
}

const itemInput: React.CSSProperties = {
  flex: '1 1 120px',
  minWidth: '80px',
}

const removeBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#ef4444',
  border: '1px solid #ef444440',
  borderRadius: '6px',
  padding: '0.5rem 0.75rem',
  fontSize: '0.8125rem',
  cursor: 'pointer',
  flexShrink: 0,
}

const addBtn: React.CSSProperties = {
  background: 'var(--bg-input)',
  color: 'var(--accent-purple)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.5rem 1rem',
  fontSize: '0.8125rem',
  fontWeight: 500,
  cursor: 'pointer',
  marginBottom: '1.5rem',
}

const hintText: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  marginTop: '-0.75rem',
  marginBottom: '1rem',
  lineHeight: 1.5,
}

// ─── Component ───────────────────────────────────────────────

let nextStreamId = 1
let nextExpenseId = 1

function FireCalculator() {
  // Core inputs
  const [currentAge, setCurrentAge] = useState(30)
  const [annualIncome, setAnnualIncome] = useState(75000)
  const [annualExpenses, setAnnualExpenses] = useState(45000)
  const [retirementExpenses, setRetirementExpenses] = useState(40000)
  const [currentNetWorth, setCurrentNetWorth] = useState(50000)
  const [investmentReturn, setInvestmentReturn] = useState(7)
  const [inflationRate, setInflationRate] = useState(3)
  const [swr, setSwr] = useState(4)

  // Phase 2: Social Security & income streams
  const [ssEnabled, setSsEnabled] = useState(false)
  const [ssMonthly, setSsMonthly] = useState(2000)
  const [ssStartAge, setSsStartAge] = useState(67)

  // Phase 2: Additional income streams (pensions, etc.)
  const [incomeStreams, setIncomeStreams] = useState<IncomeStream[]>([])

  // Phase 2: Healthcare
  const [healthcareEnabled, setHealthcareEnabled] = useState(false)
  const [preMedicareCost, setPreMedicareCost] = useState(12000)
  const [postMedicareCost, setPostMedicareCost] = useState(3600)

  // Phase 2: One-time expenses
  const [oneTimeExpenses, setOneTimeExpenses] = useState<OneTimeExpense[]>([])

  // Build full income streams list (SS + custom)
  const allIncomeStreams = useMemo(() => {
    const streams: IncomeStream[] = [...incomeStreams]
    if (ssEnabled) {
      streams.push({
        id: -1,
        name: 'Social Security',
        monthlyAmount: ssMonthly,
        startAge: ssStartAge,
        endAge: null,
      })
    }
    return streams
  }, [ssEnabled, ssMonthly, ssStartAge, incomeStreams])

  const { data, fireAge, fireNumber, effectiveFireNumber } = useMemo(
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
        allIncomeStreams,
        oneTimeExpenses,
        healthcareEnabled,
        preMedicareCost,
        postMedicareCost,
      ),
    [
      currentAge, currentNetWorth, annualIncome, annualExpenses,
      retirementExpenses, investmentReturn, inflationRate, swr,
      allIncomeStreams, oneTimeExpenses, healthcareEnabled,
      preMedicareCost, postMedicareCost,
    ],
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

  // Income stream management
  const addIncomeStream = () => {
    setIncomeStreams((prev) => [
      ...prev,
      { id: nextStreamId++, name: 'Pension', monthlyAmount: 1000, startAge: 60, endAge: null },
    ])
  }
  const removeIncomeStream = (id: number) => {
    setIncomeStreams((prev) => prev.filter((s) => s.id !== id))
  }
  const updateIncomeStream = (id: number, field: keyof IncomeStream, value: string | number | null) => {
    setIncomeStreams((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    )
  }

  // One-time expense management
  const addOneTimeExpense = () => {
    setOneTimeExpenses((prev) => [
      ...prev,
      { id: nextExpenseId++, name: 'Expense', amount: 50000, age: 45 },
    ])
  }
  const removeOneTimeExpense = (id: number) => {
    setOneTimeExpenses((prev) => prev.filter((e) => e.id !== id))
  }
  const updateOneTimeExpense = (id: number, field: keyof OneTimeExpense, value: string | number) => {
    setOneTimeExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    )
  }

  const ssSavings = ssEnabled ? (ssMonthly * 12) / (swr / 100) : 0

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>FIRE Calculator</h1>
      <p style={subheadingStyle}>
        Find out when you can reach Financial Independence and Retire Early.
        All values are in today's dollars.
      </p>

      {/* ─── Core Inputs ─────────────────────────────────── */}

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

      {/* ─── Social Security ─────────────────────────────── */}

      <div style={sectionTitle}>Social Security</div>
      <div style={toggleRow}>
        <div style={toggleSwitch} onClick={() => setSsEnabled(!ssEnabled)}>
          <div style={toggleTrack(ssEnabled)} />
          <div style={toggleKnob(ssEnabled)} />
        </div>
        <span style={toggleLabel}>Include Social Security</span>
      </div>
      <div style={collapsibleContent(ssEnabled)}>
        <div style={hintText}>
          Check your estimated benefit at <a href="https://www.ssa.gov/myaccount/" target="_blank" rel="noopener noreferrer">ssa.gov/myaccount</a>.
          Age 62 = reduced (~30%), 67 = full, 70 = maximum (~24% bonus).
        </div>
        <div style={formGrid}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Monthly Benefit ($)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={ssMonthly}
              onChange={(e) => setSsMonthly(Number(e.target.value))}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Start Age</label>
            <select value={ssStartAge} onChange={(e) => setSsStartAge(Number(e.target.value))}>
              <option value={62}>62 (Reduced)</option>
              <option value={67}>67 (Full Retirement)</option>
              <option value={70}>70 (Maximum)</option>
            </select>
          </div>
        </div>
        {ssEnabled && (
          <div style={{ ...infoBox, marginTop: '0' }}>
            Social Security at {formatCurrency(ssMonthly)}/mo replaces{' '}
            <strong style={{ color: 'var(--accent-green)' }}>{formatCurrency(ssSavings)}</strong>{' '}
            of portfolio at {swr}% SWR. Your effective FIRE number with SS:{' '}
            <strong style={{ color: 'var(--accent-gold)' }}>{formatCurrency(effectiveFireNumber)}</strong>
          </div>
        )}
      </div>

      {/* ─── Additional Income Streams ───────────────────── */}

      <div style={sectionTitle}>Additional Income Streams</div>
      <div style={hintText}>
        Pensions, rental income, annuities, or any guaranteed income in retirement.
      </div>
      {incomeStreams.map((stream) => (
        <div key={stream.id} style={itemRow}>
          <div style={itemInput}>
            <input
              type="text"
              placeholder="Name"
              value={stream.name}
              onChange={(e) => updateIncomeStream(stream.id, 'name', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: '0 0 110px' }}>
            <input
              type="number"
              placeholder="$/mo"
              min="0"
              step="100"
              value={stream.monthlyAmount}
              onChange={(e) => updateIncomeStream(stream.id, 'monthlyAmount', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: '0 0 70px' }}>
            <input
              type="number"
              placeholder="From"
              min="16"
              max="100"
              value={stream.startAge}
              onChange={(e) => updateIncomeStream(stream.id, 'startAge', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: '0 0 70px' }}>
            <input
              type="number"
              placeholder="To"
              min="16"
              max="100"
              value={stream.endAge ?? ''}
              onChange={(e) =>
                updateIncomeStream(
                  stream.id,
                  'endAge',
                  e.target.value === '' ? null : Number(e.target.value),
                )
              }
              style={{ width: '100%' }}
            />
          </div>
          <button style={removeBtn} onClick={() => removeIncomeStream(stream.id)}>✕</button>
        </div>
      ))}
      <button style={addBtn} onClick={addIncomeStream}>+ Add Income Stream</button>

      {/* ─── Healthcare ──────────────────────────────────── */}

      <div style={sectionTitle}>Healthcare Costs</div>
      <div style={toggleRow}>
        <div style={toggleSwitch} onClick={() => setHealthcareEnabled(!healthcareEnabled)}>
          <div style={toggleTrack(healthcareEnabled)} />
          <div style={toggleKnob(healthcareEnabled)} />
        </div>
        <span style={toggleLabel}>Model Healthcare Costs</span>
      </div>
      <div style={collapsibleContent(healthcareEnabled)}>
        <div style={hintText}>
          Pre-Medicare (before 65): ACA marketplace plans typically $6,000–$18,000/yr per person.
          Post-Medicare (65+): ~$2,400–$6,000/yr including supplements.
        </div>
        <div style={formGrid}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Annual Cost Pre-65 ($)</label>
            <input
              type="number"
              min="0"
              step="500"
              value={preMedicareCost}
              onChange={(e) => setPreMedicareCost(Number(e.target.value))}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Annual Cost 65+ ($)</label>
            <input
              type="number"
              min="0"
              step="500"
              value={postMedicareCost}
              onChange={(e) => setPostMedicareCost(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* ─── One-Time Expenses ───────────────────────────── */}

      <div style={sectionTitle}>One-Time Expenses</div>
      <div style={hintText}>
        Mortgage payoff, children's college tuition, large purchases, or other lump sums.
      </div>
      {oneTimeExpenses.map((exp) => (
        <div key={exp.id} style={itemRow}>
          <div style={itemInput}>
            <input
              type="text"
              placeholder="Name"
              value={exp.name}
              onChange={(e) => updateOneTimeExpense(exp.id, 'name', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <input
              type="number"
              placeholder="Amount"
              min="0"
              step="1000"
              value={exp.amount}
              onChange={(e) => updateOneTimeExpense(exp.id, 'amount', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: '0 0 70px' }}>
            <input
              type="number"
              placeholder="Age"
              min="16"
              max="100"
              value={exp.age}
              onChange={(e) => updateOneTimeExpense(exp.id, 'age', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <button style={removeBtn} onClick={() => removeOneTimeExpense(exp.id)}>✕</button>
        </div>
      ))}
      <button style={addBtn} onClick={addOneTimeExpense}>+ Add One-Time Expense</button>

      {/* ─── Results ─────────────────────────────────────── */}

      <div style={{ ...sectionTitle, marginTop: '1rem' }}>Results</div>
      <div style={resultsGrid}>
        <div style={resultCard}>
          <div style={resultLabel}>Your FIRE Number</div>
          <div style={{ ...resultValue, color: 'var(--accent-gold)' }}>
            {formatCurrency(fireNumber)}
          </div>
          {ssEnabled && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {formatCurrency(effectiveFireNumber)} with SS
            </div>
          )}
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
        {healthcareEnabled && (
          <div style={resultCard}>
            <div style={resultLabel}>Healthcare Gap</div>
            <div style={{ ...resultValue, color: '#f59e0b' }}>
              {formatCurrency(preMedicareCost - postMedicareCost)}/yr
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              extra cost before 65
            </div>
          </div>
        )}
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
        <strong>Social Security</strong> reduces your effective FIRE number by replacing a portion of
        your required withdrawals. At {swr}% SWR, every $1,000/mo of SS income replaces{' '}
        {formatCurrency(12000 / (swr / 100))} of portfolio. The calculator dynamically adjusts
        the FIRE threshold based on your age — before SS kicks in, you need the full amount;
        after, you need less.
        <br /><br />
        <strong>Healthcare</strong> is the #1 underestimated expense for early retirees. Before Medicare at 65,
        ACA marketplace plans can cost $6,000–$18,000+/yr. After 65, Medicare plus supplements typically
        run $2,400–$6,000/yr. This calculator adds healthcare costs on top of your retirement expenses.
        <br /><br />
        All projections use <strong>real returns</strong> (investment return minus inflation) so every
        number shown is in today's purchasing power.
      </div>
    </div>
  )
}

export default FireCalculator
