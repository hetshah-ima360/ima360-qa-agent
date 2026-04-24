import { useState, useRef, useEffect, useCallback } from 'react'
import { buildSystemPrompt } from '../lib/systemPrompt.js'

const IMA360_LOGO = `data:image/jpeg;base64,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`

// ── Markdown-lite renderer ────────────────────────────────────
function Markdown({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} style={{fontSize:13,fontWeight:600,color:'#0f172a',margin:'14px 0 6px'}}>{renderInline(line.slice(4))}</h4>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} style={{fontSize:14,fontWeight:600,color:'#0f172a',margin:'16px 0 6px'}}>{renderInline(line.slice(3))}</h3>)
      i++; continue
    }
    if (line.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      i++
      elements.push(<pre key={`code-${i}`} style={{background:'#f1f5f9',padding:'10px 12px',borderRadius:6,fontSize:11,fontFamily:'monospace',overflow:'auto',margin:'8px 0',lineHeight:1.6,color:'#334155'}}>{codeLines.join('\n')}</pre>)
      continue
    }
    if (line.match(/^[-*] /)) {
      elements.push(<div key={i} style={{display:'flex',gap:8,marginBottom:3,lineHeight:1.6,fontSize:13,color:'#334155'}}><span style={{color:'#94a3b8',flexShrink:0}}>•</span><span>{renderInline(line.slice(2))}</span></div>)
      i++; continue
    }
    if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)[1]
      elements.push(<div key={i} style={{display:'flex',gap:8,marginBottom:3,lineHeight:1.6,fontSize:13,color:'#334155'}}><span style={{color:'#94a3b8',flexShrink:0,minWidth:14,textAlign:'right'}}>{num}.</span><span>{renderInline(line.replace(/^\d+\. /, ''))}</span></div>)
      i++; continue
    }
    if (!line.trim()) { elements.push(<div key={i} style={{height:8}} />); i++; continue }
    elements.push(<p key={i} style={{fontSize:13,lineHeight:1.65,color:'#334155',margin:'4px 0'}}>{renderInline(line)}</p>)
    i++
  }

  return <>{elements}</>
}

function renderInline(text) {
  const parts = []
  let remaining = text
  let key = 0
  while (remaining) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const codeMatch = remaining.match(/`(.+?)`/)
    const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity
    const codeIdx = codeMatch ? remaining.indexOf(codeMatch[0]) : Infinity

    if (boldIdx === Infinity && codeIdx === Infinity) { parts.push(remaining); break }

    if (boldIdx <= codeIdx && boldMatch) {
      if (boldIdx > 0) parts.push(remaining.slice(0, boldIdx))
      parts.push(<strong key={key++} style={{fontWeight:600,color:'#0f172a'}}>{boldMatch[1]}</strong>)
      remaining = remaining.slice(boldIdx + boldMatch[0].length)
    } else if (codeMatch) {
      if (codeIdx > 0) parts.push(remaining.slice(0, codeIdx))
      parts.push(<code key={key++} style={{fontSize:11,background:'#f1f5f9',padding:'1px 5px',borderRadius:3,fontFamily:'monospace',color:'#475569'}}>{codeMatch[1]}</code>)
      remaining = remaining.slice(codeIdx + codeMatch[0].length)
    }
  }
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts
}

// ═══════════════════════════════════════════════════════════════
// AgentChat
// ═══════════════════════════════════════════════════════════════
export default function AgentChat({ memories, onMemoryChange }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(async (text) => {
    const userText = text || input.trim()
    if (!userText || loading) return

    setInput('')
    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const systemPrompt = buildSystemPrompt(memories)
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: systemPrompt,
          messages: apiMessages,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`)

      const assistantText = (data.content || []).map(b => b.text || '').join('')
      setMessages(prev => [...prev, { role: 'assistant', content: assistantText }])

      // Auto-save first message to memory
      if (newMessages.filter(m => m.role === 'user').length === 1) {
        try {
          await fetch('/api/memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              kind: 'chat',
              title: userText.slice(0, 120),
              content: assistantText.slice(0, 500),
              module: '',
            }),
          })
          onMemoryChange?.()
        } catch (e) {}
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Error:** ${err.message}\n\nMake sure your ANTHROPIC_API_KEY is configured in Vercel environment variables.`
      }])
    } finally {
      setLoading(false)
    }
  }, [input, messages, memories, loading, onMemoryChange])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    inputRef.current?.focus()
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden',background:'#F7F6F3'}}>

      {/* Messages area */}
      <div style={{flex:1,overflowY:'auto',padding:isEmpty?'0':'20px 0'}}>
        <div style={{maxWidth:780,margin:'0 auto',padding:'0 24px'}}>

          {/* ── Empty state — logo + title only, no chips ── */}
          {isEmpty && (
            <div style={{
              display:'flex',flexDirection:'column',alignItems:'center',
              justifyContent:'center',minHeight:'calc(100vh - 200px)',
              textAlign:'center',
            }}>
              {/* Logo */}
              <div style={{
                width:72,height:72,borderRadius:18,
                background:'#1C2B4A',
                display:'flex',alignItems:'center',justifyContent:'center',
                marginBottom:20,
                boxShadow:'0 8px 24px rgba(28,43,74,0.25)',
                overflow:'hidden',
                padding:10,
              }}>
                <img
                  src={IMA360_LOGO}
                  alt="IMA360"
                  style={{width:52,height:52,objectFit:'contain'}}
                />
              </div>

              {/* Title */}
              <h2 style={{
                fontSize:22,fontWeight:700,
                color:'#1C2B4A',
                marginBottom:8,letterSpacing:'-0.02em',
              }}>
                IMA360 QA Agent
              </h2>

              {/* Subtitle */}
              <p style={{
                fontSize:13,color:'#64748b',
                maxWidth:400,lineHeight:1.7,marginBottom:0,
              }}>
                Ask me anything about Customer Rebates — diagnose issues,
                enhance requirements, generate test scenarios, explain data
                flows, or find the right BPML scripts.
              </p>
            </div>
          )}

          {/* ── Message history ── */}
          {messages.map((msg, i) => (
            <div key={i} style={{
              marginBottom:20,
              display:'flex',
              justifyContent:msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              {/* Assistant avatar */}
              {msg.role === 'assistant' && (
                <div style={{
                  width:28,height:28,borderRadius:8,background:'#1C2B4A',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  flexShrink:0,marginRight:10,marginTop:2,overflow:'hidden',padding:3,
                }}>
                  <img src={IMA360_LOGO} alt="IMA360" style={{width:22,height:22,objectFit:'contain'}} />
                </div>
              )}

              <div style={{
                maxWidth: msg.role === 'user' ? '72%' : 'calc(100% - 38px)',
                padding: msg.role === 'user' ? '10px 16px' : '2px 0',
                background: msg.role === 'user' ? '#1C2B4A' : 'transparent',
                color: msg.role === 'user' ? '#fff' : '#0f172a',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : 0,
                fontSize:13,lineHeight:1.6,
              }}>
                {msg.role === 'user' ? msg.content : <Markdown text={msg.content} />}
              </div>
            </div>
          ))}

          {/* Loading dots */}
          {loading && (
            <div style={{display:'flex',gap:6,padding:'12px 0 12px 38px',alignItems:'center'}}>
              <div style={{display:'flex',gap:4}}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width:7,height:7,borderRadius:'50%',background:'#94a3b8',
                    animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`,
                  }} />
                ))}
              </div>
              <span style={{fontSize:12,color:'#94a3b8',marginLeft:4}}>Thinking...</span>
              <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* ── Input bar ── */}
      <div style={{
        borderTop:'1px solid #e2e8f0',background:'#fff',
        padding:'14px 24px',flexShrink:0,
      }}>
        <div style={{maxWidth:780,margin:'0 auto',display:'flex',gap:10,alignItems:'flex-end'}}>
          {messages.length > 0 && (
            <button onClick={handleNewChat} title="New chat" style={{
              width:38,height:38,borderRadius:8,background:'#f1f5f9',
              border:'1px solid #e2e8f0',display:'flex',alignItems:'center',
              justifyContent:'center',cursor:'pointer',flexShrink:0,
              color:'#64748b',fontSize:18,fontWeight:300,
            }}>+</button>
          )}
          <div style={{
            flex:1,display:'flex',alignItems:'flex-end',
            border:'1px solid #cbd5e1',borderRadius:12,background:'#fff',
            padding:'4px 4px 4px 14px',transition:'border-color .15s',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about Customer Rebates..."
              rows={1}
              style={{
                flex:1,border:'none',outline:'none',resize:'none',
                fontSize:14,lineHeight:1.5,padding:'8px 0',
                maxHeight:120,fontFamily:'inherit',background:'transparent',color:'#0f172a',
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width:34,height:34,borderRadius:8,flexShrink:0,
                background:(!input.trim()||loading)?'#e2e8f0':'#1C2B4A',
                color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
                border:'none',cursor:(!input.trim()||loading)?'not-allowed':'pointer',
                transition:'background .15s',
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div style={{maxWidth:780,margin:'6px auto 0',fontSize:10,color:'#94a3b8',textAlign:'center'}}>
          IMA360 Customer Rebates AI — powered by Claude
        </div>
      </div>
    </div>
  )
}
