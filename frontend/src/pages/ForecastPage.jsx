import { useState, useEffect } from 'react'
import { getForecast } from '../utils/api'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

const fmt = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : `$${(n/1e3).toFixed(0)}K`

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', padding:'10px 14px', borderRadius:8, fontSize:13 }}>
      <p style={{ color:'var(--text-muted)', marginBottom:6 }}>{label}</p>
      {payload.map((p, i) => p.value != null && (
        <p key={i} style={{ color: p.color }}>{p.name}: <b>{fmt(p.value)}</b></p>
      ))}
    </div>
  )
}

export default function ForecastPage() {
  const [data, setData] = useState(null)
  const [periods, setPeriods] = useState(6)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    getForecast(periods)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(e => { setError(e.response?.data?.detail || 'No data. Upload a file first.'); setLoading(false) })
  }, [periods])

  if (loading) return <div className="empty-state"><div className="spinner" style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%' }} /></div>
  if (error) return <div className="error-banner" style={{ display:'flex', gap:8, alignItems:'center' }}><AlertCircle size={15} />{error}</div>

  // Combine history + forecast for chart
  const allData = [
    ...(data.history || []).map(d => ({ period: d.period, actual: d.revenue, forecast: null, lower: null, upper: null })),
    ...(data.forecast || []).map(d => ({ period: d.period, actual: null, forecast: d.revenue, lower: d.lower, upper: d.upper }))
  ]

  // Find split point label
  const splitPeriod = data.forecast?.[0]?.period

  const totalForecast = data.forecast?.reduce((s, d) => s + d.revenue, 0) ?? 0
  const lastActual = data.history?.at(-1)?.revenue ?? 0

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1>Revenue Forecast</h1>
        <p>Linear trend projection with 95% confidence interval</p>
      </div>

      {/* Summary cards */}
      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', marginBottom:24 }}>
        <div className="stat-card">
          <div className="stat-label">Trend direction</div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
            {data.trend === 'upward'
              ? <TrendingUp size={28} style={{ color:'var(--success)' }} />
              : <TrendingDown size={28} style={{ color:'var(--danger)' }} />}
            <span style={{ fontSize:20, fontWeight:800, color: data.trend === 'upward' ? 'var(--success)' : 'var(--danger)', textTransform:'capitalize' }}>{data.trend}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly growth (linear)</div>
          <div className="stat-value">{fmt(Math.abs(data.monthly_growth))}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last actual month</div>
          <div className="stat-value">{fmt(lastActual)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Projected {periods}-period total</div>
          <div className="stat-value">{fmt(totalForecast)}</div>
        </div>
      </div>

      {/* Period selector */}
      <div style={{ display:'flex', gap:8, marginBottom:20, alignItems:'center' }}>
        <span style={{ color:'var(--text-muted)', fontSize:13 }}>Forecast periods:</span>
        {[3, 6, 12].map(p => (
          <button key={p} className={`btn ${periods === p ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding:'6px 14px', fontSize:12 }} onClick={() => setPeriods(p)}>
            {p} months
          </button>
        ))}
      </div>

      {/* Main chart */}
      <div className="card">
        <div className="card-title">Historical + Forecast revenue</div>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={allData}>
            <defs>
              <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ff6b35" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="period" tick={{ fill:'var(--text-muted)', fontSize:11 }} />
            <YAxis tickFormatter={v => fmt(v)} tick={{ fill:'var(--text-muted)', fontSize:11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize:12, color:'var(--text-muted)' }} />

            {splitPeriod && (
              <ReferenceLine x={splitPeriod} stroke="var(--text-dim)" strokeDasharray="4 4" label={{ value:'Forecast →', position:'insideTopRight', fill:'var(--text-muted)', fontSize:11 }} />
            )}

            {/* Confidence band */}
            <Area type="monotone" dataKey="upper" name="Upper bound" stroke="none" fill="url(#confGrad)" legendType="none" />
            <Area type="monotone" dataKey="lower" name="Lower bound" stroke="none" fill="var(--bg)" legendType="none" />

            <Line type="monotone" dataKey="actual" name="Actual" stroke="#00e5ff" strokeWidth={2.5} dot={{ r:3, fill:'#00e5ff' }} connectNulls={false} />
            <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#ff6b35" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r:3, fill:'#ff6b35' }} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast table */}
      <div className="card" style={{ marginTop:20 }}>
        <div className="card-title">Forecast breakdown</div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['Period','Forecast Revenue','Lower (95%)','Upper (95%)'].map(h => (
                <th key={h} style={{ textAlign:'left', padding:'8px 12px', color:'var(--text-muted)', fontWeight:600, fontSize:11, letterSpacing:'0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.forecast?.map((row, i) => (
              <tr key={i} style={{ borderBottom:'1px solid var(--border)', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding:'10px 12px', fontFamily:'var(--font-mono)', color:'var(--accent)' }}>{row.period}</td>
                <td style={{ padding:'10px 12px', fontWeight:700 }}>{fmt(row.revenue)}</td>
                <td style={{ padding:'10px 12px', color:'var(--text-muted)' }}>{fmt(row.lower)}</td>
                <td style={{ padding:'10px 12px', color:'var(--text-muted)' }}>{fmt(row.upper)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop:12, fontSize:11, color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
        * Forecast uses ordinary least squares linear regression on historical monthly revenue. Confidence intervals assume normally distributed residuals.
      </p>
    </div>
  )
}
