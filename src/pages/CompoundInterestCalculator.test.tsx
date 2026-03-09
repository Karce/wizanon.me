/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CompoundInterestCalculator, {
  calculate,
  frequencies,
} from './CompoundInterestCalculator'

// Mock ResizeObserver which recharts needs but jsdom doesn't provide
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Legend: () => null,
}))

// ---------------------------------------------------------------------------
// Pure calculate() logic tests
// ---------------------------------------------------------------------------

describe('calculate() – data structure', () => {
  it('returns year 0 through year N inclusive (N+1 points)', () => {
    const data = calculate(1000, 7, 5, 0, 12)
    expect(data).toHaveLength(6)
    expect(data[0].year).toBe(0)
    expect(data[5].year).toBe(5)
  })

  it('year 0 equals initial state regardless of rate or contributions', () => {
    const data = calculate(5000, 10, 10, 200, 12)
    expect(data[0]).toEqual({
      year: 0,
      totalContributions: 5000,
      totalValue: 5000,
      interestEarned: 0,
    })
  })
})

describe('calculate() – principal only (no contributions)', () => {
  it('annual compounding 10% for 1 year: 1000 → 1100', () => {
    const result = calculate(1000, 10, 1, 0, 1)[1]
    expect(result.totalValue).toBe(1100)
    expect(result.totalContributions).toBe(1000)
    expect(result.interestEarned).toBe(100)
  })

  it('monthly compounding 12% for 1 year: 1000 → ~1126.83', () => {
    // (1 + 0.12/12)^12 = 1.01^12 ≈ 1.126825030
    const result = calculate(1000, 12, 1, 0, 12)[1]
    expect(result.totalValue).toBeCloseTo(1126.83, 1)
    expect(result.totalContributions).toBe(1000)
  })

  it('quarterly compounding 8% for 1 year: 1000 → ~1082.43', () => {
    // (1 + 0.08/4)^4 = (1.02)^4 = 1.08243216
    const result = calculate(1000, 8, 1, 0, 4)[1]
    expect(result.totalValue).toBeCloseTo(1082.43, 1)
    expect(result.interestEarned).toBeCloseTo(82.43, 1)
  })

  it('semi-annual compounding 10% for 1 year: 1000 → ~1102.5', () => {
    // (1 + 0.1/2)^2 = (1.05)^2 = 1.1025
    const result = calculate(1000, 10, 1, 0, 2)[1]
    expect(result.totalValue).toBeCloseTo(1102.5, 1)
  })

  it('daily compounding 6% for 1 year: ~1061.83', () => {
    // (1 + 0.06/365)^365 ≈ 1.0618313
    const result = calculate(1000, 6, 1, 0, 365)[1]
    expect(result.totalValue).toBeCloseTo(1061.83, 1)
  })
})

describe('calculate() – zero rate edge cases', () => {
  it('zero rate, no contributions: principal stays constant', () => {
    const data = calculate(1000, 0, 5, 0, 12)
    for (const point of data) {
      expect(point.totalValue).toBe(1000)
      expect(point.interestEarned).toBe(0)
    }
  })

  it('zero rate with contributions: linear growth, no interest', () => {
    // 100/mo × 12 × 3 years = 3600 contributions
    const result = calculate(1000, 0, 3, 100, 12)[3]
    expect(result.totalContributions).toBe(4600)   // 1000 + 3600
    expect(result.totalValue).toBe(4600)
    expect(result.interestEarned).toBe(0)
  })
})

describe('calculate() – zero principal edge cases', () => {
  it('zero principal, no contributions, any rate: always zero', () => {
    const result = calculate(0, 10, 5, 0, 12)[5]
    expect(result.totalValue).toBe(0)
    expect(result.totalContributions).toBe(0)
    expect(result.interestEarned).toBe(0)
  })

  it('zero principal with contributions earns interest correctly', () => {
    // 2 years, annually, 10%, $100/mo contribution
    // contributionPerPeriod = 100 * 12 = 1200
    // fvContributions = 1200 * ((1.1)^2 - 1) / 0.1 = 1200 * 2.1 = 2520
    // totalContributions = 100 * 12 * 2 = 2400
    const result = calculate(0, 10, 2, 100, 1)[2]
    expect(result.totalValue).toBeCloseTo(2520, 1)
    expect(result.totalContributions).toBe(2400)
    expect(result.interestEarned).toBeCloseTo(120, 1)
  })
})

describe('calculate() – zero contribution', () => {
  it('zero contribution: only principal compounds', () => {
    const withContrib = calculate(1000, 7, 10, 100, 12)[10]
    const noContrib = calculate(1000, 7, 10, 0, 12)[10]
    expect(noContrib.totalValue).toBeLessThan(withContrib.totalValue)
    expect(noContrib.totalContributions).toBe(1000)
  })
})

describe('calculate() – compounding frequency effects', () => {
  it('higher compounding frequency yields higher final value', () => {
    const annually = calculate(1000, 10, 5, 0, frequencies.annually)[5].totalValue
    const quarterly = calculate(1000, 10, 5, 0, frequencies.quarterly)[5].totalValue
    const monthly = calculate(1000, 10, 5, 0, frequencies.monthly)[5].totalValue
    const daily = calculate(1000, 10, 5, 0, frequencies.daily)[5].totalValue

    expect(annually).toBeLessThan(quarterly)
    expect(quarterly).toBeLessThan(monthly)
    expect(monthly).toBeLessThan(daily)
  })

  it('annually vs monthly compounding produce measurably different results', () => {
    const annually = calculate(10000, 8, 20, 0, 1)[20].totalValue
    const monthly = calculate(10000, 8, 20, 0, 12)[20].totalValue
    expect(monthly).toBeGreaterThan(annually)
    // monthly should be noticeably higher (several hundred dollars for $10k)
    expect(monthly - annually).toBeGreaterThan(100)
  })

  it('semi-annual compounding result is between annual and quarterly', () => {
    const annually = calculate(1000, 10, 1, 0, 1)[1].totalValue
    const semiannually = calculate(1000, 10, 1, 0, 2)[1].totalValue
    const quarterly = calculate(1000, 10, 1, 0, 4)[1].totalValue
    expect(semiannually).toBeGreaterThan(annually)
    expect(semiannually).toBeLessThan(quarterly)
  })
})

describe('calculate() – contribution per-period scaling', () => {
  it('annual compounding scales monthly contribution to annual', () => {
    // With annual compounding, 1 period = 1 year
    // contributionPerPeriod = 100 * (12/1) = 1200
    // Year 1: 1200 contributions arrived at end of period → no interest growth yet
    // (annuity-immediate: payment at end of each period)
    const result = calculate(0, 10, 1, 100, 1)[1]
    expect(result.totalContributions).toBe(1200)
    expect(result.totalValue).toBeCloseTo(1200, 0)
  })

  it('quarterly compounding: each quarter receives 3 months of contributions', () => {
    // contributionPerPeriod = 100 * (12/4) = 300
    const result = calculate(0, 10, 2, 100, 4)[2]
    expect(result.totalContributions).toBe(2400)
    expect(result.totalValue).toBeGreaterThan(2400) // earns some interest
  })

  it('different compounding frequencies produce different results for same contribution', () => {
    const annually = calculate(0, 8, 10, 200, frequencies.annually)[10].totalValue
    const quarterly = calculate(0, 8, 10, 200, frequencies.quarterly)[10].totalValue
    const monthly = calculate(0, 8, 10, 200, frequencies.monthly)[10].totalValue

    expect(annually).not.toBe(quarterly)
    expect(quarterly).not.toBe(monthly)
  })
})

describe('calculate() – large numbers', () => {
  it('handles large principal without NaN or Infinity', () => {
    const result = calculate(1_000_000, 7, 30, 10_000, 12)[30]
    expect(Number.isFinite(result.totalValue)).toBe(true)
    expect(Number.isNaN(result.totalValue)).toBe(false)
    expect(result.totalValue).toBeGreaterThan(1_000_000)
  })
})

describe('calculate() – single year', () => {
  it('returns exactly 2 data points for 1 year', () => {
    const data = calculate(5000, 5, 1, 200, 4)
    expect(data).toHaveLength(2)
    expect(data[0].year).toBe(0)
    expect(data[1].year).toBe(1)
  })
})

describe('calculate() – totalContributions formula', () => {
  it('tracks principal + monthly contributions * months elapsed', () => {
    const data = calculate(500, 7, 3, 100, 12)
    expect(data[0].totalContributions).toBe(500)
    expect(data[1].totalContributions).toBe(1700)   // 500 + 100*12
    expect(data[2].totalContributions).toBe(2900)   // 500 + 100*24
    expect(data[3].totalContributions).toBe(4100)   // 500 + 100*36
  })
})

// ---------------------------------------------------------------------------
// frequencies constant tests
// ---------------------------------------------------------------------------

describe('frequencies constant', () => {
  it('has correct multipliers for all options', () => {
    expect(frequencies.annually).toBe(1)
    expect(frequencies.semiannually).toBe(2)
    expect(frequencies.quarterly).toBe(4)
    expect(frequencies.monthly).toBe(12)
    expect(frequencies.daily).toBe(365)
  })
})

// ---------------------------------------------------------------------------
// Component rendering tests
// ---------------------------------------------------------------------------

describe('CompoundInterestCalculator – rendering', () => {
  beforeEach(() => {
    render(<CompoundInterestCalculator />)
  })

  it('renders the page heading', () => {
    expect(screen.getByText('Compound Interest Calculator')).toBeInTheDocument()
  })

  it('renders the subheading description', () => {
    expect(screen.getByText(/power of compound interest/i)).toBeInTheDocument()
  })

  it('renders Initial Investment input with default value 10000', () => {
    const input = screen.getByDisplayValue('10000') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.type).toBe('number')
  })

  it('renders Annual Interest Rate input with default value 7', () => {
    const input = screen.getByDisplayValue('7') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.type).toBe('number')
  })

  it('renders Time Period input with default value 20', () => {
    const input = screen.getByDisplayValue('20') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.type).toBe('number')
  })

  it('renders Monthly Contribution input with default value 500', () => {
    const input = screen.getByDisplayValue('500') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.type).toBe('number')
  })

  it('renders Compounding Frequency select defaulting to monthly', () => {
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(select.value).toBe('monthly')
  })

  it('compounding frequency dropdown has all required options', () => {
    const select = screen.getByRole('combobox')
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value)
    expect(options).toContain('annually')
    expect(options).toContain('semiannually')
    expect(options).toContain('quarterly')
    expect(options).toContain('monthly')
    expect(options).toContain('daily')
    expect(options).toHaveLength(5)
  })

  it('renders result cards for Final Amount, Total Contributions, Interest Earned', () => {
    expect(screen.getByText('Final Amount')).toBeInTheDocument()
    expect(screen.getByText('Total Contributions')).toBeInTheDocument()
    expect(screen.getByText('Interest Earned')).toBeInTheDocument()
  })

  it('renders the chart container with "Growth Over Time" title', () => {
    expect(screen.getByText('Growth Over Time')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Component default-state tests
// ---------------------------------------------------------------------------

describe('CompoundInterestCalculator – default state', () => {
  it('default inputs produce a final value greater than total contributions', () => {
    render(<CompoundInterestCalculator />)
    // With rate=7%, 20 years, there must be positive interest earned
    // The "Interest Earned" card value should not show $0
    const interestCard = screen.getByText('Interest Earned')
    const value = interestCard.nextElementSibling?.textContent ?? ''
    expect(value).not.toBe('$0')
  })
})

// ---------------------------------------------------------------------------
// Component user interaction tests
// ---------------------------------------------------------------------------

describe('CompoundInterestCalculator – user interactions', () => {
  it('changing rate to 0 sets Interest Earned to $0', () => {
    render(<CompoundInterestCalculator />)
    fireEvent.change(screen.getByDisplayValue('500'), { target: { value: '0' } })
    fireEvent.change(screen.getByDisplayValue('7'), { target: { value: '0' } })

    const interestCard = screen.getByText('Interest Earned')
    const value = interestCard.nextElementSibling?.textContent ?? ''
    expect(value).toBe('$0')
  })

  it('changing principal updates the Final Amount display', () => {
    render(<CompoundInterestCalculator />)
    const finalAmountLabel = screen.getByText('Final Amount')
    const originalValue = finalAmountLabel.nextElementSibling?.textContent

    fireEvent.change(screen.getByDisplayValue('10000'), { target: { value: '100000' } })
    const newValue = finalAmountLabel.nextElementSibling?.textContent

    expect(newValue).not.toBe(originalValue)
  })

  it('changing compounding frequency updates the Final Amount', () => {
    render(<CompoundInterestCalculator />)
    const select = screen.getByRole('combobox')
    const finalAmountLabel = screen.getByText('Final Amount')

    const monthlyValue = finalAmountLabel.nextElementSibling?.textContent

    fireEvent.change(select, { target: { value: 'annually' } })
    const annuallyValue = finalAmountLabel.nextElementSibling?.textContent

    expect(annuallyValue).not.toBe(monthlyValue)
  })

  it('switching to daily compounding gives higher result than monthly', () => {
    render(<CompoundInterestCalculator />)
    const select = screen.getByRole('combobox')
    const finalAmountLabel = screen.getByText('Final Amount')
    const parse = (s: string) => Number(s.replace(/[$,]/g, ''))

    fireEvent.change(select, { target: { value: 'monthly' } })
    const monthlyText = finalAmountLabel.nextElementSibling?.textContent ?? ''

    fireEvent.change(select, { target: { value: 'daily' } })
    const dailyText = finalAmountLabel.nextElementSibling?.textContent ?? ''

    expect(parse(dailyText)).toBeGreaterThan(parse(monthlyText))
  })

  it('switching to annually compounding gives lower result than monthly', () => {
    render(<CompoundInterestCalculator />)
    const select = screen.getByRole('combobox')
    const finalAmountLabel = screen.getByText('Final Amount')
    const parse = (s: string) => Number(s.replace(/[$,]/g, ''))

    fireEvent.change(select, { target: { value: 'monthly' } })
    const monthlyText = finalAmountLabel.nextElementSibling?.textContent ?? ''

    fireEvent.change(select, { target: { value: 'annually' } })
    const annuallyText = finalAmountLabel.nextElementSibling?.textContent ?? ''

    expect(parse(annuallyText)).toBeLessThan(parse(monthlyText))
  })

  it('clearing the principal input does not crash the component', () => {
    render(<CompoundInterestCalculator />)
    expect(() => {
      fireEvent.change(screen.getByDisplayValue('10000'), { target: { value: '' } })
    }).not.toThrow()
    expect(screen.getByText('Final Amount')).toBeInTheDocument()
  })

  it('entering a very large number does not crash the component', () => {
    render(<CompoundInterestCalculator />)
    fireEvent.change(screen.getByDisplayValue('10000'), { target: { value: '99999999' } })
    expect(screen.getByText('Final Amount')).toBeInTheDocument()
  })

  it('all five compounding options produce distinct final amounts', () => {
    render(<CompoundInterestCalculator />)
    const select = screen.getByRole('combobox')
    const finalAmountLabel = screen.getByText('Final Amount')
    const parse = (s: string) => Number(s.replace(/[$,]/g, ''))

    const values: Record<string, number> = {}
    for (const freq of ['annually', 'semiannually', 'quarterly', 'monthly', 'daily']) {
      fireEvent.change(select, { target: { value: freq } })
      values[freq] = parse(finalAmountLabel.nextElementSibling?.textContent ?? '')
    }

    const unique = new Set(Object.values(values))
    expect(unique.size).toBe(5)
  })
})
