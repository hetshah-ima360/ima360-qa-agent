import { useState, useMemo, useRef } from 'react'
import { BPML_SCRIPTS, MODULES } from '../data/bpml_knowledge.js'

const CRITS = ['All', ...new Set(BPML_SCRIPTS.map(s => s.crit))]

const CRIT_COLORS = {
  Critical: { bg:'#fee2e2', fg:'#991b1b' },
  High: { bg:'#fef3c7', fg:'#92400e' },
  Medium: { bg:'#e0e7ff', fg:'#3730a3' },
  Low: { bg:'#f1f5f9', fg:'#475569' },
}

const MOD_COLORS = {
  'Contracts': '#1F3864',
  'Calculation Management': '#2B5EA7',
  'Accruals': '#0F6E56',
  'Payments': '#92600A',
  'Operational Reports': '#5B21B6',
  'Reporting & Analytics': '#475569',
  'Utilities': '#334155',
}

export default function ScriptNavigator() {
  const [query, setQuery] = useState('')
  const [modFilter, setModFilter] = useState('All')
  const [critFilter, setCritFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [personFilter, setPersonFilter] = useState('All')
  const [results, setResults] = useState(null)
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    if (!results && !query && modFilter === 'All' && critFilter === 'All') return null
    const q = query.toLowerCase()
    return BPML_SCRIPTS.filter(s => {
      if (modFilter !== 'All' && s.module !== modFilter) return false
      if (critFilter !== 'All' && s.crit !== critFilter) return false
      if (!q) return true
      return s.id.toLowerCase().includes(q) || s.fn.toLowerCase().includes(q) || s.submenu.toLowerCase().includes(q) || s.gist.toLowerCase().includes(q) || s.script.toLowerCase().includes(q) || s.module.toLowerCase().includes(q)
    })
  }, [query, modFilter, critFilter, results])

  function handleSearch() {
    setResults(filtered || BPML_SCRIPTS)
  }

  function handleClear() {
    setQuery(''); setModFilter('All'); setCritFilter('All')
    setResults(null); setSelected(null)
  }

  function browseModule(mod) {
    setModFilter(mod); setQuery('')
    setResults(BPML_SCRIPTS.filter(s => s.module === mod))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSearch()
  }

  const showResults = results !== null
  const displayList = filtered || []

  const grouped = useMemo(() => {
    if (!showResults) return {}
    const g = {}
    for (const s of displayList) {
      if (!g[s.module]) g[s.module] = []
      g[s.module].push(s)
    }
    return g
  }, [displayList, showResults])

  return (
    <div style={{flex:1,overflowY:'auto',background:'#fafbfc'}}>
      <div style={{maxWidth:960,margin:'0 auto',padding:'24px 24px 40px'}}>

        {/* Sync banner */}
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'12px 18px',background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,marginBottom:18,
        }}>
          <span style={{fontSize:12,color:'#64748b'}}>Data loaded from bpml_knowledge.js — {BPML_SCRIPTS.length} scripts available</span>
          <button style={{
            padding:'7px 14px',fontSize:12,background:'#fff',border:'1px solid #cbd5e1',
            borderRadius:6,color:'#475569',cursor:'pointer',fontFamily:'inherit',
          }}>Upload Excel to sync</button>
        </div>

        {/* Search panel */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:'18px 20px',marginBottom:20}}>
          <div style={{display:'flex',gap:10,marginBottom:14}}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by BPML ID, function, person, keyword..."
              style={{flex:1,height:40,padding:'0 14px',fontSize:13}}
            />
            <button onClick={handleSearch} style={{
              padding:'0 22px',height:40,background:'#1F3864',color:'#fff',borderRadius:6,
              fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
            }}>Search</button>
            <button onClick={handleClear} style={{
              padding:'0 16px',height:40,background:'#fff',border:'1px solid #cbd5e1',
              borderRadius:6,fontSize:13,color:'#475569',cursor:'pointer',fontFamily:'inherit',
            }}>Clear</button>
          </div>
          <div style={{display:'flex',gap:10}}>
            <select value={modFilter} onChange={e => setModFilter(e.target.value)} style={selStyle}>
              <option value="All">All</option>
              {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={critFilter} onChange={e => setCritFilter(e.target.value)} style={selStyle}>
              {CRITS.map(c => <option key={c} value={c}>{c === 'All' ? 'All' : c}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selStyle}>
              <option>All</option>
            </select>
            <select value={personFilter} onChange={e => setPersonFilter(e.target.value)} style={selStyle}>
              <option>All</option>
            </select>
          </div>
        </div>

        {/* Empty state — browse by module */}
        {!showResults && (
          <div style={{textAlign:'center',paddingTop:20}}>
            <p style={{fontSize:13,color:'#94a3b8',marginBottom:24}}>Search by BPML ID or keyword above, or browse a module below</p>
            <div style={{fontSize:11,fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:12}}>Browse by module</div>
            <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
              {MODULES.map(m => (
                <button key={m} onClick={() => browseModule(m)} style={{
                  padding:'8px 18px',fontSize:13,background:'#fff',border:'1px solid #e2e8f0',
                  borderRadius:20,color:'#475569',cursor:'pointer',fontFamily:'inherit',
                  transition:'all .15s',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor='#1F3864'; e.currentTarget.style.color='#1F3864' }}
                onMouseOut={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.color='#475569' }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {showResults && (
          <div style={{display:'grid',gridTemplateColumns: selected ? '1fr 400px' : '1fr',gap:18}}>
            {/* Script list */}
            <div>
              <div style={{fontSize:12,color:'#64748b',marginBottom:10}}>
                {displayList.length} script{displayList.length !== 1 ? 's' : ''} found
              </div>
              <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden'}}>
                {Object.entries(grouped).map(([mod, items]) => (
                  <div key={mod}>
                    <div style={{
                      padding:'10px 14px',background:MOD_COLORS[mod] || '#475569',
                      fontSize:11,fontWeight:600,color:'#fff',letterSpacing:'0.04em',
                    }}>
                      {mod.toUpperCase()} — {items.length}
                    </div>
                    {items.map(s => (
                      <div key={s.id} onClick={() => setSelected(s)} style={{
                        padding:'12px 16px',cursor:'pointer',borderTop:'1px solid #f1f5f9',
                        borderLeft: selected?.id === s.id ? '3px solid #1F3864' : '3px solid transparent',
                        background: selected?.id === s.id ? '#f0f4ff' : '#fff',
                        transition:'all .1s',
                      }}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                          <span style={{fontSize:12,fontWeight:600,fontFamily:'monospace',color:'#1F3864'}}>{s.id}</span>
                          {s.driveLink && <span style={{fontSize:10,color:'#2B5EA7'}}>↗</span>}
                          <span style={{
                            fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:500,
                            background:CRIT_COLORS[s.crit]?.bg || '#f1f5f9',
                            color:CRIT_COLORS[s.crit]?.fg || '#475569',
                            marginLeft:'auto',
                          }}>{s.crit}</span>
                        </div>
                        <div style={{fontSize:12,color:'#0f172a'}}>{s.submenu}</div>
                        <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{s.fn}</div>
                      </div>
                    ))}
                  </div>
                ))}
                {displayList.length === 0 && (
                  <div style={{padding:40,textAlign:'center',fontSize:13,color:'#94a3b8'}}>No scripts match</div>
                )}
              </div>
            </div>

            {/* Detail panel */}
            {selected && (
              <div style={{position:'sticky',top:20,alignSelf:'start'}}>
                <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:'20px 22px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:16,fontWeight:600,fontFamily:'monospace',color:'#1F3864'}}>{selected.id}</span>
                    <button onClick={() => setSelected(null)} style={{
                      width:24,height:24,borderRadius:4,background:'transparent',
                      border:'none',cursor:'pointer',color:'#94a3b8',fontSize:16,
                    }}>×</button>
                  </div>
                  <div style={{fontSize:12,color:'#64748b',marginBottom:14}}>
                    {selected.module} &gt; {selected.submenu}
                  </div>

                  <div style={{
                    display:'inline-flex',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:500,
                    background:CRIT_COLORS[selected.crit]?.bg,color:CRIT_COLORS[selected.crit]?.fg,
                    marginBottom:14,
                  }}>{selected.crit}</div>

                  <div style={{marginBottom:14}}>
                    <div style={labelStyle}>Function</div>
                    <div style={{fontSize:13,color:'#0f172a'}}>{selected.fn}</div>
                  </div>

                  <div style={{marginBottom:14}}>
                    <div style={labelStyle}>Test script</div>
                    <div style={{fontSize:11,fontFamily:'monospace',color:'#475569',background:'#f8fafc',padding:'8px 10px',borderRadius:4,lineHeight:1.5,wordBreak:'break-all'}}>
                      {selected.script}
                    </div>
                  </div>

                  <div style={{marginBottom:16}}>
                    <div style={labelStyle}>Gist</div>
                    <div style={{fontSize:12,color:'#475569',lineHeight:1.6}}>{selected.gist}</div>
                  </div>

                  {selected.driveLink ? (
                    <a href={selected.driveLink} target="_blank" rel="noopener noreferrer" style={{
                      display:'inline-flex',alignItems:'center',gap:8,
                      padding:'10px 18px',background:'#1a73e8',color:'#fff',
                      borderRadius:6,textDecoration:'none',fontSize:13,fontWeight:500,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M7.71 3.5L1.15 15l3.43 5.93L10.14 9.43z" fill="#fff" opacity=".9"/>
                        <path d="M16.29 3.5H7.71l5.57 9.63h8.57z" fill="#fff" opacity=".7"/>
                        <path d="M22.85 15H4.58l3.43 5.93h14.28z" fill="#fff" opacity=".8"/>
                      </svg>
                      Open in Google Drive
                    </a>
                  ) : (
                    <div style={{fontSize:12,color:'#94a3b8',fontStyle:'italic'}}>No Drive link available</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const selStyle = {
  flex:1,height:36,padding:'0 10px',fontSize:12,
  border:'1px solid #cbd5e1',borderRadius:6,background:'#fff',
  fontFamily:'inherit',color:'#475569',cursor:'pointer',
}

const labelStyle = {
  fontSize:10,fontWeight:600,color:'#64748b',
  textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4,
}
