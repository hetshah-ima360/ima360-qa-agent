import { useState, useRef, useEffect, useCallback } from 'react'
import { buildSystemPrompt } from '../lib/systemPrompt.js'

const IMA360_LOGO = `data:image/jpeg;base64,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`

function Markdown({ text }) {
  if (!text) return null
  const lines = text.split('\n'); const elements = []; let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('### ')) { elements.push(<h4 key={i} style={{fontSize:13,fontWeight:600,color:'#0f172a',margin:'14px 0 6px'}}>{ri(line.slice(4))}</h4>); i++; continue }
    if (line.startsWith('## '))  { elements.push(<h3 key={i} style={{fontSize:14,fontWeight:600,color:'#0f172a',margin:'16px 0 6px'}}>{ri(line.slice(3))}</h3>); i++; continue }
    if (line.startsWith('```')) { const cl=[]; i++; while(i<lines.length&&!lines[i].startsWith('```')){cl.push(lines[i]);i++} i++; elements.push(<pre key={`c${i}`} style={{background:'#f1f5f9',padding:'10px 12px',borderRadius:6,fontSize:11,fontFamily:'monospace',overflow:'auto',margin:'8px 0',lineHeight:1.6,color:'#334155'}}>{cl.join('\n')}</pre>); continue }
    if (line.match(/^[-*] /)) { elements.push(<div key={i} style={{display:'flex',gap:8,marginBottom:3,lineHeight:1.6,fontSize:13,color:'#334155'}}><span style={{color:'#94a3b8',flexShrink:0}}>•</span><span>{ri(line.slice(2))}</span></div>); i++; continue }
    if (line.match(/^\d+\. /)) { const num=line.match(/^(\d+)\. /)[1]; elements.push(<div key={i} style={{display:'flex',gap:8,marginBottom:3,lineHeight:1.6,fontSize:13,color:'#334155'}}><span style={{color:'#94a3b8',flexShrink:0,minWidth:14,textAlign:'right'}}>{num}.</span><span>{ri(line.replace(/^\d+\. /,''))}</span></div>); i++; continue }
    if (!line.trim()) { elements.push(<div key={i} style={{height:8}}/>); i++; continue }
    elements.push(<p key={i} style={{fontSize:13,lineHeight:1.65,color:'#334155',margin:'4px 0'}}>{ri(line)}</p>); i++
  }
  return <>{elements}</>
}
function ri(text) {
  const parts=[]; let rem=text, key=0
  while(rem){ const bm=rem.match(/\*\*(.+?)\*\*/),cm=rem.match(/`(.+?)`/); const bi=bm?rem.indexOf(bm[0]):Infinity,ci=cm?rem.indexOf(cm[0]):Infinity
    if(bi===Infinity&&ci===Infinity){parts.push(rem);break}
    if(bi<=ci&&bm){if(bi>0)parts.push(rem.slice(0,bi));parts.push(<strong key={key++} style={{fontWeight:600,color:'#0f172a'}}>{bm[1]}</strong>);rem=rem.slice(bi+bm[0].length)}
    else if(cm){if(ci>0)parts.push(rem.slice(0,ci));parts.push(<code key={key++} style={{fontSize:11,background:'#f1f5f9',padding:'1px 5px',borderRadius:3,fontFamily:'monospace',color:'#475569'}}>{cm[1]}</code>);rem=rem.slice(ci+cm[0].length)}
  }
  return parts.length===1&&typeof parts[0]==='string'?parts[0]:parts
}

function timeAgo(d) {
  const diff=Date.now()-new Date(d).getTime(), m=Math.floor(diff/60000), h=Math.floor(m/60), day=Math.floor(h/24)
  if(day>0) return `${day}d ago`; if(h>0) return `${h}h ago`; if(m>0) return `${m}m ago`; return 'just now'
}

export default function AgentChat({ memories, onMemoryChange }) {
  const [sessions, setSessions]           = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [sidebarOpen, setSidebarOpen]     = useState(true)
  const endRef = useRef(null); const inputRef = useRef(null)

  useEffect(() => { fetchSessions() }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])

  const fetchSessions = async () => {
    setLoadingSessions(true)
    try { const r=await fetch('/api/sessions'); const d=await r.json(); setSessions(d.sessions||[]) }
    catch(e){ console.error(e) } finally { setLoadingSessions(false) }
  }

  const loadSession = async (sessionId) => {
    setActiveSession(sessionId); setMessages([])
    try { const r=await fetch(`/api/sessions?id=${sessionId}`); const d=await r.json(); setMessages((d.messages||[]).map(m=>({role:m.role,content:m.content}))) }
    catch(e){ console.error(e) }
  }

  const newSession = async () => {
    try {
      const r=await fetch('/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'New conversation'})})
      const d=await r.json(); setActiveSession(d.session.id); setMessages([]); setSessions(prev=>[d.session,...prev]); inputRef.current?.focus()
    } catch(e){ console.error(e) }
  }

  const deleteSession = async (e, sid) => {
    e.stopPropagation()
    await fetch(`/api/sessions?id=${sid}`,{method:'DELETE'})
    setSessions(prev=>prev.filter(s=>s.id!==sid))
    if(activeSession===sid){setActiveSession(null);setMessages([])}
  }

  const sendMessage = useCallback(async (text) => {
    const userText = text || input.trim()
    if (!userText || loading) return
    setInput('')

    let sessionId = activeSession
    if (!sessionId) {
      try {
        const r=await fetch('/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'New conversation'})})
        const d=await r.json(); sessionId=d.session.id; setActiveSession(sessionId); setSessions(prev=>[d.session,...prev])
      } catch(e){ return }
    }

    const newMessages = [...messages, { role:'user', content:userText }]
    setMessages(newMessages); setLoading(true)

    // Persist user message + refresh session list
    fetch(`/api/sessions?id=${sessionId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'user',content:userText})})
      .then(()=>fetchSessions()).catch(console.error)

    try {
      const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        model:'claude-sonnet-4-20250514', max_tokens:4000,
        system: buildSystemPrompt(memories),
        messages: newMessages.map(m=>({role:m.role,content:m.content})),
      })})
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error||`HTTP ${r.status}`)
      const assistantText = (data.content||[]).map(b=>b.text||'').join('')
      setMessages(prev=>[...prev,{role:'assistant',content:assistantText}])

      // Persist assistant message
      fetch(`/api/sessions?id=${sessionId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'assistant',content:assistantText})}).catch(console.error)

      // Save to memory on first message
      if(newMessages.filter(m=>m.role==='user').length===1){
        fetch('/api/memory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'chat',title:userText.slice(0,120),content:assistantText.slice(0,500),module:''})})
          .then(()=>onMemoryChange?.()).catch(()=>{})
      }
    } catch(err) {
      setMessages(prev=>[...prev,{role:'assistant',content:`**Error:** ${err.message}`}])
    } finally { setLoading(false) }
  }, [input, messages, memories, loading, onMemoryChange, activeSession])

  const handleKeyDown = (e) => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()} }
  const isEmpty = messages.length === 0

  return (
    <div style={{display:'flex',flex:1,overflow:'hidden',background:'#F7F6F3',height:'calc(100vh - 54px)'}}>

      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{width:240,flexShrink:0,borderRight:'1px solid #E4E1D9',background:'#fff',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'12px 12px 8px',borderBottom:'1px solid #E4E1D9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:11,fontWeight:700,color:'#6B6860',textTransform:'uppercase',letterSpacing:'0.06em'}}>Conversations</span>
            <button onClick={newSession} title="New chat" style={{width:26,height:26,borderRadius:6,background:'#1C2B4A',color:'#fff',border:'none',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:300,lineHeight:1}}>+</button>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {loadingSessions && <div style={{padding:'20px',textAlign:'center',fontSize:11,color:'#9B9890'}}>Loading...</div>}
            {!loadingSessions && sessions.length===0 && (
              <div style={{padding:'20px 12px',fontSize:11,color:'#9B9890',textAlign:'center',lineHeight:1.6}}>No conversations yet.<br/>Click + to start one.</div>
            )}
            {sessions.map(s=>(
              <div key={s.id} onClick={()=>loadSession(s.id)} style={{padding:'9px 10px',cursor:'pointer',borderBottom:'1px solid #F0EEE9',background:activeSession===s.id?'#EBF1FF':'transparent',transition:'background .1s',display:'flex',alignItems:'flex-start',gap:6}}
                onMouseOver={e=>{if(activeSession!==s.id)e.currentTarget.style.background='#F7F6F3'}}
                onMouseOut={e=>{if(activeSession!==s.id)e.currentTarget.style.background='transparent'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:500,color:activeSession===s.id?'#1C2B4A':'#1A1916',lineHeight:1.4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.title||'Untitled'}</div>
                  <div style={{fontSize:10,color:'#9B9890',marginTop:2}}>{s.message_count} msg · {timeAgo(s.updated_at||s.created_at)}</div>
                </div>
                <button onClick={e=>deleteSession(e,s.id)} style={{flexShrink:0,width:18,height:18,border:'none',background:'transparent',color:'#C8C4BB',cursor:'pointer',fontSize:14,padding:0,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:3}} title="Delete">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <div style={{position:'absolute',left:sidebarOpen?228:8,top:62,zIndex:10}}>
        <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{width:22,height:22,border:'1px solid #E4E1D9',borderRadius:4,background:'#fff',cursor:'pointer',fontSize:11,color:'#6B6860',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {sidebarOpen?'‹':'›'}
        </button>
      </div>

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto',padding:isEmpty?'0':'20px 0'}}>
          <div style={{maxWidth:780,margin:'0 auto',padding:'0 32px'}}>

            {isEmpty && (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'calc(100vh - 200px)',textAlign:'center'}}>
                <div style={{width:72,height:72,borderRadius:18,background:'#1C2B4A',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20,boxShadow:'0 8px 24px rgba(28,43,74,0.25)',overflow:'hidden',padding:10}}>
                  <img src={IMA360_LOGO} alt="IMA360" style={{width:52,height:52,objectFit:'contain'}} />
                </div>
                <h2 style={{fontSize:22,fontWeight:700,color:'#1C2B4A',marginBottom:8,letterSpacing:'-0.02em'}}>IMA360 QA Agent</h2>
                <p style={{fontSize:13,color:'#64748b',maxWidth:400,lineHeight:1.7,marginBottom:20}}>
                  Ask me anything about Customer Rebates — diagnose issues, enhance requirements, generate test scenarios, or find the right BPML scripts.
                </p>
                {!activeSession && (
                  <button onClick={newSession} style={{padding:'9px 20px',fontSize:13,fontWeight:600,background:'#1C2B4A',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
                    Start a conversation
                  </button>
                )}
              </div>
            )}

            {messages.map((msg,i)=>(
              <div key={i} style={{marginBottom:20,display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start'}}>
                {msg.role==='assistant' && (
                  <div style={{width:28,height:28,borderRadius:8,background:'#1C2B4A',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginRight:10,marginTop:2,overflow:'hidden',padding:3}}>
                    <img src={IMA360_LOGO} alt="IMA360" style={{width:22,height:22,objectFit:'contain'}} />
                  </div>
                )}
                <div style={{maxWidth:msg.role==='user'?'72%':'calc(100% - 38px)',padding:msg.role==='user'?'10px 16px':'2px 0',background:msg.role==='user'?'#1C2B4A':'transparent',color:msg.role==='user'?'#fff':'#0f172a',borderRadius:msg.role==='user'?'18px 18px 4px 18px':0,fontSize:13,lineHeight:1.6}}>
                  {msg.role==='user' ? msg.content : <Markdown text={msg.content} />}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{display:'flex',gap:6,padding:'12px 0 12px 38px',alignItems:'center'}}>
                <div style={{display:'flex',gap:4}}>{[0,1,2].map(i=>(<div key={i} style={{width:7,height:7,borderRadius:'50%',background:'#94a3b8',animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}} />))}</div>
                <span style={{fontSize:12,color:'#94a3b8',marginLeft:4}}>Thinking...</span>
                <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* Input */}
        <div style={{borderTop:'1px solid #e2e8f0',background:'#fff',padding:'14px 24px',flexShrink:0}}>
          <div style={{maxWidth:780,margin:'0 auto',display:'flex',gap:10,alignItems:'flex-end'}}>
            <div style={{flex:1,display:'flex',alignItems:'flex-end',border:'1px solid #cbd5e1',borderRadius:12,background:'#fff',padding:'4px 4px 4px 14px',transition:'border-color .15s'}}>
              <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={activeSession?"Ask about Customer Rebates...":"Start typing to begin..."}
                rows={1} style={{flex:1,border:'none',outline:'none',resize:'none',fontSize:14,lineHeight:1.5,padding:'8px 0',maxHeight:120,fontFamily:'inherit',background:'transparent',color:'#0f172a'}}
                onInput={e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'}} />
              <button onClick={()=>sendMessage()} disabled={!input.trim()||loading}
                style={{width:34,height:34,borderRadius:8,flexShrink:0,background:(!input.trim()||loading)?'#e2e8f0':'#1C2B4A',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:(!input.trim()||loading)?'not-allowed':'pointer',transition:'background .15s'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
          <div style={{maxWidth:780,margin:'6px auto 0',fontSize:10,color:'#94a3b8',textAlign:'center'}}>
            IMA360 Customer Rebates AI — powered by Claude · History saved automatically
          </div>
        </div>
      </div>
    </div>
  )
}
