import { useState, useRef, useEffect, useCallback } from 'react'
import { buildSystemPrompt } from '../lib/systemPrompt.js'

// ── Markdown-lite renderer (bold, code, headers, lists) ──────────────────
function Markdown({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Headers
    if (line.startsWith('### ')) { elements.push(<h4 key={i} style={{fontSize:13,fontWeight:600,color:'#0f172a',margin:'14px 0 6px'}}>{renderInline(line.slice(4))}</h4>); i++; continue }
    if (line.startsWith('## ')) { elements.push(<h3 key={i} style={{fontSize:14,fontWeight:600,color:'#0f172a',margin:'16px 0 6px'}}>{renderInline(line.slice(3))}</h3>); i++; continue }

    // Code block
    if (line.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      i++
      elements.push(<pre key={`code-${i}`} style={{background:'#f1f5f9',padding:'10px 12px',borderRadius:6,fontSize:11,fontFamily:'monospace',overflow:'auto',margin:'8px 0',lineHeight:1.6,color:'#334155'}}>{codeLines.join('\n')}</pre>)
      continue
    }

    // Bullet list
    if (line.match(/^[-*] /)) {
      elements.push(<div key={i} style={{display:'flex',gap:8,marginBottom:3,lineHeight:1.6,fontSize:13,color:'#334155'}}><span style={{color:'#94a3b8',flexShrink:0}}>•</span><span>{renderInline(line.slice(2))}</span></div>)
      i++; continue
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)[1]
      elements.push(<div key={i} style={{display:'flex',gap:8,marginBottom:3,lineHeight:1.6,fontSize:13,color:'#334155'}}><span style={{color:'#94a3b8',flexShrink:0,minWidth:14,textAlign:'right'}}>{num}.</span><span>{renderInline(line.replace(/^\d+\. /, ''))}</span></div>)
      i++; continue
    }

    // Empty line
    if (!line.trim()) { elements.push(<div key={i} style={{height:8}} />); i++; continue }

    // Normal paragraph
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
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // Inline code
    const codeMatch = remaining.match(/`(.+?)`/)

    const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity
    const codeIdx = codeMatch ? remaining.indexOf(codeMatch[0]) : Infinity

    if (boldIdx === Infinity && codeIdx === Infinity) {
      parts.push(remaining)
      break
    }

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

// ── Suggestion chips for empty state ─────────────────────────────────────
const SUGGESTIONS = [
  "Diagnose: Rebate tolerance not blocking correctly after accrual reversal",
  "Enhance requirement: track user last login in security setup",
  "Write test scenarios for contract pending change approval",
  "Explain the data flow from Calculation to Accrual Postings",
  "Which BPML scripts cover the exception management lifecycle?",
  "What happens downstream if accrual amounts are wrong?",
]

// ═══════════════════════════════════════════════════════════════════════════
// AgentChat — multi-turn conversational interface
// ═══════════════════════════════════════════════════════════════════════════
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

      // Build conversation history for multi-turn
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content,
      }))

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

      // Auto-save first user message of each conversation to memory
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
        } catch (e) { /* ok if memory save fails */ }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${err.message}\n\nMake sure your ANTHROPIC_API_KEY is configured in Vercel environment variables.` }])
    } finally {
      setLoading(false)
    }
  }, [input, messages, memories, loading, onMemoryChange])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    inputRef.current?.focus()
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>

      {/* Messages area */}
      <div style={{flex:1,overflowY:'auto',padding:isEmpty?'0':'20px 0'}}>
        <div style={{maxWidth:780,margin:'0 auto',padding:'0 24px'}}>

          {/* Empty state */}
          {isEmpty && (
            <div style={{
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
              minHeight:'calc(100vh - 200px)',textAlign:'center',
            }}>
              <div style={{
                width:56,height:56,borderRadius:14,background:'#1F3864',
                display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#fff" opacity="0.9"/>
                </svg>
              </div>
              <h2 style={{fontSize:20,fontWeight:600,color:'#0f172a',marginBottom:6}}>
                IMA360 Customer Rebates Agent
              </h2>
              <p style={{fontSize:13,color:'#64748b',maxWidth:440,lineHeight:1.6,marginBottom:28}}>
                Ask me anything about Customer Rebates — diagnose issues, enhance requirements, generate test scenarios, explain data flows, or find the right BPML scripts.
              </p>
              <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',maxWidth:600}}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} style={{
                    padding:'8px 14px',fontSize:12,background:'#fff',
                    border:'1px solid #e2e8f0',borderRadius:20,color:'#475569',
                    cursor:'pointer',textAlign:'left',maxWidth:280,lineHeight:1.4,
                    fontFamily:'inherit',transition:'all .15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor='#1F3864'; e.currentTarget.style.color='#1F3864' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.color='#475569' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message history */}
          {messages.map((msg, i) => (
            <div key={i} style={{
              marginBottom:20,
              display:'flex',
              justifyContent:msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: msg.role === 'user' ? '75%' : '100%',
                padding: msg.role === 'user' ? '10px 16px' : '0',
                background: msg.role === 'user' ? '#1F3864' : 'transparent',
                color: msg.role === 'user' ? '#fff' : '#0f172a',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : 0,
                fontSize: 13,
                lineHeight: 1.6,
              }}>
                {msg.role === 'user' ? msg.content : <Markdown text={msg.content} />}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{display:'flex',gap:6,padding:'12px 0',alignItems:'center'}}>
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

      {/* Input bar — fixed at bottom */}
      <div style={{
        borderTop:'1px solid #e2e8f0',background:'#fff',padding:'14px 24px',flexShrink:0,
      }}>
        <div style={{maxWidth:780,margin:'0 auto',display:'flex',gap:10,alignItems:'flex-end'}}>
          {messages.length > 0 && (
            <button onClick={handleNewChat} title="New chat" style={{
              width:38,height:38,borderRadius:8,background:'#f1f5f9',
              border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',
              cursor:'pointer',flexShrink:0,color:'#64748b',fontSize:16,
            }}>+</button>
          )}
          <div style={{
            flex:1,display:'flex',alignItems:'flex-end',
            border:'1px solid #cbd5e1',borderRadius:12,background:'#fff',
            padding:'4px 4px 4px 14px',
            transition:'border-color .15s',
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
                maxHeight:120,fontFamily:'inherit',background:'transparent',
              }}
              onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width:34,height:34,borderRadius:8,flexShrink:0,
                background:(!input.trim()||loading)?'#e2e8f0':'#1F3864',
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
          IMA360 Customer Rebates AI — powered by Claude. Responses are based on BPML script knowledge and team memory.
        </div>
      </div>
    </div>
  )
}
