import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import ChatPage from './pages/ChatPage'
import UploadPage from './pages/UploadPage'
import ForecastPage from './pages/ForecastPage'
import { healthCheck } from './utils/api'
import { BarChart3, MessageSquare, Upload, TrendingUp, Activity } from 'lucide-react'
import './App.css'

const TABS = [
  { id: 'upload',    label: 'Upload',    icon: Upload },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'forecast',  label: 'Forecast',  icon: TrendingUp },
  { id: 'chat',      label: 'AI Chat',   icon: MessageSquare },
]

export default function App() {
  const [tab, setTab] = useState('upload')
  const [backendOk, setBackendOk] = useState(null)

  useEffect(() => {
    healthCheck()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false))
  }, [])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Activity size={22} style={{ color: 'var(--accent)' }} />
          <span>SalesAI</span>
        </div>

        <nav className="sidebar-nav">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <div className={`status-dot ${backendOk === true ? 'ok' : backendOk === false ? 'err' : 'loading'}`} />
          <span>{backendOk === true ? 'Backend connected' : backendOk === false ? 'Backend offline' : 'Connecting…'}</span>
        </div>
      </aside>

      <main className="main-content">
        {tab === 'upload'    && <UploadPage onSuccess={() => setTab('dashboard')} />}
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'forecast'  && <ForecastPage />}
        {tab === 'chat'      && <ChatPage />}
      </main>
    </div>
  )
}
