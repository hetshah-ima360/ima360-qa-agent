import { useState, useMemo, useRef, useEffect } from 'react'
import { BPML_SCRIPTS, MODULES } from '../data/bpml_knowledge.js'
import { buildDiagnosePrompt } from '../lib/prompts.js'

// ─── Design tokens ──────────────────────────────────────────────────────────
const NAVY = '#1F3864'
const NAVY_DARK = '#152849'
const NAVY_HOVER = '#2A4A82'
const BORDER = '#e5e7eb'
const BORDER_SOFT = '#f1f5f9'
const TEXT = '#0f172a'
const MUTED = '#64748b'
const SOFT_BG = '#f8fafc'

const PRI_C = {
  'must-run':    { bg:'#fef2f2', fg:'#b91c1c', dot:'#dc2626' },
  'should-run':  { bg:'#fffbeb', fg:'#a16207', dot:'#d97706' },
  'good-to-run': { bg:'#f0fdf4', fg:'#15803d', dot:'#16a34a' },
}
const TYP_C = {
  positive:    { bg:'#f0fdf4', fg:'#166534' },
  negative:    { bg:'#fef2f2', fg:'#991b1b' },
  'edge-case': { bg:'#fffbeb', fg:'#92400e' },
  regression:  { bg:'#eef2ff', fg:'#3730a3' },
  boundary:    { bg:'#faf5ff', fg:'#6b21a8' },
}
const REL_C = {
  direct:     { bg:'#fef2f2', fg:'#991b1b' },
  regression: { bg:'#eef2ff', fg:'#3730a3' },
  related:    { bg:'#fffbeb', fg:'#92400e' },
}
const CMPLX_C = {
  Low:    { bg:'#f0fdf4', fg:'#15803d' },
  Medium: { bg:'#fffbeb', fg:'#a16207' },
  High:   { bg:'#fef2f2', fg:'#b91c1c' },
}

// ─── Small UI atoms ─────────────────────────────────────────────────────────
function Pill({ bg, fg, children, mono = false }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:4,
      fontSize:10, fontWeight:600, background:bg, color:fg, whiteSpace:'nowrap',
      letterSpacing: mono ? 0 : '0.02em',
      fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
    }}>
      {children}
    </span>
  )
}

function Label({ children, optional }) {
  return (
    <div style={{
      fontSize:10, fontWeight:600, color:MUTED,
      textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8,
    }}>
      {children}
      {optional && (
        <span style={{ marginLeft:6, color:'#94a3b8', fontWeight:400, textTransform:'none', letterSpacing:0 }}>
          optional
        </span>
      )}
    </div>
  )
}

function CopyBtn({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) }}
      style={{
        display:'inline-flex', alignItems:'center', gap:5,
        fontSize:11, fontWeight:500, padding:'5px 10px',
        background: done ? '#f0fdf4' : '#fff',
        color: done ? '#15803d' : '#475569',
        border:`1px solid ${done ? '#bbf7d0' : BORDER}`,
        borderRadius:5, cursor:'pointer',
        fontFamily:'inherit', transition:'all 0.15s',
      }}
    >
      {done ? '✓ Copied' : `${label}`}
    </button>
  )
}

// ─── Spinner ────────────────────────────────────────────────────────────────
function Spinner({ size = 14, color = '#fff' }) {
  return (
    <span style={{
      width:size, height:size, display:'inline-block',
      border:`2px solid ${color}40`, borderTopColor: color,
      borderRadius:'50%', animation:'ima-spin 0.7s linear infinite',
    }} />
  )
}

// ─── Skeleton loader ────────────────────────────────────────────────────────
function Skeleton({ height = 14, width = '100%', mb = 8 }) {
  return (
    <div style={{
      height, width, marginBottom:mb, borderRadius:4,
      background:'linear-gradient(90deg,#f1f5f9 0%,#e2e8f0 50%,#f1f5f9 100%)',
      backgroundSize:'200% 100%', animation:'ima-shimmer 1.4s ease-in-out infinite',
    }} />
  )
}

// ─── Markdown export builder ────────────────────────────────────────────────
function buildMarkdown(result, input) {
  const u = result.understanding || {}
  const sol = result.proposedSolution || {}
  const lines = []
  lines.push(`# Diagnose Story Report`)
  lines.push('')
  lines.push(`**Input:** ${input.desc}`)
  if (input.notes) lines.push(`\n**Acceptance criteria:** ${input.notes}`)
  if (input.mod) lines.push(`\n**Module:** ${input.mod}`)
  if (input.rules) lines.push(`\n**Business rules:** ${input.rules}`)
  lines.push('\n---\n')

  lines.push(`## 1. Understanding\n`)
  lines.push(`- **Story type:** ${u.storyType || '—'}`)
  lines.push(`- **Affected module:** ${u.affectedModule || '—'}`)
  lines.push(`- **Complexity:** ${u.complexity || '—'}${u.complexityReason ? ` — ${u.complexityReason}` : ''}`)
  lines.push(`\n${u.summary || ''}\n`)

  lines.push(`## 2. Proposed Solution\n`)
  lines.push(`${sol.overview || ''}\n`)
  const groups = [
    ['Backend', sol.backendChanges], ['Frontend', sol.frontendChanges],
    ['Database', sol.databaseChanges], ['API', sol.apiChanges],
    ['Dependencies', sol.dependencies], ['Configuration', sol.configurationChanges],
  ]
  groups.forEach(([t, items]) => {
    if (items && items.length && items[0]) {
      lines.push(`\n**${t}:**`)
      items.forEach(i => lines.push(`- ${i}`))
    }
  })

  if (result.releaseNotes) {
    lines.push(`\n## 3. Release Notes\n\n> ${result.releaseNotes}\n`)
  }

  if (result.testScenarios?.length) {
    lines.push(`\n## 4. Test Scenarios (${result.testScenarios.length})\n`)
    result.testScenarios.forEach(tc => {
      lines.push(`\n### ${tc.id} — ${tc.title}`)
      lines.push(`- **Priority:** ${tc.priority} | **Type:** ${tc.type}`)
      if (tc.preconditions) lines.push(`- **Preconditions:** ${tc.preconditions}`)
      lines.push(`- **Steps:**`)
      ;(tc.steps || []).forEach((s, i) => lines.push(`  ${i+1}. ${s}`))
      lines.push(`- **Expected:** ${tc.expectedResult}`)
      if (tc.testData) lines.push(`- **Test data:** ${tc.testData}`)
    })
  }

  if (result.mappedBPMLScripts?.length) {
    lines.push(`\n## 5. Mapped BPML Scripts (${result.mappedBPMLScripts.length})\n`)
    result.mappedBPMLScripts.forEach(s => {
      lines.push(`\n### ${s.id}${s.scriptName ? ` — ${s.scriptName}` : ''}`)
      lines.push(`- **Relevance:** ${s.relevance}`)
      lines.push(`- **Action:** ${s.action || '—'}`)
      lines.push(`- **Reason:** ${s.reason}`)
      if (s.driveLink) lines.push(`- **Link:** ${s.driveLink}`)
    })
  }

  if (result.futOutline) {
    const f = result.futOutline
    lines.push(`\n## 6. FUT Document Outline\n`)
    if (f.testObjective) lines.push(`**Objective:** ${f.testObjective}\n`)
    const sec = (label, items) => {
      if (!items?.length) return
      lines.push(`\n**${label}:**`)
      items.forEach(i => lines.push(`- ${i}`))
    }
    sec('Prerequisites', f.prerequisites)
    sec('In scope', f.inScope)
    sec('Out of scope', f.outOfScope)
    sec('Evidence sections', f.evidenceSections)
    sec('Sign-off criteria', f.signOffCriteria)
  }
  return lines.join('\n')
}

function buildCSV(scenarios) {
  const esc = s => `"${(s ?? '').toString().replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
  const head = ['ID','Title','Type','Priority','Preconditions','Steps','Expected Result','Test Data']
  const rows = (scenarios || []).map(tc => [
    tc.id, tc.title, tc.type, tc.priority, tc.preconditions,
    (tc.steps || []).map((s,i) => `${i+1}. ${s}`).join(' | '),
    tc.expectedResult, tc.testData,
  ].map(esc).join(','))
  return [head.join(','), ...rows].join('\n')
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
export default function DiagnoseStory({ memories, onMemoryChange }) {
  const [desc, setDesc] = useState('')
  const [notes, setNotes] = useState('')
  const [mod, setMod] = useState('')
  const [rules, setRules] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('understanding')
  const [scenarioFilter, setScenarioFilter] = useState({ type:'all', priority:'all' })

  const resultsRef = useRef(null)

  const canSubmit = desc.trim().length > 10
  const charCount = desc.length

  // Scroll to results when ready
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior:'smooth', block:'start' })
    }
  }, [result])

  // Filtered scenarios
  const filteredScenarios = useMemo(() => {
    if (!result?.testScenarios) return []
    return result.testScenarios.filter(tc => {
      if (scenarioFilter.type !== 'all' && tc.type !== scenarioFilter.type) return false
      if (scenarioFilter.priority !== 'all' && tc.priority !== scenarioFilter.priority) return false
      return true
    })
  }, [result, scenarioFilter])

  const scriptsForModule = useMemo(() => {
    if (!mod) return BPML_SCRIPTS.length
    return BPML_SCRIPTS.filter(s => s.module === mod).length
  }, [mod])

  async function handleGenerate() {
    if (!canSubmit) return
    setLoading(true); setError(''); setResult(null); setActiveTab('understanding')
    const prompt = buildDiagnosePrompt(memories)
    const userMsg = `STORY TO ANALYSE:\n\n${desc}\n\n${notes ? `ACCEPTANCE CRITERIA / NOTES:\n${notes}\n` : ''}${mod ? `MODULE: ${mod}\n` : ''}${rules ? `BUSINESS RULES:\n${rules}` : ''}`

    try {
      const r = await fetch('/api/chat', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:4096,
          system:prompt, messages:[{ role:'user', content:userMsg }],
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`)
      const text = (data.content || []).map(b => b.text || '').join('')
      const parsed = JSON.parse(text.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim())
      setResult(parsed)

      // Auto-save to memory
      try {
        await fetch('/api/memory', {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({
            kind:'diagnose',
            title: desc.slice(0,120),
            content: parsed.understanding?.summary || '',
            module: parsed.understanding?.affectedModule || mod,
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
    setDesc(''); setNotes(''); setMod(''); setRules('')
    setResult(null); setError('')
  }

  function exportAll() {
    const md = buildMarkdown(result, { desc, notes, mod, rules })
    const safeName = desc.slice(0, 40).replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'diagnosis'
    downloadFile(`${safeName}-diagnosis.md`, md, 'text/markdown')
  }

  function exportScenariosCsv() {
    const csv = buildCSV(result.testScenarios)
    downloadFile('test-scenarios.csv', csv, 'text/csv')
  }

  // Tab definitions
  const tabs = result ? [
    { id:'understanding', label:'Understanding', count:null },
    { id:'solution',      label:'Solution',      count:null },
    { id:'release',       label:'Release Notes', count:null, hidden: !result.releaseNotes },
    { id:'tests',         label:'Test Scenarios', count: result.testScenarios?.length || 0 },
    { id:'bpml',          label:'BPML Scripts',  count: result.mappedBPMLScripts?.length || 0 },
    { id:'fut',           label:'FUT Outline',   count:null, hidden: !result.futOutline },
  ].filter(t => !t.hidden) : []

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
        .ima-tab:hover { color: ${NAVY}; }
        .ima-card-hover:hover { border-color:${NAVY}40; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
      `}</style>

      <div style={{ maxWidth:880, margin:'0 auto' }}>

        {/* ─── Page header ───────────────────────────────────────── */}
        <div style={{ marginBottom:32 }}>
          <div style={{
            fontSize:11, fontWeight:600, color:NAVY, letterSpacing:'0.12em',
            textTransform:'uppercase', marginBottom:6, opacity:0.7,
          }}>
            IMA360 QA · Diagnose
          </div>
          <h1 style={{
            fontSize:28, fontWeight:600, color:TEXT, margin:0, marginBottom:8,
            letterSpacing:'-0.02em', lineHeight:1.2,
          }}>
            Diagnose Story
          </h1>
          <p style={{
            fontSize:13.5, color:MUTED, margin:0, lineHeight:1.55, maxWidth:640,
          }}>
            Paste a story or requirement and get a complete diagnosis grounded in IMA360 architecture:
            understanding, proposed solution, release notes, test scenarios, FUT outline, and mapped BPML scripts.
          </p>
        </div>

        {/* ─── Form card ─────────────────────────────────────────── */}
        <div style={{
          background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12,
          padding:'24px 26px', marginBottom: result || loading || error ? 28 : 0,
          boxShadow:'0 1px 2px rgba(15,23,42,0.04)',
        }}>
          {/* Story description */}
          <div style={{ marginBottom:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
              <Label>Story description / requirement</Label>
              <span style={{
                fontSize:10, color: charCount > 10 ? '#15803d' : '#94a3b8',
                fontWeight:500, fontVariantNumeric:'tabular-nums',
              }}>
                {charCount} {charCount === 1 ? 'char' : 'chars'}
                {charCount > 0 && charCount <= 10 && ' · need 11+'}
              </span>
            </div>
            <textarea
              className="ima-ta"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="e.g. When a user processes an Accrual Reversal followed by a Delta Accrual, the Rebate Tolerance only blocks 50% of expected records..."
              rows={5}
              style={{
                width:'100%', fontSize:13, lineHeight:1.55, padding:'12px 14px',
                border:`1px solid ${BORDER}`, borderRadius:8, resize:'vertical',
                fontFamily:'inherit', color:TEXT, background:'#fff',
                transition:'border-color 0.15s, box-shadow 0.15s', boxSizing:'border-box',
              }}
            />
          </div>

          {/* Module + Story-related row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
            <div>
              <Label>Module</Label>
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
              <Label optional>Acceptance criteria / notes</Label>
              <textarea
                className="ima-ta"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any acceptance criteria or known constraints…"
                rows={2}
                style={{
                  width:'100%', fontSize:12.5, lineHeight:1.5, padding:'10px 12px',
                  border:`1px solid ${BORDER}`, borderRadius:8, resize:'vertical',
                  fontFamily:'inherit', color:TEXT, background:'#fff', boxSizing:'border-box',
                  transition:'border-color 0.15s, box-shadow 0.15s', minHeight:40,
                }}
              />
            </div>
          </div>

          {/* Business rules */}
          <div style={{ marginBottom:22 }}>
            <Label optional>Business rules / scope constraints</Label>
            <textarea
              className="ima-ta"
              value={rules}
              onChange={e => setRules(e.target.value)}
              placeholder="e.g. Must work for Single Axis and Multi Axis contracts; cannot break PPA flow…"
              rows={2}
              style={{
                width:'100%', fontSize:12.5, lineHeight:1.5, padding:'10px 12px',
                border:`1px solid ${BORDER}`, borderRadius:8, resize:'vertical',
                fontFamily:'inherit', color:TEXT, background:'#fff', boxSizing:'border-box',
                transition:'border-color 0.15s, box-shadow 0.15s',
              }}
            />
          </div>

          {/* Action row */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            paddingTop:18, borderTop:`1px solid ${BORDER_SOFT}`, gap:12,
          }}>
            <div style={{ fontSize:11.5, color:MUTED }}>
              {!canSubmit
                ? <span>Add a story description to begin</span>
                : <span style={{ color:'#15803d' }}>✓ Ready to analyse</span>}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              {(desc || notes || rules || mod) && (
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
                {loading ? 'Analysing story…' : 'Generate diagnosis'}
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
              <strong style={{ display:'block', marginBottom:2 }}>Diagnosis failed</strong>
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
                  Analysing your story…
                </div>
                <div style={{ fontSize:11.5, color:MUTED, marginTop:2 }}>
                  Cross-referencing {BPML_SCRIPTS.length} BPML scripts and IMA360 architecture
                </div>
              </div>
            </div>
            <Skeleton height={12} width="40%" />
            <Skeleton height={12} width="85%" />
            <Skeleton height={12} width="70%" />
            <Skeleton height={12} width="92%" />
            <Skeleton height={12} width="55%" mb={0} />
          </div>
        )}

        {/* ════ RESULTS ════════════════════════════════════════════ */}
        {result && !loading && (
          <div ref={resultsRef} className="ima-fade-up">

            {/* Results toolbar */}
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
                  ✓ Diagnosis ready
                </div>
                <div style={{ fontSize:11.5, color:MUTED }}>
                  Saved to team memory
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <CopyBtn
                  text={buildMarkdown(result, { desc, notes, mod, rules })}
                  label="Copy as Markdown"
                />
                <button
                  onClick={exportAll}
                  style={{
                    padding:'6px 12px', fontSize:11, fontWeight:600,
                    background:NAVY, color:'#fff', border:'none', borderRadius:5,
                    cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.01em',
                  }}
                >
                  Export .md
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12,
              overflow:'hidden',
            }}>
              <div style={{
                display:'flex', borderBottom:`1px solid ${BORDER}`,
                background:'#fafbfc', overflowX:'auto',
              }}>
                {tabs.map(t => (
                  <button
                    key={t.id}
                    className="ima-tab"
                    onClick={() => setActiveTab(t.id)}
                    style={{
                      display:'inline-flex', alignItems:'center', gap:6,
                      padding:'14px 18px', fontSize:12.5,
                      fontWeight: activeTab === t.id ? 600 : 500,
                      color: activeTab === t.id ? NAVY : MUTED,
                      background:'transparent', border:'none', cursor:'pointer',
                      fontFamily:'inherit', whiteSpace:'nowrap',
                      borderBottom: activeTab === t.id ? `2px solid ${NAVY}` : '2px solid transparent',
                      marginBottom:-1, transition:'color 0.15s',
                    }}
                  >
                    {t.label}
                    {t.count !== null && (
                      <span style={{
                        fontSize:10, fontWeight:600,
                        background: activeTab === t.id ? `${NAVY}15` : '#e2e8f0',
                        color: activeTab === t.id ? NAVY : MUTED,
                        padding:'1px 6px', borderRadius:10, minWidth:18, textAlign:'center',
                      }}>{t.count}</span>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ padding:'24px 26px' }}>
                {/* ─── UNDERSTANDING ─── */}
                {activeTab === 'understanding' && (
                  <UnderstandingPanel u={result.understanding || {}} />
                )}

                {/* ─── SOLUTION ─── */}
                {activeTab === 'solution' && (
                  <SolutionPanel sol={result.proposedSolution || {}} />
                )}

                {/* ─── RELEASE NOTES ─── */}
                {activeTab === 'release' && (
                  <ReleaseNotesPanel notes={result.releaseNotes} />
                )}

                {/* ─── TEST SCENARIOS ─── */}
                {activeTab === 'tests' && (
                  <ScenariosPanel
                    all={result.testScenarios || []}
                    filtered={filteredScenarios}
                    filter={scenarioFilter}
                    setFilter={setScenarioFilter}
                    onExportCsv={exportScenariosCsv}
                  />
                )}

                {/* ─── BPML SCRIPTS ─── */}
                {activeTab === 'bpml' && (
                  <BpmlPanel scripts={result.mappedBPMLScripts || []} />
                )}

                {/* ─── FUT ─── */}
                {activeTab === 'fut' && result.futOutline && (
                  <FutPanel f={result.futOutline} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PANELS
// ════════════════════════════════════════════════════════════════════════════
function UnderstandingPanel({ u }) {
  const cmplx = CMPLX_C[u.complexity] || CMPLX_C.Medium
  return (
    <div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:18 }}>
        {u.storyType && <Pill bg="#eef2ff" fg="#3730a3">{u.storyType}</Pill>}
        {u.affectedModule && <Pill bg="#f1f5f9" fg="#475569">{u.affectedModule}</Pill>}
        {u.complexity && <Pill bg={cmplx.bg} fg={cmplx.fg}>{u.complexity} complexity</Pill>}
      </div>
      <p style={{
        fontSize:14, color:TEXT, lineHeight:1.65, margin:'0 0 14px',
      }}>
        {u.summary || '—'}
      </p>
      {u.complexityReason && (
        <div style={{
          background:SOFT_BG, borderRadius:8, padding:'12px 14px',
          fontSize:12, color:'#475569', lineHeight:1.55,
          borderLeft:`3px solid ${cmplx.fg}`,
        }}>
          <strong style={{ color:TEXT }}>Why {u.complexity?.toLowerCase()}: </strong>
          {u.complexityReason}
        </div>
      )}
    </div>
  )
}

function SolutionPanel({ sol }) {
  const groups = [
    ['Backend',       sol.backendChanges],
    ['Frontend',      sol.frontendChanges],
    ['Database',      sol.databaseChanges],
    ['API',           sol.apiChanges],
    ['Dependencies',  sol.dependencies],
    ['Configuration', sol.configurationChanges],
  ].filter(([, items]) => items?.length && items[0])

  return (
    <div>
      {sol.overview && (
        <p style={{
          fontSize:14, color:TEXT, lineHeight:1.65, margin:'0 0 22px',
        }}>
          {sol.overview}
        </p>
      )}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:12,
      }}>
        {groups.map(([title, items]) => (
          <div key={title} style={{
            background:SOFT_BG, borderRadius:8, padding:'14px 16px',
            border:`1px solid ${BORDER_SOFT}`,
          }}>
            <div style={{
              fontSize:10.5, fontWeight:700, color:NAVY,
              textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10,
            }}>
              {title}
            </div>
            <ul style={{ margin:0, padding:0, listStyle:'none' }}>
              {items.map((item, i) => (
                <li key={i} style={{
                  fontSize:12, color:'#334155', lineHeight:1.55,
                  paddingLeft:14, position:'relative', marginBottom:6,
                }}>
                  <span style={{
                    position:'absolute', left:0, top:8, width:5, height:5,
                    borderRadius:'50%', background:`${NAVY}80`,
                  }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReleaseNotesPanel({ notes }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <CopyBtn text={notes} label="Copy text" />
      </div>
      <div style={{
        background:'#fafbfc', border:`1px solid ${BORDER_SOFT}`, borderRadius:10,
        padding:'20px 24px', borderLeft:`3px solid ${NAVY}`,
      }}>
        <div style={{
          fontSize:10.5, fontWeight:700, color:NAVY,
          textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10,
        }}>
          Release notes draft
        </div>
        <p style={{
          fontSize:14, color:TEXT, lineHeight:1.7, margin:0,
        }}>
          {notes}
        </p>
      </div>
    </div>
  )
}

function ScenariosPanel({ all, filtered, filter, setFilter, onExportCsv }) {
  const types = [...new Set(all.map(t => t.type))]
  const priorities = [...new Set(all.map(t => t.priority))]

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        marginBottom:16, gap:10, flexWrap:'wrap',
      }}>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <FilterChip
            active={filter.type === 'all'}
            onClick={() => setFilter(f => ({ ...f, type:'all' }))}
            label={`All types (${all.length})`}
          />
          {types.map(t => {
            const c = TYP_C[t] || { bg:'#f1f5f9', fg:'#475569' }
            const count = all.filter(x => x.type === t).length
            return (
              <FilterChip
                key={t}
                active={filter.type === t}
                onClick={() => setFilter(f => ({ ...f, type: filter.type === t ? 'all' : t }))}
                label={`${t} ${count}`}
                color={c}
              />
            )
          })}
          <span style={{ width:1, height:18, background:BORDER, margin:'0 4px' }} />
          {priorities.map(p => {
            const c = PRI_C[p] || PRI_C['good-to-run']
            const count = all.filter(x => x.priority === p).length
            return (
              <FilterChip
                key={p}
                active={filter.priority === p}
                onClick={() => setFilter(f => ({ ...f, priority: filter.priority === p ? 'all' : p }))}
                label={`${p} ${count}`}
                color={c}
              />
            )
          })}
        </div>
        <button
          onClick={onExportCsv}
          style={{
            padding:'6px 12px', fontSize:11, fontWeight:600,
            background:'#fff', color:NAVY, border:`1px solid ${NAVY}40`,
            borderRadius:5, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
          }}
        >
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{
          padding:'40px', textAlign:'center', color:MUTED, fontSize:13,
          background:SOFT_BG, borderRadius:8,
        }}>
          No scenarios match the current filter.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(tc => <ScenarioCard key={tc.id} tc={tc} />)}
        </div>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, label, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize:11, fontWeight:500,
        padding:'4px 10px', borderRadius:14,
        background: active ? (color?.bg || `${NAVY}10`) : '#fff',
        color: active ? (color?.fg || NAVY) : MUTED,
        border:`1px solid ${active ? (color?.fg || NAVY) + '30' : BORDER}`,
        cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize',
        transition:'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function ScenarioCard({ tc }) {
  const [expanded, setExpanded] = useState(false)
  const pc = PRI_C[tc.priority] || PRI_C['good-to-run']
  const tcC = TYP_C[tc.type] || { bg:'#f1f5f9', fg:'#475569' }

  return (
    <div className="ima-card-hover" style={{
      background:'#fff', border:`1px solid ${BORDER}`, borderRadius:8,
      transition:'all 0.15s',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding:'14px 16px', cursor:'pointer',
          display:'flex', alignItems:'center', gap:12,
        }}
      >
        <span style={{
          fontSize:11, fontWeight:600, color:NAVY,
          fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',
          minWidth:60, flexShrink:0,
        }}>
          {tc.id}
        </span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontSize:13, fontWeight:500, color:TEXT, lineHeight:1.4,
            overflow:'hidden', textOverflow:'ellipsis',
            whiteSpace: expanded ? 'normal' : 'nowrap',
          }}>
            {tc.title}
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          <Pill bg={pc.bg} fg={pc.fg}>{tc.priority}</Pill>
          <Pill bg={tcC.bg} fg={tcC.fg}>{tc.type}</Pill>
        </div>
        <span style={{
          fontSize:11, color:MUTED, marginLeft:4,
          transition:'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
        }}>▾</span>
      </div>

      {expanded && (
        <div style={{
          padding:'4px 16px 16px 16px',
          borderTop:`1px solid ${BORDER_SOFT}`, background:'#fafbfc',
        }}>
          {tc.preconditions && (
            <div style={{ marginTop:14 }}>
              <div style={{
                fontSize:10, fontWeight:700, color:MUTED,
                textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6,
              }}>Preconditions</div>
              <div style={{ fontSize:12, color:'#475569', lineHeight:1.55 }}>{tc.preconditions}</div>
            </div>
          )}
          <div style={{ marginTop:14 }}>
            <div style={{
              fontSize:10, fontWeight:700, color:MUTED,
              textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8,
            }}>Steps</div>
            <ol style={{ margin:0, paddingLeft:20 }}>
              {(tc.steps || []).map((s, i) => (
                <li key={i} style={{ fontSize:12.5, color:'#334155', lineHeight:1.6, marginBottom:4 }}>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <div style={{
            marginTop:14, padding:'10px 12px',
            background:'#f0fdf4', borderRadius:6, border:'1px solid #bbf7d0',
          }}>
            <span style={{
              fontSize:10, fontWeight:700, color:'#15803d',
              textTransform:'uppercase', letterSpacing:'0.08em', marginRight:8,
            }}>Expected</span>
            <span style={{ fontSize:12.5, color:'#14532d', lineHeight:1.55 }}>
              {tc.expectedResult}
            </span>
          </div>
          {tc.testData && (
            <div style={{ marginTop:10, fontSize:11.5, color:MUTED }}>
              <strong style={{ color:'#475569' }}>Test data: </strong>{tc.testData}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BpmlPanel({ scripts }) {
  if (!scripts.length) {
    return (
      <div style={{ padding:'40px', textAlign:'center', color:MUTED, fontSize:13 }}>
        No BPML scripts mapped.
      </div>
    )
  }
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:10 }}>
      {scripts.map((s, i) => {
        const rc = REL_C[s.relevance] || REL_C.related
        const actC = s.action === 'new-script-needed'
          ? { bg:'#fef2f2', fg:'#991b1b' }
          : s.action === 'update-script'
            ? { bg:'#fffbeb', fg:'#92400e' }
            : { bg:'#f0fdf4', fg:'#15803d' }
        return (
          <div key={i} className="ima-card-hover" style={{
            background:'#fff', border:`1px solid ${BORDER}`, borderRadius:8,
            padding:'14px 16px', transition:'all 0.15s',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
              <Pill bg="#f1f5f9" fg={NAVY} mono>{s.id}</Pill>
              <Pill bg={rc.bg} fg={rc.fg}>{s.relevance}</Pill>
              {s.action && <Pill bg={actC.bg} fg={actC.fg}>{s.action.replace(/-/g, ' ')}</Pill>}
            </div>
            {s.scriptName && (
              <div style={{
                fontSize:11, color:MUTED, marginBottom:8,
                fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',
                wordBreak:'break-word',
              }}>
                {s.scriptName}
              </div>
            )}
            <div style={{
              fontSize:12, color:'#334155', lineHeight:1.55, marginBottom: s.driveLink ? 12 : 0,
            }}>
              {s.reason}
            </div>
            {s.driveLink && (
              <a
                href={s.driveLink} target="_blank" rel="noopener noreferrer"
                style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  fontSize:11, fontWeight:500, padding:'5px 10px',
                  background:'#fff', color:NAVY,
                  border:`1px solid ${NAVY}30`, borderRadius:5,
                  textDecoration:'none', transition:'all 0.15s',
                }}
              >
                Open in Drive ↗
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

function FutPanel({ f }) {
  const Section = ({ title, items, icon, color = NAVY }) => {
    if (!items?.length) return null
    return (
      <div style={{ marginBottom:18 }}>
        <div style={{
          fontSize:10.5, fontWeight:700, color, marginBottom:8,
          textTransform:'uppercase', letterSpacing:'0.08em',
        }}>
          {title}
        </div>
        <ul style={{ margin:0, padding:0, listStyle:'none' }}>
          {items.map((item, i) => (
            <li key={i} style={{
              fontSize:12.5, color:'#334155', lineHeight:1.6,
              paddingLeft:20, position:'relative', marginBottom:6,
            }}>
              <span style={{
                position:'absolute', left:0, top:0, fontSize:11, color, fontWeight:600,
              }}>{icon}</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div>
      {f.testObjective && (
        <div style={{
          background:SOFT_BG, borderRadius:8, padding:'14px 16px', marginBottom:22,
          borderLeft:`3px solid ${NAVY}`,
        }}>
          <div style={{
            fontSize:10.5, fontWeight:700, color:NAVY, marginBottom:6,
            textTransform:'uppercase', letterSpacing:'0.08em',
          }}>Test objective</div>
          <p style={{ fontSize:13, color:TEXT, lineHeight:1.6, margin:0 }}>{f.testObjective}</p>
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        <div>
          <Section title="Prerequisites" items={f.prerequisites} icon="•" />
          <Section title="In scope" items={f.inScope} icon="✓" color="#15803d" />
          <Section title="Out of scope" items={f.outOfScope} icon="✗" color="#b91c1c" />
        </div>
        <div>
          <Section title="Evidence sections" items={f.evidenceSections} icon="📸" />
          <Section title="Sign-off criteria" items={f.signOffCriteria} icon="☐" />
        </div>
      </div>
    </div>
  )
}
