import { useState, useEffect, useRef, useMemo } from 'react'
import { BPML_SCRIPTS, MODULES } from '../data/bpml_knowledge.js'
import { buildNewStoryPrompt } from '../lib/prompts.js'
import { useLocalStorage } from '../lib/useLocalStorage.js'

// ─── Design tokens ──────────────────────────────────────────────────────────
const NAVY = '#1F3864'
const NAVY_HOVER = '#2A4A82'
const GREEN = '#0F6E56'
const BORDER = '#e5e7eb'
const BORDER_SOFT = '#f1f5f9'
const TEXT = '#0f172a'
const MUTED = '#64748b'
const SOFT_BG = '#f8fafc'

const STORY_TYPES = [
  { id: 'enhancement', label: 'Enhancement' },
  { id: 'bug-fix',     label: 'Bug fix' },
  { id: 'new-feature', label: 'New feature' },
]

// ─── Small UI atoms ─────────────────────────────────────────────────────────
function Pill({ bg, fg, children, mono = false }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', padding:'3px 9px', borderRadius:4,
      fontSize:10, fontWeight:600, background:bg, color:fg, whiteSpace:'nowrap',
      letterSpacing: mono ? 0 : '0.02em',
      fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
    }}>
      {children}
    </span>
  )
}

function Label({ children, optional, required }) {
  return (
    <div style={{
      fontSize:11, fontWeight:600, color:MUTED,
      textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8,
    }}>
      {children}
      {required && <span style={{ color:'#dc2626', marginLeft:3, fontWeight:700 }}>*</span>}
      {optional && (
        <span style={{ marginLeft:6, color:'#94a3b8', fontWeight:400, textTransform:'none', letterSpacing:0 }}>
          optional
        </span>
      )}
    </div>
  )
}

function CopyBtn({ text, label = 'Copy', small = false }) {
  const [done, setDone] = useState(false)
  const padding = small ? '4px 9px' : '5px 10px'
  const fontSize = small ? 10.5 : 11
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) }}
      style={{
        display:'inline-flex', alignItems:'center', gap:5,
        fontSize, fontWeight:500, padding,
        background: done ? '#f0fdf4' : '#fff',
        color: done ? '#15803d' : '#475569',
        border:`1px solid ${done ? '#bbf7d0' : BORDER}`,
        borderRadius:5, cursor:'pointer',
        fontFamily:'inherit', transition:'all 0.15s',
      }}
    >
      {done ? '✓ Copied' : label}
    </button>
  )
}

function Spinner({ size = 14, color = '#fff' }) {
  return (
    <span style={{
      width:size, height:size, display:'inline-block',
      border:`2px solid ${color}40`, borderTopColor: color,
      borderRadius:'50%', animation:'ima-spin 0.7s linear infinite',
    }} />
  )
}

function Skeleton({ height = 14, width = '100%', mb = 8 }) {
  return (
    <div style={{
      height, width, marginBottom:mb, borderRadius:4,
      background:'linear-gradient(90deg,#f1f5f9 0%,#e2e8f0 50%,#f1f5f9 100%)',
      backgroundSize:'200% 100%', animation:'ima-shimmer 1.4s ease-in-out infinite',
    }} />
  )
}

// ─── Markdown / CSV / TSV builders ──────────────────────────────────────────
function buildMarkdown(result, input) {
  const lines = []
  lines.push(`# New Story Report\n`)
  if (input.title) lines.push(`**Story title:** ${input.title}\n`)
  lines.push(`**Original description:** ${input.desc}\n`)
  if (input.requirement) lines.push(`**Original requirement:** ${input.requirement}\n`)
  if (input.mod) lines.push(`**Module:** ${input.mod}`)
  if (input.storyType) lines.push(`**Story type:** ${input.storyType}`)
  lines.push('\n---\n')

  lines.push(`## 1. Enhanced Requirement\n\n${result.enhancedRequirement || ''}\n`)
  lines.push(`\n## 2. Proposed Solution (BA perspective)\n\n${result.proposedSolution || ''}\n`)

  if (result.testScenarios?.length) {
    lines.push(`\n## 3. Test Scenarios (${result.testScenarios.length})\n`)
    lines.push(`\n| # | Test Scenario | Expected Result | Actual Result |`)
    lines.push(`|---|---|---|---|`)
    result.testScenarios.forEach((s, i) => {
      const ts = (s.testScenario || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
      const er = (s.expectedResults || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
      const ar = (s.actualResults || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
      lines.push(`| ${String(i+1).padStart(2,'0')} | ${ts} | ${er} | ${ar} |`)
    })
  }

  if (result.affectedModule) lines.push(`\n## 4. Affected Module\n\n${result.affectedModule}\n`)
  if (result.relatedBPMLScripts?.length) {
    lines.push(`\n## 5. Related BPML Scripts\n`)
    result.relatedBPMLScripts.forEach(id => {
      const s = BPML_SCRIPTS.find(x => x.id === id)
      if (s) lines.push(`- **${s.id}** — ${s.module} > ${s.submenu} > ${s.fn}${s.driveLink ? ` ([Drive](${s.driveLink}))` : ''}`)
      else lines.push(`- ${id}`)
    })
  }
  return lines.join('\n')
}

function buildCSV(scenarios) {
  const esc = s => `"${(s ?? '').toString().replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
  const head = ['#','Test Scenario','Expected Result','Actual Result']
  const rows = (scenarios || []).map((s, i) => [
    String(i+1).padStart(2,'0'), s.testScenario, s.expectedResults, s.actualResults || '',
  ].map(esc).join(','))
  return [head.join(','), ...rows].join('\n')
}

function buildTSV(scenarios) {
  return [
    'Test Scenario\tExpected Results\tActual Results',
    ...(scenarios || []).map(s => `${s.testScenario}\t${s.expectedResults}\t${s.actualResults || ''}`),
  ].join('\n')
}

function downloadFile(name, content, mime = 'text/plain') {
  const blob = new Blob([content], { type:mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function NewStory({ memories, onMemoryChange }) {
  // ── Persisted state ─────────────────────────────────────
  const [title, setTitle]             = useLocalStorage('newstory:title', '')
  const [desc, setDesc]               = useLocalStorage('newstory:desc', '')
  const [requirement, setRequirement] = useLocalStorage('newstory:requirement', '')
  const [mod, setMod]                 = useLocalStorage('newstory:mod', '')
  const [storyType, setStoryType]     = useLocalStorage('newstory:type', 'enhancement')
  const [result, setResult]           = useLocalStorage('newstory:result', null)
  const [actualResults, setActualResults] = useLocalStorage('newstory:actualResults', {})

  // ── Ephemeral state ─────────────────────────────────────
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showOriginal, setShowOriginal] = useState(false)

  const resultsRef = useRef(null)

  const canSubmit = desc.trim().length > 5 && requirement.trim().length > 3
  const descCount = desc.length
  const reqCount = requirement.length

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior:'smooth', block:'start' })
    }
  }, [result])

  const scriptsForModule = useMemo(() => {
    if (!mod) return BPML_SCRIPTS.length
    return BPML_SCRIPTS.filter(s => s.module === mod).length
  }, [mod])

  const relatedScripts = useMemo(() =>
    (result?.relatedBPMLScripts || [])
      .map(id => BPML_SCRIPTS.find(s => s.id === id))
      .filter(Boolean)
  , [result])

  // Merge persisted actual results into scenarios when exporting
  const scenariosWithActuals = useMemo(() => {
    if (!result?.testScenarios) return []
    return result.testScenarios.map((s, i) => ({
      ...s,
      actualResults: actualResults[i] ?? s.actualResults ?? '',
    }))
  }, [result, actualResults])

  async function handleGenerate() {
    if (!canSubmit) return
    setLoading(true); setError(''); setResult(null); setActualResults({})
    const prompt = buildNewStoryPrompt(memories)
    const userMsg = `NEW STORY:

${title ? `TITLE: ${title}\n\n` : ''}DESCRIPTION:
${desc}

REQUIREMENT (brief):
${requirement}

${mod ? `MODULE: ${mod}\n` : ''}${storyType ? `STORY TYPE: ${storyType}` : ''}`

    try {
      const r = await fetch('/api/chat', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens: 16000,
          system: prompt,
          messages:[{ role:'user', content:userMsg }],
        }),
      })

      const raw = await r.text()
      let data
      try { data = JSON.parse(raw) }
      catch {
        console.error('Non-JSON response from /api/chat:', raw)
        throw new Error(`Server returned a non-JSON response: ${raw.slice(0, 200)}`)
      }
      if (!r.ok) throw new Error(data?.error?.message || data?.error || `HTTP ${r.status}`)
      if (!data.content || !Array.isArray(data.content)) {
        console.error('Unexpected response shape from /api/chat:', data)
        throw new Error(data?.error || 'Anthropic returned an unexpected response shape')
      }
      const text = data.content.map(b => b.text || '').join('').trim()
      if (!text) throw new Error('Anthropic returned an empty response')

      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      let parsed
      try { parsed = JSON.parse(cleaned) }
      catch {
        console.error('Failed to parse Claude response as JSON. Raw text:', text)
        const match = cleaned.match(/\{[\s\S]*\}/)
        if (match) {
          try { parsed = JSON.parse(match[0]) }
          catch { throw new Error(`Response was not valid JSON. First 200 chars: ${text.slice(0, 200)}`) }
        } else {
          throw new Error(`Response was not valid JSON. First 200 chars: ${text.slice(0, 200)}`)
        }
      }

      setResult(parsed)

      // Auto-save to memory
      try {
        await fetch('/api/memory', {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({
            kind:'story',
            title: (title || desc).slice(0, 120),
            content: parsed.enhancedRequirement || '',
            module: parsed.affectedModule || mod,
          }),
        })
        onMemoryChange?.()
      } catch (e) { /* non-fatal */ }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setTitle(''); setDesc(''); setRequirement(''); setMod(''); setStoryType('enhancement')
    setResult(null); setError(''); setActualResults({})
  }

  function exportMarkdown() {
    const safe = (title || desc).slice(0, 40).replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'new-story'
    const md = buildMarkdown({ ...result, testScenarios: scenariosWithActuals }, { title, desc, requirement, mod, storyType })
    downloadFile(`${safe}.md`, md, 'text/markdown')
  }

  function exportCsv() {
    const csv = buildCSV(scenariosWithActuals)
    downloadFile('test-scenarios.csv', csv, 'text/csv')
  }

  function copyTsv() {
    return buildTSV(scenariosWithActuals)
  }

  return (
    <div style={{ width:'100%', minHeight:'100%', background:SOFT_BG, padding:'40px 24px 80px' }}>
      <style>{`
        @keyframes ima-spin { to { transform: rotate(360deg) } }
        @keyframes ima-shimmer {
          0% { background-position: -200% 0 } 100% { background-position: 200% 0 }
        }
        @keyframes ima-fade-up {
          from { opacity:0; transform: translateY(8px) } to { opacity:1; transform: translateY(0) }
        }
        .ima-fade-up { animation: ima-fade-up 0.35s ease-out both }
        .ima-input:focus, .ima-select:focus, .ima-ta:focus {
          outline: none; border-color: ${NAVY};
          box-shadow: 0 0 0 3px ${NAVY}15;
        }
        .ima-cta:hover:not(:disabled) {
          background: ${NAVY_HOVER}; transform: translateY(-1px);
          box-shadow: 0 6px 16px ${NAVY}30;
        }
        .ima-cta:active:not(:disabled) { transform: translateY(0); }
        .ima-seg-btn:hover:not(.active) {
          background: #fafbfc; color: ${TEXT};
        }
      `}</style>

      <div style={{ maxWidth:880, margin:'0 auto' }}>

        {/* ─── Page header ───────────────────────────────────────── */}
        <div style={{ marginBottom:32 }}>
          <div style={{
            fontSize:11, fontWeight:600, color:NAVY, letterSpacing:'0.12em',
            textTransform:'uppercase', marginBottom:6, opacity:0.7,
          }}>
            IMA360 QA · New Story
          </div>
          <h1 style={{
            fontSize:28, fontWeight:600, color:TEXT, margin:0, marginBottom:8,
            letterSpacing:'-0.02em', lineHeight:1.2,
          }}>
            New Story
          </h1>
          <p style={{
            fontSize:13.5, color:MUTED, margin:0, lineHeight:1.55, maxWidth:640,
          }}>
            Paste a rough story idea and get a backlog-ready requirement, BA-perspective solution, and full set of test scenarios — grounded in IMA360 architecture and your past stories.
          </p>
        </div>

        {/* ─── Form card ─────────────────────────────────────────── */}
        <div style={{
          background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12,
          padding:'24px 26px', marginBottom: result || loading || error ? 28 : 0,
          boxShadow:'0 1px 2px rgba(15,23,42,0.04)',
        }}>
          {/* Story title */}
          <div style={{ marginBottom:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
              <Label optional>Story title</Label>
              {title && (
                <span style={{ fontSize:10, color:MUTED, fontVariantNumeric:'tabular-nums' }}>
                  {title.length} chars
                </span>
              )}
            </div>
            <input
              className="ima-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="A short label for the backlog (e.g. Add bulk approval to Calculation Rules)"
              style={{
                width:'100%', fontSize:13.5, padding:'11px 13px',
                border:`1px solid ${BORDER}`, borderRadius:8,
                fontFamily:'inherit', color:TEXT, background:'#fff', boxSizing:'border-box',
                transition:'border-color 0.15s, box-shadow 0.15s',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
              <Label required>Story description</Label>
              <span style={{
                fontSize:10, color: descCount > 5 ? '#15803d' : '#94a3b8',
                fontVariantNumeric:'tabular-nums',
              }}>
                {descCount} {descCount === 1 ? 'char' : 'chars'}
                {descCount > 0 && descCount <= 5 && ' · need 6+'}
              </span>
            </div>
            <textarea
              className="ima-ta"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="What's the story about? Who's affected? Why is it needed?"
              rows={4}
              style={{
                width:'100%', fontSize:13, lineHeight:1.55, padding:'12px 14px',
                border:`1px solid ${BORDER}`, borderRadius:8, resize:'vertical',
                fontFamily:'inherit', color:TEXT, background:'#fff', boxSizing:'border-box',
                transition:'border-color 0.15s, box-shadow 0.15s',
              }}
            />
          </div>

          {/* Requirement */}
          <div style={{ marginBottom:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
              <Label required>Rough requirement</Label>
              <span style={{
                fontSize:10, color: reqCount > 3 ? '#15803d' : '#94a3b8',
                fontVariantNumeric:'tabular-nums',
              }}>
                {reqCount} {reqCount === 1 ? 'char' : 'chars'}
                {reqCount > 0 && reqCount <= 3 && ' · need 4+'}
              </span>
            </div>
            <textarea
              className="ima-ta"
              value={requirement}
              onChange={e => setRequirement(e.target.value)}
              placeholder="Brief keywords or rough sentence — the AI will rewrite it into backlog-ready text"
              rows={3}
              style={{
                width:'100%', fontSize:13, lineHeight:1.55, padding:'12px 14px',
                border:`1px solid ${BORDER}`, borderRadius:8, resize:'vertical',
                fontFamily:'inherit', color:TEXT, background:'#fff', boxSizing:'border-box',
                transition:'border-color 0.15s, box-shadow 0.15s',
              }}
            />
          </div>

          {/* Module + Story type row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:22 }}>
            <div>
              <Label optional>Module</Label>
              <select
                className="ima-select"
                value={mod}
                onChange={e => setMod(e.target.value)}
                style={{
                  width:'100%', height:40, fontSize:13, padding:'0 12px',
                  border:`1px solid ${BORDER}`, borderRadius:8, background:'#fff',
                  color: mod ? TEXT : MUTED, fontFamily:'inherit', cursor:'pointer',
                  appearance:'none',
                  backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'%3E%3Cpath fill=\'%2364748b\' d=\'M5 6L0 0h10z\'/%3E%3C/svg%3E")',
                  backgroundRepeat:'no-repeat', backgroundPosition:'right 14px center', paddingRight:32,
                  transition:'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <option value="">Auto-detect from story</option>
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <div style={{ fontSize:10, color:MUTED, marginTop:6 }}>
                {mod
                  ? `${scriptsForModule} BPML scripts in this module`
                  : `${BPML_SCRIPTS.length} BPML scripts available across all modules`}
              </div>
            </div>

            <div>
              <Label>Story type</Label>
              <div style={{ display:'flex', gap:6 }}>
                {STORY_TYPES.map(t => {
                  const active = storyType === t.id
                  return (
                    <button
                      key={t.id}
                      className={`ima-seg-btn ${active ? 'active' : ''}`}
                      onClick={() => setStoryType(t.id)}
                      style={{
                        flex:1, padding:'9px 10px', fontSize:11.5,
                        fontWeight: active ? 600 : 500,
                        background: active ? `${NAVY}10` : '#fff',
                        color: active ? NAVY : MUTED,
                        border: `1px solid ${active ? NAVY : BORDER}`,
                        borderRadius:6, cursor:'pointer', fontFamily:'inherit',
                        transition:'all 0.15s',
                      }}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Action row */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            paddingTop:18, borderTop:`1px solid ${BORDER_SOFT}`, gap:12,
          }}>
            <div style={{ fontSize:11.5, color:MUTED }}>
              {!canSubmit
                ? <span>Add a description (6+ chars) and rough requirement (4+ chars) to begin</span>
                : <span style={{ color:'#15803d' }}>✓ Ready to generate</span>}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              {(title || desc || requirement || mod || result) && (
                <button
                  onClick={handleClear}
                  disabled={loading}
                  style={{
                    padding:'10px 16px', fontSize:12.5, fontWeight:500,
                    background:'#fff', color:MUTED,
                    border:`1px solid ${BORDER}`, borderRadius:7,
                    cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit',
                    transition:'all 0.15s',
                  }}
                >
                  Clear
                </button>
              )}
              <button
                className="ima-cta"
                onClick={handleGenerate}
                disabled={!canSubmit || loading}
                style={{
                  display:'inline-flex', alignItems:'center', gap:8,
                  padding:'10px 20px', fontSize:13, fontWeight:600,
                  background: (!canSubmit || loading) ? '#94a3b8' : NAVY,
                  color:'#fff', border:'none', borderRadius:7,
                  cursor:(!canSubmit || loading) ? 'not-allowed' : 'pointer',
                  fontFamily:'inherit', letterSpacing:'-0.005em',
                  transition:'all 0.18s ease', boxShadow: (!canSubmit||loading) ? 'none' : `0 2px 6px ${NAVY}25`,
                }}
              >
                {loading && <Spinner />}
                {loading ? 'Generating story…' : 'Generate story'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Error ──────────────────────────────────────────────── */}
        {error && (
          <div className="ima-fade-up" style={{
            padding:'14px 18px', background:'#fef2f2', border:'1px solid #fecaca',
            borderRadius:10, color:'#991b1b', fontSize:12.5, marginTop:24,
            display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
          }}>
            <div>
              <strong style={{ display:'block', marginBottom:2 }}>Generation failed</strong>
              {error}
            </div>
            <button
              onClick={handleGenerate}
              style={{
                padding:'6px 12px', fontSize:11.5, fontWeight:600,
                background:'#fff', color:'#991b1b', border:'1px solid #fca5a5',
                borderRadius:6, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ─── Loading skeleton ───────────────────────────────────── */}
        {loading && (
          <div className="ima-fade-up" style={{
            marginTop:24, padding:'28px 30px', background:'#fff',
            border:`1px solid ${BORDER}`, borderRadius:12,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <Spinner size={18} color={NAVY} />
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:TEXT }}>
                  Drafting your story…
                </div>
                <div style={{ fontSize:11.5, color:MUTED, marginTop:2 }}>
                  Connecting dots across {BPML_SCRIPTS.length} BPML scripts and past stories
                </div>
              </div>
            </div>
            <Skeleton height={12} width="35%" />
            <Skeleton height={12} width="92%" />
            <Skeleton height={12} width="78%" />
            <Skeleton height={12} width="88%" />
            <Skeleton height={12} width="60%" mb={0} />
          </div>
        )}

        {/* ════ RESULTS ════════════════════════════════════════════ */}
        {result && !loading && (
          <div ref={resultsRef} className="ima-fade-up">

            {/* Toolbar */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              marginBottom:14, gap:12, flexWrap:'wrap',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  fontSize:11, fontWeight:600, color:'#15803d',
                  background:'#f0fdf4', border:'1px solid #bbf7d0',
                  padding:'4px 10px', borderRadius:20, letterSpacing:'0.02em',
                }}>
                  ✓ Story ready
                </div>
                <div style={{ fontSize:11.5, color:MUTED }}>Saved to team memory</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <CopyBtn
                  text={buildMarkdown({ ...result, testScenarios: scenariosWithActuals }, { title, desc, requirement, mod, storyType })}
                  label="Copy as Markdown"
                />
                <button
                  onClick={exportMarkdown}
                  style={{
                    padding:'5px 10px', fontSize:11, fontWeight:600,
                    background:NAVY, color:'#fff', border:'none', borderRadius:5,
                    cursor:'pointer', fontFamily:'inherit',
                  }}
                >
                  Export .md
                </button>
              </div>
            </div>

            {/* Single scrollable results card */}
            <div style={{
              background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12,
              padding:'24px 26px',
            }}>

              {/* Pills row */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:22 }}>
                {result.affectedModule && (
                  <Pill bg="#f1f5f9" fg="#475569">{result.affectedModule}</Pill>
                )}
                {storyType && (
                  <Pill bg="#eef2ff" fg="#3730a3">
                    {STORY_TYPES.find(t => t.id === storyType)?.label || storyType}
                  </Pill>
                )}
                {result.testScenarios?.length && (
                  <Pill bg="#fffbeb" fg="#a16207">{result.testScenarios.length} test scenarios</Pill>
                )}
              </div>

              {/* ── 01 · ENHANCED REQUIREMENT ───────────── */}
              <div style={{ marginBottom:24 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{
                    fontSize:10.5, fontWeight:700, color:NAVY,
                    textTransform:'uppercase', letterSpacing:'0.08em',
                  }}>
                    01 · Enhanced Requirement
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button
                      onClick={() => setShowOriginal(!showOriginal)}
                      style={{
                        padding:'4px 9px', fontSize:10.5, fontWeight:500,
                        background:'#fff', color:MUTED, border:`1px solid ${BORDER}`,
                        borderRadius:5, cursor:'pointer', fontFamily:'inherit',
                      }}
                    >
                      {showOriginal ? 'Show enhanced' : 'Show original'}
                    </button>
                    <CopyBtn text={result.enhancedRequirement || ''} small />
                  </div>
                </div>
                <div style={{
                  background: showOriginal ? '#fafbfc' : '#fafbfc',
                  border:`1px solid ${BORDER_SOFT}`,
                  borderLeft:`2px solid ${NAVY}`,
                  borderRadius:'0 8px 8px 0',
                  padding:'14px 18px',
                }}>
                  <p style={{
                    fontSize:13.5, color: showOriginal ? MUTED : TEXT,
                    fontStyle: showOriginal ? 'italic' : 'normal',
                    lineHeight:1.65, margin:0, whiteSpace:'pre-wrap',
                  }}>
                    {showOriginal ? requirement : result.enhancedRequirement}
                  </p>
                </div>
              </div>

              {/* ── 02 · PROPOSED SOLUTION ──────────────── */}
              <div style={{ marginBottom:24 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{
                    fontSize:10.5, fontWeight:700, color:NAVY,
                    textTransform:'uppercase', letterSpacing:'0.08em',
                  }}>
                    02 · Proposed Solution
                    <span style={{
                      color:MUTED, fontWeight:400, textTransform:'none',
                      letterSpacing:0, marginLeft:6,
                    }}>
                      — BA perspective
                    </span>
                  </div>
                  <CopyBtn text={result.proposedSolution || ''} small />
                </div>
                <div style={{
                  background:'#fafbfc',
                  border:`1px solid ${BORDER_SOFT}`,
                  borderLeft:`2px solid ${GREEN}`,
                  borderRadius:'0 8px 8px 0',
                  padding:'14px 18px',
                }}>
                  <p style={{
                    fontSize:13.5, color:TEXT, lineHeight:1.65, margin:0,
                    whiteSpace:'pre-wrap',
                  }}>
                    {result.proposedSolution}
                  </p>
                </div>
              </div>

              {/* ── 03 · TEST SCENARIOS ──────────────────── */}
              {result.testScenarios?.length > 0 && (
                <div style={{ marginBottom: relatedScripts.length ? 24 : 0 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{
                      fontSize:10.5, fontWeight:700, color:NAVY,
                      textTransform:'uppercase', letterSpacing:'0.08em',
                    }}>
                      03 · Test Scenarios
                      <span style={{ color:MUTED, fontWeight:400, marginLeft:6 }}>
                        ({result.testScenarios.length})
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <CopyBtn text={copyTsv()} label="Copy as TSV" small />
                      <button
                        onClick={exportCsv}
                        style={{
                          padding:'4px 10px', fontSize:10.5, fontWeight:600,
                          background:'#fff', color:NAVY, border:`1px solid ${NAVY}40`,
                          borderRadius:5, cursor:'pointer', fontFamily:'inherit',
                        }}
                      >
                        Export CSV
                      </button>
                    </div>
                  </div>

                  <div style={{
                    border:`1px solid ${BORDER_SOFT}`, borderRadius:8, overflow:'hidden',
                  }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
                      <colgroup>
                        <col style={{ width:'36px' }}/>
                        <col style={{ width:'38%' }}/>
                        <col style={{ width:'31%' }}/>
                        <col style={{ width:'31%' }}/>
                      </colgroup>
                      <thead>
                        <tr style={{ background:'#fafbfc' }}>
                          <th style={th}>#</th>
                          <th style={th}>Test Scenario</th>
                          <th style={th}>Expected Result</th>
                          <th style={th}>Actual Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.testScenarios.map((s, i) => (
                          <TestRow
                            key={i}
                            scenario={s}
                            index={i+1}
                            actual={actualResults[i] ?? ''}
                            onActualChange={v => setActualResults({ ...actualResults, [i]: v })}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{
                    fontSize:11, color:MUTED, marginTop:8, paddingLeft:2,
                  }}>
                    Click any cell in "Actual Result" to fill in test outcomes — edits are saved automatically.
                  </div>
                </div>
              )}

              {/* ── 04 · RELATED BPML SCRIPTS ──────────── */}
              {relatedScripts.length > 0 && (
                <div>
                  <div style={{
                    fontSize:10.5, fontWeight:700, color:NAVY,
                    textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10,
                  }}>
                    04 · Related BPML Scripts
                    <span style={{ color:MUTED, fontWeight:400, marginLeft:6 }}>
                      ({relatedScripts.length})
                    </span>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {relatedScripts.map(s => (
                      <div key={s.id} style={{
                        display:'inline-flex', alignItems:'center', gap:8,
                        padding:'8px 12px', background:'#fafbfc',
                        border:`1px solid ${BORDER}`, borderRadius:7,
                      }}>
                        <span style={{
                          fontSize:11, fontWeight:600, color:NAVY,
                          fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',
                        }}>
                          {s.id}
                        </span>
                        <span style={{ fontSize:11, color:MUTED }}>
                          {s.module}
                        </span>
                        {s.driveLink && (
                          <a
                            href={s.driveLink} target="_blank" rel="noopener noreferrer"
                            style={{
                              fontSize:10, color:NAVY, padding:'2px 7px',
                              background:'#fff', border:`1px solid ${NAVY}30`,
                              borderRadius:4, textDecoration:'none', fontWeight:500,
                            }}
                          >
                            Open ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Test scenario row with persisted actual results ─────────────────────────
function TestRow({ scenario, index, actual, onActualChange }) {
  return (
    <tr style={{ borderTop:`1px solid ${BORDER_SOFT}` }}>
      <td style={{
        ...td, textAlign:'center', color:'#94a3b8',
        fontFamily:'ui-monospace, Menlo, monospace', fontSize:11, fontWeight:500,
      }}>
        {String(index).padStart(2,'0')}
      </td>
      <td style={td}>
        <div style={{ fontSize:12.5, lineHeight:1.55, color:TEXT }}>
          {scenario.testScenario}
        </div>
      </td>
      <td style={td}>
        <div style={{ fontSize:12.5, lineHeight:1.55, color:'#166534' }}>
          {scenario.expectedResults}
        </div>
      </td>
      <td style={td}>
        <textarea
          value={actual}
          onChange={e => onActualChange(e.target.value)}
          placeholder="Actual result…"
          style={{
            width:'100%', minHeight:50, fontSize:11.5, padding:'6px 8px',
            border:`1px solid ${BORDER}`, borderRadius:5,
            background: actual ? '#fffbeb' : '#fafbfc',
            resize:'vertical', fontFamily:'inherit', color:TEXT, boxSizing:'border-box',
            transition:'background 0.15s, border-color 0.15s',
          }}
        />
      </td>
    </tr>
  )
}

const th = {
  padding:'10px 12px', textAlign:'left',
  fontSize:10, fontWeight:700, color:MUTED,
  textTransform:'uppercase', letterSpacing:'0.06em',
  borderBottom:`1px solid ${BORDER}`,
}
const td = {
  padding:'11px 12px', verticalAlign:'top',
}
