import React, { useEffect, useMemo, useState } from 'react'

const API = {
  getPolicy: async () => (await fetch('/api/policy')).json(),
  setPolicy: async (fixActive) => (
    await fetch('/api/policy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fixActive }) })
  ).json(),
  getLogs: async () => (await fetch('/api/logs')).json(),
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
    await API.setPolicy(next)
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
    <div style={{border: '1px solid #ddd', padding: 12, borderRadius: 8}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h3 style={{margin:0}}>Attacker Console (latest 200)</h3>
        <button onClick={load}>Refresh</button>
      </div>
      <small>Shows requests captured by attacker server (port 4000). Referer column highlights leaked query params.</small>
      <table style={{width:'100%', marginTop:8, borderCollapse:'collapse'}}>
        <thead>
          <tr>
            <th style={{textAlign:'left', borderBottom:'1px solid #eee'}}>Time</th>
            <th style={{textAlign:'left', borderBottom:'1px solid #eee'}}>Path</th>
            <th style={{textAlign:'left', borderBottom:'1px solid #eee'}}>Referer</th>
          </tr>
        </thead>
        <tbody>
          {items.map((x) => (
            <tr key={x._id}>
              <td style={{padding:'6px 4px'}}>{new Date(x.createdAt).toLocaleString()}</td>
              <td style={{padding:'6px 4px'}}>{x.url}</td>
              <td style={{padding:'6px 4px', maxWidth: 460, wordBreak:'break-all'}}>
                <code>{x.referer || '(none)'}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function App() {
  const { fixActive, toggle } = usePolicy()
  const [token, setToken] = useState('abc123')
  const [query, setQuery] = useState('benh_nhay_cam')
  const [refreshKey, bump] = useState(0)

  const currentUrlWithToken = useMemo(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('token', token)
    return url.toString()
  }, [token])

  const applyUrlWithToken = () => {
    window.history.replaceState({}, '', currentUrlWithToken)
  }

  const attackerPixel = `http://localhost:4000/collect.gif?from=img` // another origin
  const attackerLanding = 'http://localhost:4000/landing'

  return (
    <div style={{maxWidth: 960, margin:'20px auto', fontFamily:'Inter, system-ui, Arial'}}>
      <h1>Referrer Policy & Privacy Demo</h1>
      <p>
        Mục tiêu: minh hoạ rò rỉ tham số nhạy cảm qua HTTP Referer, và cách khắc phục bằng <code>Referrer-Policy: no-referrer</code>.
      </p>

      <section style={{display:'flex', gap:12, alignItems:'center'}}>
        <strong>Fix mode:</strong>
        <span style={{color: fixActive ? 'green' : 'red'}}>{String(fixActive)}</span>
        <button onClick={async ()=>{ await toggle(); bump(k=>k+1) }}>
          {fixActive ? 'Disable fix' : 'Enable fix'}
        </button>
      </section>

      <hr />

      <section>
        <h2>1) Magic link / reset token trong URL</h2>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <label>Token</label>
          <input value={token} onChange={(e)=>setToken(e.target.value)} />
          <button onClick={applyUrlWithToken}>Đưa token vào URL hiện tại</button>
        </div>
        <p>
          Với token xuất hiện trong URL, nếu trang tải tài nguyên từ domain khác,
          trình duyệt có thể gửi <code>Referer</code> chứa full URL (bao gồm token).
        </p>
        <div style={{display:'flex', gap:24, alignItems:'center'}}>
          <div>
            <p>Ảnh tải từ attacker server:</p>
            {fixActive ? (
              <img src={attackerPixel} alt="pixel" referrerPolicy="no-referrer" />
            ) : (
              <img src={attackerPixel} alt="pixel" />
            )}
          </div>
          <div>
            <p>Đi sang attacker landing:</p>
            {fixActive ? (
              <a href={attackerLanding} rel="noreferrer" target="_blank">Open attacker (no-referrer)</a>
            ) : (
              <a href={attackerLanding} target="_blank">Open attacker (leaks Referer)</a>
            )}
          </div>
        </div>
      </section>

      <hr />

      <section>
        <h2>2) Trang tìm kiếm có query nhạy cảm</h2>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <label>q</label>
          <input value={query} onChange={(e)=>setQuery(e.target.value)} />
          <button onClick={()=>{
            const u = new URL(window.location.href)
            u.searchParams.set('q', query)
            window.history.replaceState({}, '', u.toString())
          }}>Đưa q vào URL</button>
        </div>
        <p>
          Click outbound link sẽ gửi Referer chứa <code>q</code> nếu không chặn.
        </p>
        <div>
          {fixActive ? (
            <a href={attackerLanding + '?from=search'} rel="noreferrer" target="_blank">Xem thêm (no-referrer)</a>
          ) : (
            <a href={attackerLanding + '?from=search'} target="_blank">Xem thêm (có thể leak)</a>
          )}
        </div>
      </section>

      <hr />

      <section>
        <h2>Attacker Console</h2>
        <LogsPanel refreshKey={refreshKey} />
        <p>
          Trước khi fix: cột Referer sẽ hiển thị URL đầy đủ (bao gồm <code>?token=...</code> / <code>?q=...</code>).
          Sau khi bật fix: trường Referer sẽ trống.
        </p>
      </section>

      <footer style={{marginTop: 24, color:'#666'}}>
        Backend: <code>http://localhost:3001</code>, Attacker: <code>http://localhost:4000</code>
      </footer>
    </div>
  )
}
