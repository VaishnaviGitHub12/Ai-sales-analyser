import { useState, useRef, useEffect } from 'react'
import { sendChat } from '../utils/api'
import { Send, Bot, User, Sparkles, Database, ExternalLink } from 'lucide-react'

const STARTERS = [
  'What were the top 3 products by revenue?',
  'Which region had the highest growth?',
  'Show me monthly revenue trends.',
  'Who is the best performing salesperson?',
  'What is our average order value by product?',
  'Which month had the highest sales?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    const userMsg = { role: 'user', content: msg }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setLoading(true)
    try {
      const history = newMsgs.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res = await sendChat(msg, history.slice(0, -1))
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        sqlResult: res.data.sql_result
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${e.response?.data?.detail || e.message}`
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 64px)' }}>
      <div className="page-header animate-fade-up">
        <h1>AI Sales Analyst</h1>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
          <span style={{ fontSize:11, background:'rgba(0,214,143,0.12)', color:'var(--success)', border:'1px solid rgba(0,214,143,0.25)', padding:'2px 10px', borderRadius:99, fontFamily:'var(--font-mono)', fontWeight:600 }}>
            FREE · Gemini 1.5 Flash
          </span>
          <a href="https://aistudio.google.com" target="_blank" rel="noreferrer"
            style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:3, textDecoration:'none' }}>
            Get free API key <ExternalLink size={10} />
          </a>
        </div>
      </div>

      {/* Chat messages */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:16, paddingBottom:16 }}>
        {messages.length === 0 ? (
          <div className="animate-fade-up" style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:32, gap:20 }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(0,229,255,0.1)', border:'1px solid rgba(0,229,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Sparkles size={22} style={{ color:'var(--accent)' }} />
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontWeight:700, fontSize:17 }}>Ask your sales data anything</p>
              <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:4 }}>Powered by Google Gemini — completely free</p>
            </div>

            {/* Free key setup tip */}
            <div style={{ background:'rgba(0,214,143,0.06)', border:'1px solid rgba(0,214,143,0.2)', borderRadius:'var(--radius)', padding:'14px 18px', maxWidth:520, width:'100%' }}>
              <p style={{ fontSize:12, color:'var(--success)', fontWeight:700, marginBottom:6 }}>🆓 Setup free AI (30 seconds)</p>
              <ol style={{ paddingLeft:16, color:'var(--text-muted)', fontSize:12, lineHeight:2 }}>
                <li>Go to <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color:'var(--accent)' }}>aistudio.google.com</a> → sign in with Google</li>
                <li>Click <b style={{ color:'var(--text)' }}>"Get API Key"</b> → <b style={{ color:'var(--text)' }}>"Create API key"</b></li>
                <li>Copy the key, then in your terminal run:<br />
                  <code style={{ background:'var(--surface2)', padding:'2px 8px', borderRadius:4, fontFamily:'var(--font-mono)', color:'var(--accent)', fontSize:11 }}>
                    export GEMINI_API_KEY=your_key_here
                  </code>
                </li>
                <li>Restart the backend: <code style={{ background:'var(--surface2)', padding:'2px 8px', borderRadius:4, fontFamily:'var(--font-mono)', color:'var(--accent)', fontSize:11 }}>uvicorn main:app --reload</code></li>
              </ol>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:10, width:'100%', maxWidth:680 }}>
              {STARTERS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)',
                  padding:'11px 14px', textAlign:'left', color:'var(--text-muted)', fontSize:13,
                  cursor:'pointer', transition:'all 0.15s', fontFamily:'var(--font-display)'
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--text)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="animate-fade-up" style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                background: m.role==='user' ? 'rgba(124,58,237,0.2)' : 'rgba(0,229,255,0.1)',
                border: `1px solid ${m.role==='user' ? 'rgba(124,58,237,0.4)' : 'rgba(0,229,255,0.3)'}` }}>
                {m.role==='user' ? <User size={14} style={{ color:'#7c3aed' }} /> : <Bot size={14} style={{ color:'var(--accent)' }} />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:5, fontWeight:600 }}>
                  {m.role==='user' ? 'You' : 'Gemini AI Analyst'}
                </div>
                <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'13px 16px', fontSize:14, lineHeight:1.75, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                  {m.content}
                </div>
                {m.sqlResult && !m.sqlResult.error && m.sqlResult.rows?.length > 0 && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, fontSize:11, color:'var(--text-muted)' }}>
                      <Database size={11} /> SQL result · {m.sqlResult.total_rows} rows
                    </div>
                    <div style={{ overflowX:'auto', border:'1px solid var(--border)', borderRadius:8 }}>
                      <table style={{ borderCollapse:'collapse', fontSize:12, width:'100%' }}>
                        <thead>
                          <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--surface2)' }}>
                            {m.sqlResult.columns?.map(c => (
                              <th key={c} style={{ padding:'6px 12px', textAlign:'left', color:'var(--text-muted)', fontWeight:600, fontFamily:'var(--font-mono)', whiteSpace:'nowrap' }}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {m.sqlResult.rows?.slice(0,10).map((row,ri) => (
                            <tr key={ri} style={{ borderBottom:'1px solid var(--border)' }}>
                              {m.sqlResult.columns?.map(c => (
                                <td key={c} style={{ padding:'6px 12px', fontFamily:'var(--font-mono)', color:'var(--text)' }}>
                                  {typeof row[c]==='number' ? row[c].toLocaleString() : String(row[c] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(0,229,255,0.1)', border:'1px solid rgba(0,229,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Bot size={14} style={{ color:'var(--accent)' }} />
            </div>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 18px' }}>
              <div style={{ display:'flex', gap:5 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', opacity:0.6,
                    animation:`pulse-glow 1.2s ${i*0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:14, display:'flex', gap:10 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
          placeholder="Ask about your sales data…"
          style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
            padding:'11px 16px', color:'var(--text)', fontSize:14, outline:'none', transition:'border-color 0.15s' }}
          onFocus={e => e.target.style.borderColor='var(--accent)'}
          onBlur={e => e.target.style.borderColor='var(--border)'} />
        <button className="btn btn-primary" onClick={() => send()} disabled={!input.trim() || loading} style={{ padding:'11px 18px' }}>
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
