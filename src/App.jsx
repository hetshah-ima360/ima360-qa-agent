import { useState, useEffect, useCallback } from 'react'
import AgentChat from './components/AgentChat.jsx'
import ScriptNavigator from './components/ScriptNavigator.jsx'
import DiagnoseStory from './components/DiagnoseStory.jsx'
import NewStory from './components/NewStory.jsx'

function Tab({ id, label, icon, badge, active, onClick }) {
  return (
    <button onClick={() => onClick(id)} style={{
      display:'flex',alignItems:'center',gap:7,padding:'9px 14px',fontSize:12,
      fontWeight:active?600:400,color:active?'#fff':'rgba(255,255,255,0.6)',
      background:active?'rgba(255,255,255,0.13)':'transparent',
      border:'none',borderRadius:8,cursor:'pointer',transition:'all .15s',fontFamily:'inherit',
    }}>
      {icon}{label}
      {badge&&<span style={{fontSize:9,fontWeight:600,padding:'1px 5px',borderRadius:4,background:'rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.9)'}}>{badge}</span>}
    </button>
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
      try { await fetch('/api/init-db'); const r = await fetch('/api/memory'); const d = await r.json(); if (d.memories) setMemories(d.memories) } catch(e2) {}
    }
  }, [])

  useEffect(() => { loadMemories() }, [loadMemories])

  return (
    <div style={{ display:'flex',flexDirection:'column',minHeight:'100vh' }}>
      <header style={{
        background:'#1F3864',color:'#fff',padding:'0 24px',
        display:'flex',alignItems:'center',gap:4,height:54,flexShrink:0,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginRight:14}}>
          <div style={{width:30,height:30,borderRadius:7,background:'rgba(255,255,255,0.14)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M3 4h14v2H3zM3 9h9v2H3zM3 14h11v2H3z" fill="#fff"/></svg>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:600,lineHeight:1.1}}>IMA360 QA Agent</div>
            <div style={{fontSize:10,opacity:.6}}>Customer Rebates</div>
          </div>
        </div>

        <Tab id="agent" label="Agent" active={tab==='agent'} onClick={setTab} badge="AI"
          icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 6.5h5M5.5 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>} />
        <Tab id="diagnose" label="Diagnose Story" active={tab==='diagnose'} onClick={setTab} badge="AI"
          icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v4l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/></svg>} />
        <Tab id="newstory" label="New Story" active={tab==='newstory'} onClick={setTab} badge="AI"
          icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>} />
        <Tab id="navigator" label="Script Navigator" active={tab==='navigator'} onClick={setTab}
          icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>} />
      </header>

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'auto'}}>
        {tab === 'agent' && <AgentChat memories={memories} onMemoryChange={loadMemories} />}
        {tab === 'diagnose' && <DiagnoseStory memories={memories} onMemoryChange={loadMemories} />}
        {tab === 'newstory' && <NewStory memories={memories} onMemoryChange={loadMemories} />}
        {tab === 'navigator' && <ScriptNavigator />}
      </div>
    </div>
  )
}
