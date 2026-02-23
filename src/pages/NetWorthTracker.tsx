import { useState, useMemo, useCallback, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────

interface Asset {
  name: string
  value: number
}

interface Liability {
  name: string
  value: number
}

interface Snapshot {
  date: string // YYYY-MM or YYYY-MM-DD
  assets: Asset[]
  liabilities: Liability[]
  totalAssets: number
  totalLiabilities: number
  netWorth: number
}

interface ChartPoint {
  date: string
  netWorth: number
  totalAssets: number
  totalLiabilities: number
}

// ─── Storage ─────────────────────────────────────────────────

const STORAGE_KEY = 'wizanon_net_worth_snapshots'

function loadSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

function saveSnapshots(snapshots: Snapshot[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots))
}

// ─── CSV ─────────────────────────────────────────────────────

function snapshotsToCSV(snapshots: Snapshot[]): string {
  // Collect all unique asset and liability names across all snapshots
  const assetNames = new Set<string>()
  const liabilityNames = new Set<string>()
  for (const snap of snapshots) {
    snap.assets.forEach((a) => assetNames.add(a.name))
    snap.liabilities.forEach((l) => liabilityNames.add(l.name))
  }
  const assetCols = Array.from(assetNames).sort()
  const liabilityCols = Array.from(liabilityNames).sort()

  const headers = [
    'Date',
    ...assetCols.map((n) => `Asset: ${n}`),
    'Total Assets',
    ...liabilityCols.map((n) => `Liability: ${n}`),
    'Total Liabilities',
    'Net Worth',
  ]

  const rows = snapshots.map((snap) => {
    const assetMap = new Map(snap.assets.map((a) => [a.name, a.value]))
    const liabMap = new Map(snap.liabilities.map((l) => [l.name, l.value]))
    return [
      snap.date,
      ...assetCols.map((n) => String(assetMap.get(n) ?? 0)),
      String(snap.totalAssets),
      ...liabilityCols.map((n) => String(liabMap.get(n) ?? 0)),
      String(snap.totalLiabilities),
      String(snap.netWorth),
    ]
  })

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

function parseCSV(csv: string): Snapshot[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',')

  const dateIdx = headers.indexOf('Date')
  const totalAssetsIdx = headers.indexOf('Total Assets')
  const totalLiabIdx = headers.indexOf('Total Liabilities')
  const netWorthIdx = headers.indexOf('Net Worth')

  if (dateIdx < 0 || netWorthIdx < 0) return []

  const assetCols: { name: string; idx: number }[] = []
  const liabCols: { name: string; idx: number }[] = []
  headers.forEach((h, i) => {
    if (h.startsWith('Asset: ')) assetCols.push({ name: h.replace('Asset: ', ''), idx: i })
    if (h.startsWith('Liability: ')) liabCols.push({ name: h.replace('Liability: ', ''), idx: i })
  })

  const snapshots: Snapshot[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < headers.length) continue

    const assets: Asset[] = assetCols
      .map((c) => ({ name: c.name, value: Number(cols[c.idx]) || 0 }))
      .filter((a) => a.value !== 0)
    const liabilities: Liability[] = liabCols
      .map((c) => ({ name: c.name, value: Number(cols[c.idx]) || 0 }))
      .filter((l) => l.value !== 0)

    const totalAssets = totalAssetsIdx >= 0 ? Number(cols[totalAssetsIdx]) || 0 : assets.reduce((s, a) => s + a.value, 0)
    const totalLiabilities = totalLiabIdx >= 0 ? Number(cols[totalLiabIdx]) || 0 : liabilities.reduce((s, l) => s + l.value, 0)
    const netWorth = netWorthIdx >= 0 ? Number(cols[netWorthIdx]) || 0 : totalAssets - totalLiabilities

    // If no individual asset/liability columns, create generic entries
    if (assets.length === 0 && totalAssets > 0) {
      assets.push({ name: 'Assets', value: totalAssets })
    }
    if (liabilities.length === 0 && totalLiabilities > 0) {
      liabilities.push({ name: 'Liabilities', value: totalLiabilities })
    }

    snapshots.push({
      date: cols[dateIdx],
      assets,
      liabilities,
      totalAssets,
      totalLiabilities,
      netWorth,
    })
  }

  return snapshots
}

// ─── Helpers ─────────────────────────────────────────────────

const formatCurrency = (value: number): string =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

function getCurrentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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

const sectionTitle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '1rem',
  marginTop: '0.5rem',
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

const itemRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '0.75rem',
  flexWrap: 'wrap',
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

const actionBtn: React.CSSProperties = {
  background: 'var(--accent-purple)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '0.625rem 1.25rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
}

const secondaryBtn: React.CSSProperties = {
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.625rem 1.25rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
}

const dangerBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#ef4444',
  border: '1px solid #ef444440',
  borderRadius: '8px',
  padding: '0.625rem 1.25rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
}

const buttonRow: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  flexWrap: 'wrap',
  marginBottom: '2rem',
}

const tableContainer: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '1rem',
  marginBottom: '2rem',
  overflowX: 'auto',
}

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.8125rem',
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.625rem 0.75rem',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-muted)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontSize: '0.6875rem',
}

const td: React.CSSProperties = {
  padding: '0.625rem 0.75rem',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

const snapshotDeleteBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#ef4444',
  border: 'none',
  padding: '0.25rem 0.5rem',
  fontSize: '0.75rem',
  cursor: 'pointer',
}

// ─── Component ───────────────────────────────────────────────

function NetWorthTracker() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>(loadSnapshots)
  const [snapshotDate, setSnapshotDate] = useState(getCurrentMonth())
  const [assets, setAssets] = useState<Asset[]>([
    { name: 'Checking', value: 0 },
    { name: '401(k) / IRA', value: 0 },
    { name: 'Brokerage', value: 0 },
    { name: 'Home Equity', value: 0 },
  ])
  const [liabilities, setLiabilities] = useState<Liability[]>([
    { name: 'Mortgage', value: 0 },
    { name: 'Student Loans', value: 0 },
    { name: 'Credit Cards', value: 0 },
  ])
  const [confirmClear, setConfirmClear] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalAssets = useMemo(() => assets.reduce((s, a) => s + a.value, 0), [assets])
  const totalLiabilities = useMemo(() => liabilities.reduce((s, l) => s + l.value, 0), [liabilities])
  const netWorth = totalAssets - totalLiabilities

  const chartData: ChartPoint[] = useMemo(() => {
    return [...snapshots]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({
        date: s.date,
        netWorth: s.netWorth,
        totalAssets: s.totalAssets,
        totalLiabilities: s.totalLiabilities,
      }))
  }, [snapshots])

  // Derived stats
  const latestNW = snapshots.length > 0
    ? [...snapshots].sort((a, b) => b.date.localeCompare(a.date))[0].netWorth
    : null
  const previousNW = snapshots.length > 1
    ? [...snapshots].sort((a, b) => b.date.localeCompare(a.date))[1].netWorth
    : null
  const changeAmount = latestNW !== null && previousNW !== null ? latestNW - previousNW : null
  const changePct = changeAmount !== null && previousNW !== null && previousNW !== 0
    ? (changeAmount / Math.abs(previousNW)) * 100
    : null
  const allTimeHigh = snapshots.length > 0
    ? Math.max(...snapshots.map((s) => s.netWorth))
    : null

  // Asset management
  const addAsset = () => setAssets((prev) => [...prev, { name: 'New Asset', value: 0 }])
  const removeAsset = (idx: number) => setAssets((prev) => prev.filter((_, i) => i !== idx))
  const updateAsset = (idx: number, field: keyof Asset, value: string | number) =>
    setAssets((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)))

  // Liability management
  const addLiability = () => setLiabilities((prev) => [...prev, { name: 'New Liability', value: 0 }])
  const removeLiability = (idx: number) => setLiabilities((prev) => prev.filter((_, i) => i !== idx))
  const updateLiability = (idx: number, field: keyof Liability, value: string | number) =>
    setLiabilities((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))

  // Save snapshot
  const saveSnapshot = useCallback(() => {
    const newSnapshot: Snapshot = {
      date: snapshotDate,
      assets: assets.filter((a) => a.value !== 0),
      liabilities: liabilities.filter((l) => l.value !== 0),
      totalAssets,
      totalLiabilities,
      netWorth,
    }
    const updated = [...snapshots.filter((s) => s.date !== snapshotDate), newSnapshot]
      .sort((a, b) => a.date.localeCompare(b.date))
    setSnapshots(updated)
    saveSnapshots(updated)
  }, [snapshotDate, assets, liabilities, totalAssets, totalLiabilities, netWorth, snapshots])

  // Delete snapshot
  const deleteSnapshot = useCallback((date: string) => {
    const updated = snapshots.filter((s) => s.date !== date)
    setSnapshots(updated)
    saveSnapshots(updated)
  }, [snapshots])

  // Load snapshot into editor
  const loadSnapshot = useCallback((snap: Snapshot) => {
    setSnapshotDate(snap.date)
    setAssets(snap.assets.length > 0 ? [...snap.assets] : [{ name: 'Assets', value: snap.totalAssets }])
    setLiabilities(snap.liabilities.length > 0 ? [...snap.liabilities] : [{ name: 'Liabilities', value: snap.totalLiabilities }])
  }, [])

  // Export CSV
  const exportCSV = useCallback(() => {
    if (snapshots.length === 0) return
    const csv = snapshotsToCSV(snapshots)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `net-worth-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [snapshots])

  // Import CSV
  const importCSV = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const imported = parseCSV(text)
      if (imported.length === 0) return

      // Merge: imported snapshots overwrite existing ones with same date
      const existing = new Map(snapshots.map((s) => [s.date, s]))
      for (const snap of imported) {
        existing.set(snap.date, snap)
      }
      const merged = Array.from(existing.values()).sort((a, b) => a.date.localeCompare(b.date))
      setSnapshots(merged)
      saveSnapshots(merged)
    }
    reader.readAsText(file)
    // Reset input so same file can be re-imported
    e.target.value = ''
  }, [snapshots])

  // Clear all data
  const clearAll = useCallback(() => {
    setSnapshots([])
    saveSnapshots([])
    setConfirmClear(false)
  }, [])

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Net Worth Tracker</h1>
      <p style={subheadingStyle}>
        Track your net worth over time. All data stays in your browser — nothing leaves this device.
      </p>

      {/* ─── Current Snapshot Entry ──────────────────────── */}

      <div style={sectionTitle}>Snapshot Date</div>
      <div style={{ ...formGrid, marginBottom: '1.5rem' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Month</label>
          <input
            type="month"
            value={snapshotDate}
            onChange={(e) => setSnapshotDate(e.target.value)}
          />
        </div>
      </div>

      <div style={sectionTitle}>Assets</div>
      {assets.map((asset, idx) => (
        <div key={idx} style={itemRow}>
          <div style={{ flex: '1 1 160px' }}>
            <input
              type="text"
              value={asset.name}
              onChange={(e) => updateAsset(idx, 'name', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: '0 0 140px' }}>
            <input
              type="number"
              min="0"
              step="100"
              value={asset.value}
              onChange={(e) => updateAsset(idx, 'value', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <button style={removeBtn} onClick={() => removeAsset(idx)}>✕</button>
        </div>
      ))}
      <button style={addBtn} onClick={addAsset}>+ Add Asset</button>

      <div style={sectionTitle}>Liabilities</div>
      {liabilities.map((liability, idx) => (
        <div key={idx} style={itemRow}>
          <div style={{ flex: '1 1 160px' }}>
            <input
              type="text"
              value={liability.name}
              onChange={(e) => updateLiability(idx, 'name', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: '0 0 140px' }}>
            <input
              type="number"
              min="0"
              step="100"
              value={liability.value}
              onChange={(e) => updateLiability(idx, 'value', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <button style={removeBtn} onClick={() => removeLiability(idx)}>✕</button>
        </div>
      ))}
      <button style={addBtn} onClick={addLiability}>+ Add Liability</button>

      {/* ─── Current Totals ──────────────────────────────── */}

      <div style={resultsGrid}>
        <div style={resultCard}>
          <div style={resultLabel}>Total Assets</div>
          <div style={{ ...resultValue, color: 'var(--accent-green)' }}>
            {formatCurrency(totalAssets)}
          </div>
        </div>
        <div style={resultCard}>
          <div style={resultLabel}>Total Liabilities</div>
          <div style={{ ...resultValue, color: '#ef4444' }}>
            {formatCurrency(totalLiabilities)}
          </div>
        </div>
        <div style={resultCard}>
          <div style={resultLabel}>Net Worth</div>
          <div style={{ ...resultValue, color: netWorth >= 0 ? 'var(--accent-gold)' : '#ef4444' }}>
            {formatCurrency(netWorth)}
          </div>
        </div>
      </div>

      <div style={buttonRow}>
        <button style={actionBtn} onClick={saveSnapshot}>
          💾 Save Snapshot
        </button>
        <button style={secondaryBtn} onClick={exportCSV} disabled={snapshots.length === 0}>
          📤 Export CSV
        </button>
        <button style={secondaryBtn} onClick={() => fileInputRef.current?.click()}>
          📥 Import CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={importCSV}
        />
        {snapshots.length > 0 && !confirmClear && (
          <button style={dangerBtn} onClick={() => setConfirmClear(true)}>
            🗑️ Clear All
          </button>
        )}
        {confirmClear && (
          <>
            <button style={{ ...dangerBtn, background: '#ef444420' }} onClick={clearAll}>
              Confirm Clear
            </button>
            <button style={secondaryBtn} onClick={() => setConfirmClear(false)}>
              Cancel
            </button>
          </>
        )}
      </div>

      {/* ─── Historical Stats ────────────────────────────── */}

      {snapshots.length > 0 && (
        <>
          <div style={sectionTitle}>Tracking Summary</div>
          <div style={resultsGrid}>
            <div style={resultCard}>
              <div style={resultLabel}>Latest Net Worth</div>
              <div style={{ ...resultValue, color: 'var(--accent-gold)' }}>
                {latestNW !== null ? formatCurrency(latestNW) : '—'}
              </div>
            </div>
            {changeAmount !== null && (
              <div style={resultCard}>
                <div style={resultLabel}>Change</div>
                <div style={{ ...resultValue, color: changeAmount >= 0 ? 'var(--accent-green)' : '#ef4444' }}>
                  {changeAmount >= 0 ? '+' : ''}{formatCurrency(changeAmount)}
                </div>
                {changePct !== null && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
                  </div>
                )}
              </div>
            )}
            {allTimeHigh !== null && (
              <div style={resultCard}>
                <div style={resultLabel}>All-Time High</div>
                <div style={{ ...resultValue, color: 'var(--accent-purple)' }}>
                  {formatCurrency(allTimeHigh)}
                </div>
              </div>
            )}
            <div style={resultCard}>
              <div style={resultLabel}>Snapshots</div>
              <div style={{ ...resultValue, color: 'var(--accent-blue)' }}>
                {snapshots.length}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {snapshots[0]?.date} → {snapshots[snapshots.length - 1]?.date}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Chart ───────────────────────────────────────── */}

      {chartData.length > 1 && (
        <div style={chartContainer}>
          <div style={chartTitle}>Net Worth Over Time</div>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <YAxis
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                tickFormatter={(v: number) =>
                  v >= 1_000_000
                    ? `$${(v / 1_000_000).toFixed(1)}M`
                    : v >= 1000 || v <= -1000
                    ? `$${(v / 1000).toFixed(0)}k`
                    : `$${v}`
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
                    : name === 'totalAssets'
                    ? 'Assets'
                    : 'Liabilities',
                ]}
              />
              <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="4 2" />
              <Line
                type="monotone"
                dataKey="netWorth"
                stroke="var(--accent-gold)"
                strokeWidth={2.5}
                dot={{ fill: 'var(--accent-gold)', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="totalAssets"
                stroke="var(--accent-green)"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="totalLiabilities"
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length === 1 && (
        <div style={{ ...infoBox, textAlign: 'center' as const }}>
          Save at least 2 snapshots to see the chart. Come back next month!
        </div>
      )}

      {/* ─── History Table ───────────────────────────────── */}

      {snapshots.length > 0 && (
        <>
          <div style={sectionTitle}>History</div>
          <div style={tableContainer}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Assets</th>
                  <th style={th}>Liabilities</th>
                  <th style={th}>Net Worth</th>
                  <th style={th}>Change</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {[...snapshots].sort((a, b) => b.date.localeCompare(a.date)).map((snap, idx, arr) => {
                  const prev = idx < arr.length - 1 ? arr[idx + 1] : null
                  const change = prev ? snap.netWorth - prev.netWorth : null
                  return (
                    <tr key={snap.date}>
                      <td style={td}>
                        <span
                          style={{ cursor: 'pointer', color: 'var(--accent-purple)', textDecoration: 'underline' }}
                          onClick={() => loadSnapshot(snap)}
                          title="Load into editor"
                        >
                          {snap.date}
                        </span>
                      </td>
                      <td style={{ ...td, color: 'var(--accent-green)' }}>{formatCurrency(snap.totalAssets)}</td>
                      <td style={{ ...td, color: '#ef4444' }}>{formatCurrency(snap.totalLiabilities)}</td>
                      <td style={{ ...td, fontWeight: 600, color: snap.netWorth >= 0 ? 'var(--accent-gold)' : '#ef4444' }}>
                        {formatCurrency(snap.netWorth)}
                      </td>
                      <td style={{ ...td, color: change !== null ? (change >= 0 ? 'var(--accent-green)' : '#ef4444') : 'var(--text-muted)' }}>
                        {change !== null ? `${change >= 0 ? '+' : ''}${formatCurrency(change)}` : '—'}
                      </td>
                      <td style={td}>
                        <button style={snapshotDeleteBtn} onClick={() => deleteSnapshot(snap.date)} title="Delete">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── Explainer ───────────────────────────────────── */}

      <div style={infoBox}>
        <strong style={{ color: 'var(--text-primary)' }}>What is Net Worth?</strong>
        <br /><br />
        <strong>Net Worth = Total Assets − Total Liabilities</strong>
        <br /><br />
        <strong>Assets</strong> include everything you own that has monetary value: cash in checking/savings,
        retirement accounts (401k, IRA, Roth), brokerage investments, home equity, vehicles, crypto, etc.
        <br /><br />
        <strong>Liabilities</strong> are everything you owe: mortgage balance, student loans, auto loans,
        credit card balances, personal loans, etc.
        <br /><br />
        Tracking net worth monthly gives you the clearest picture of your financial health over time.
        It captures the full picture — not just income or savings, but the overall trajectory of your wealth.
        <br /><br />
        <strong>Your data stays local.</strong> Everything is stored in your browser's localStorage.
        Use Export CSV to back up your data or transfer it to another device. Use Import CSV to restore.
        No server ever sees your numbers.
      </div>
    </div>
  )
}

export default NetWorthTracker
