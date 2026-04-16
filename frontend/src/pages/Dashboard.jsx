import { useState, useEffect } from 'react'
import { getSummary, getRevenue, getProducts, getRegions } from '../utils/api'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, MapPin } from 'lucide-react'

const COLORS = ['#00e5ff', '#7c3aed', '#ff6b35', '#00d68f', '#ffb830', '#ff4d6d']

const fmt = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${n}`

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', padding:'10px 14px', borderRadius:8, fontSize:13 }}>
      <p style={{ color:'var(--text-muted)', marginBottom:4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <b>{typeof p.value === 'number' && p.name?.toLowerCase().includes('rev') ? fmt(p.value) : p.value?.toLocaleString()}</b></p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [revenue, setRevenue] = useState([])
  const [products, setProducts] = useState([])
  const [regions, setRegions] = useState([])
  const [period, setPeriod] = useState('monthly')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [s, rv, pr, rg] = await Promise.all([getSummary(), getRevenue(period), getProducts(), getRegions()])
      setSummary(s.data)
      setRevenue(rv.data)
      setProducts(pr.data)
      setRegions(rg.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load data. Upload a file first.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [period])

  if (loading) return <Skeleton />
  if (error) return <div className="error-banner">{error}</div>

  const growth = summary?.revenue_growth_pct ?? 0

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1>Sales Dashboard</h1>
        <p>
          {summary?.date_range?.from} — {summary?.date_range?.to}
        </p>
      </div>

      {/* KPI strip */}
      <div className="stat-grid">
        <StatCard icon={DollarSign} label="Total Revenue" value={fmt(summary?.total_revenue)} badge={`${growth > 0 ? '+' : ''}${growth}%`} up={growth >= 0} />
        <StatCard icon={ShoppingCart} label="Total Orders" value={summary?.total_orders?.toLocaleString()} />
        <StatCard icon={DollarSign} label="Avg Order Value" value={fmt(summary?.avg_order_value)} />
        <StatCard icon={Package} label="Units Sold" value={summary?.total_units_sold?.toLocaleString()} />
        <StatCard icon={MapPin} label="Top Region" value={summary?.top_region} />
        <StatCard icon={Package} label="Top Product" value={summary?.top_product} small />
      </div>

      {/* Period toggle */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {['weekly','monthly','quarterly'].map(p => (
          <button key={p} className={`btn ${period === p ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding:'6px 14px', fontSize:12 }} onClick={() => setPeriod(p)}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="chart-grid">
        <div className="card">
          <div className="card-title">Revenue over time</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fill:'var(--text-muted)', fontSize:11 }} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fill:'var(--text-muted)', fontSize:11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#00e5ff" fill="url(#revGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Orders by period</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fill:'var(--text-muted)', fontSize:11 }} />
              <YAxis tick={{ fill:'var(--text-muted)', fontSize:11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="orders" name="Orders" fill="#7c3aed" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="chart-grid">
        <div className="card">
          <div className="card-title">Top products by revenue</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={products} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fill:'var(--text-muted)', fontSize:11 }} />
              <YAxis dataKey="product" type="category" width={100} tick={{ fill:'var(--text-muted)', fontSize:11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" radius={[0,4,4,0]}>
                {products.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Revenue by region</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={regions} dataKey="revenue" nameKey="region" cx="50%" cy="50%" outerRadius={90} label={({ region, share_pct }) => `${region} ${share_pct}%`} labelLine={{ stroke:'var(--text-dim)' }}>
                {regions.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, badge, up, small }) {
  return (
    <div className="stat-card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span className="stat-label">{label}</span>
        <Icon size={14} style={{ color:'var(--text-dim)' }} />
      </div>
      <div className={`stat-value${small ? ' small' : ''}`} style={small ? { fontSize:16, fontWeight:700 } : {}}>{value ?? '—'}</div>
      {badge && (
        <span className={`stat-badge ${up ? 'up' : 'down'}`}>
          {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {badge}
        </span>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <div className="skeleton" style={{ height:28, width:200 }} />
        <div className="skeleton" style={{ height:16, width:280, marginTop:8 }} />
      </div>
      <div className="stat-grid">
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height:90 }} />)}
      </div>
      <div className="chart-grid">
        <div className="skeleton" style={{ height:260 }} />
        <div className="skeleton" style={{ height:260 }} />
      </div>
    </div>
  )
}
