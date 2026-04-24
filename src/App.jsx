import { useState, useEffect, useCallback, useRef } from 'react'
import AgentChat from './components/AgentChat.jsx'
import ScriptNavigator from './components/ScriptNavigator.jsx'
import DiagnoseStory from './components/DiagnoseStory.jsx'
import NewStory from './components/NewStory.jsx'

const IMA360_LOGO = `data:image/jpeg;base64,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`

const TABS = [
  { id:'agent',     label:'Agent Chat',       badge:'AI',
    icon:<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 6.5h5M5.5 9.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  { id:'diagnose',  label:'Diagnose Story',   badge:'AI',
    icon:<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v4l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/></svg> },
  { id:'newstory',  label:'New Story',        badge:'AI',
    icon:<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  { id:'navigator', label:'Script Navigator', badge:null,
    icon:<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
]

// Animated tab indicator
function TabBar({ tab, onTabChange }) {
  const [indicatorStyle, setIndicatorStyle] = useState({})
  const tabRefs = useRef({})

  useEffect(() => {
    const el = tabRefs.current[tab]
    if (el) {
      setIndicatorStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
        opacity: 1,
      })
    }
  }, [tab])

  return (
    <nav style={{ display:'flex', alignItems:'stretch', position:'relative' }}>
      {/* Sliding indicator */}
      <div style={{
        position:'absolute', bottom:0, height:2,
        background:'rgba(255,255,255,0.8)',
        borderRadius:'2px 2px 0 0',
        transition:'left 0.25s cubic-bezier(0.34,1.2,0.64,1), width 0.25s cubic-bezier(0.34,1.2,0.64,1)',
        ...indicatorStyle,
      }} />

      {TABS.map(t => (
        <button
          key={t.id}
          ref={el => tabRefs.current[t.id] = el}
          onClick={() => onTabChange(t.id)}
          className="tab-btn"
          style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'0 16px', height:54,
            fontSize:12, fontWeight: tab===t.id ? 600 : 400,
            color: tab===t.id ? '#fff' : 'rgba(255,255,255,0.55)',
            background: 'transparent',
            border:'none', cursor:'pointer',
            fontFamily:'var(--font)',
            letterSpacing:'-0.01em',
            transition:'color 0.15s ease, background 0.15s ease',
          }}
        >
          <span style={{ opacity: tab===t.id ? 1 : 0.7, transition:'opacity .15s' }}>{t.icon}</span>
          {t.label}
          {t.badge && (
            <span style={{
              fontSize:9, fontWeight:700, padding:'1px 5px',
              borderRadius:4, letterSpacing:'0.02em',
              background: tab===t.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
              color: tab===t.id ? '#fff' : 'rgba(255,255,255,0.6)',
              transition:'all .15s',
            }}>{t.badge}</span>
          )}
        </button>
      ))}
    </nav>
  )
}

// Animated page wrapper
function PageTransition({ children, tabKey }) {
  const [rendered, setRendered] = useState(false)
  useEffect(() => { setRendered(false); const t = setTimeout(() => setRendered(true), 10); return () => clearTimeout(t) }, [tabKey])
  return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column', overflow:'auto',
      opacity: rendered ? 1 : 0,
      transform: rendered ? 'translateY(0)' : 'translateY(6px)',
      transition:'opacity 0.2s ease, transform 0.2s ease',
    }}>
      {children}
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('agent')
  const [memories, setMemories] = useState([])

  const loadMemories = useCallback(async () => {
    try {
      const r = await fetch('/api/memory')
      const d = await r.json()
      if (d.memories) setMemories(d.memories)
    } catch (e) {
      try {
        await fetch('/api/init-db')
        const r = await fetch('/api/memory')
        const d = await r.json()
        if (d.memories) setMemories(d.memories)
      } catch(e2) {}
    }
  }, [])

  useEffect(() => { loadMemories() }, [loadMemories])

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'var(--bg)' }}>

      {/* ── Header ── */}
      <header style={{
        background:'var(--navy)',
        color:'#fff',
        display:'flex',
        alignItems:'stretch',
        height:54,
        flexShrink:0,
        boxShadow:'0 1px 0 rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.12)',
        position:'relative',
        zIndex:10,
      }}>

        {/* Logo + wordmark */}
        <div style={{
          display:'flex', alignItems:'center', gap:10,
          padding:'0 20px', marginRight:4,
          borderRight:'1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            width:30, height:30, borderRadius:8,
            background:'rgba(255,255,255,0.12)',
            border:'1px solid rgba(255,255,255,0.15)',
            display:'flex', alignItems:'center', justifyContent:'center',
            overflow:'hidden', padding:3,
            flexShrink:0,
          }}>
            <img src={IMA360_LOGO} alt="IMA360" style={{ width:24, height:24, objectFit:'contain' }} />
          </div>
          <div>
            <div style={{
              fontSize:13, fontWeight:700, lineHeight:1.15,
              letterSpacing:'-0.02em', color:'#fff',
            }}>
              IMA360 QA
            </div>
            <div style={{
              fontSize:9, opacity:0.45, letterSpacing:'0.08em',
              textTransform:'uppercase', fontWeight:500,
            }}>
              Customer Rebates
            </div>
          </div>
        </div>

        {/* Tabs with sliding indicator */}
        <TabBar tab={tab} onTabChange={setTab} />
      </header>

      {/* ── Content with page transition ── */}
      <PageTransition tabKey={tab}>
        {tab === 'agent'     && <AgentChat     memories={memories} onMemoryChange={loadMemories} />}
        {tab === 'diagnose'  && <DiagnoseStory memories={memories} onMemoryChange={loadMemories} />}
        {tab === 'newstory'  && <NewStory      memories={memories} onMemoryChange={loadMemories} />}
        {tab === 'navigator' && <ScriptNavigator />}
      </PageTransition>
    </div>
  )
}
