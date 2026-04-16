import { useState, useRef } from 'react'
import { uploadFile } from '../utils/api'
import { FileSpreadsheet, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'

export default function UploadPage({ onSuccess }) {
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef()

  const handleFile = async (file) => {
    setStatus('loading')
    setError('')
    try {
      const res = await uploadFile(file)
      setResult(res.data)
      setStatus('success')
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
      setStatus('error')
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1>Upload Sales Data</h1>
        <p>Import your CSV or Excel file to begin analysis</p>
      </div>

      <div
        className={`drop-zone${dragging ? ' dragging' : ''}${status === 'success' ? ' success' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" hidden accept=".csv,.xlsx,.xls"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />

        {status === 'loading' ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <div className="spinner" style={{ width:36, height:36, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%' }} />
            <p style={{ color:'var(--text-muted)' }}>Processing your file…</p>
          </div>
        ) : status === 'success' ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <CheckCircle size={44} style={{ color:'var(--success)' }} />
            <p style={{ fontWeight:700, fontSize:18 }}>Data loaded successfully</p>
            <p style={{ color:'var(--text-muted)', fontSize:14 }}>{result?.rows?.toLocaleString()} rows imported</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <FileSpreadsheet size={44} style={{ color:'var(--accent)', opacity: dragging ? 1 : 0.6 }} />
            <div style={{ textAlign:'center' }}>
              <p style={{ fontWeight:700, fontSize:17 }}>Drop your file here</p>
              <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:4 }}>or click to browse · CSV, XLSX supported</p>
            </div>
          </div>
        )}
      </div>

      {status === 'error' && (
        <div className="error-banner" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <AlertCircle size={15} />{error}
        </div>
      )}

      {result && (
        <div className="card animate-fade-up" style={{ marginTop:20 }}>
          <div className="card-title">Import Summary</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:16 }}>
            <div><div className="stat-label">Rows imported</div><div className="stat-value">{result.rows?.toLocaleString()}</div></div>
            <div><div className="stat-label">Columns</div><div className="stat-value">{result.columns?.length}</div></div>
            <div><div className="stat-label">Date from</div><div className="stat-value" style={{ fontSize:18 }}>{result.date_range?.from}</div></div>
            <div><div className="stat-label">Date to</div><div className="stat-value" style={{ fontSize:18 }}>{result.date_range?.to}</div></div>
          </div>
          <div style={{ marginTop:16, display:'flex', gap:8, flexWrap:'wrap' }}>
            {result.columns?.map(c => (
              <span key={c} style={{ padding:'3px 10px', borderRadius:99, background:'var(--surface2)', fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{c}</span>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop:20 }} onClick={onSuccess}>
            Go to Dashboard <ArrowRight size={16} />
          </button>
        </div>
      )}

      <div className="card" style={{ marginTop:20 }}>
        <div className="card-title">Required columns</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {['date','product','region','revenue','quantity'].map(c => (
            <span key={c} style={{ padding:'4px 12px', borderRadius:99, background:'rgba(0,229,255,0.08)', border:'1px solid rgba(0,229,255,0.2)', color:'var(--accent)', fontSize:12, fontFamily:'var(--font-mono)' }}>{c}</span>
          ))}
        </div>
        <p style={{ color:'var(--text-muted)', fontSize:12, marginTop:10 }}>
          Optional columns: <span style={{ fontFamily:'var(--font-mono)', color:'var(--text-dim)' }}>salesperson, category</span>.
          Column names are case-insensitive. A sample file is in the backend folder.
        </p>
      </div>

      <style>{`
        .drop-zone {
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          padding: 60px 40px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 16px;
          background: var(--surface);
        }
        .drop-zone:hover, .drop-zone.dragging {
          border-color: var(--accent);
          background: rgba(0,229,255,0.04);
        }
        .drop-zone.success { border-color: var(--success); border-style: solid; }
      `}</style>
    </div>
  )
}
