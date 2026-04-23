import { useState } from 'react'
import { BPML_SCRIPTS, MODULES } from '../data/bpml_knowledge.js'
import { buildDiagnosePrompt } from '../lib/prompts.js'

const PRI_C = {'must-run':{bg:'#fee2e2',fg:'#991b1b'},'should-run':{bg:'#fef3c7',fg:'#92400e'},'good-to-run':{bg:'#d1fae5',fg:'#065f46'}}
const TYP_C = {positive:{bg:'#d1fae5',fg:'#065f46'},negative:{bg:'#fee2e2',fg:'#991b1b'},'edge-case':{bg:'#fef3c7',fg:'#92400e'},regression:{bg:'#e0e7ff',fg:'#3730a3'},boundary:{bg:'#f3e8ff',fg:'#5b21b6'}}
const REL_C = {direct:{bg:'#fee2e2',fg:'#991b1b'},regression:{bg:'#e0e7ff',fg:'#3730a3'},related:{bg:'#fef3c7',fg:'#92400e'}}

function Pill({bg,fg,children}){return <span style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:500,background:bg,color:fg,whiteSpace:'nowrap',marginRight:4}}>{children}</span>}
function Label({children}){return <div style={{fontSize:10,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{children}</div>}

export default function DiagnoseStory({ memories, onMemoryChange }) {
  const [desc, setDesc] = useState('')
  const [notes, setNotes] = useState('')
  const [mod, setMod] = useState('')
  const [rules, setRules] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = desc.trim().length > 10

  async function handleGenerate() {
    if (!canSubmit) return
    setLoading(true); setError(''); setResult(null)
    const prompt = buildDiagnosePrompt(memories)
    const userMsg = `STORY TO ANALYSE:\n\n${desc}\n\n${notes ? `ACCEPTANCE CRITERIA / NOTES:\n${notes}\n` : ''}${mod ? `MODULE: ${mod}\n` : ''}${rules ? `BUSINESS RULES:\n${rules}` : ''}`

    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:4096, system:prompt, messages:[{role:'user',content:userMsg}] }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`)
      const text = (data.content||[]).map(b=>b.text||'').join('')
      const parsed = JSON.parse(text.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim())
      setResult(parsed)
      // Auto-save
      try {
        await fetch('/api/memory', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ kind:'diagnose', title: desc.slice(0,120), content: parsed.understanding?.summary || '', module: parsed.understanding?.affectedModule || mod })
        })
        onMemoryChange?.()
      } catch(e){}
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div style={{maxWidth:900,margin:'0 auto',padding:'24px'}}>
      {/* Input */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:16,marginBottom:20}}>
        <div>
          <Label>Story description / requirement</Label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Paste the story description or requirement..." rows={4} style={{width:'100%',fontSize:13,padding:'10px 12px',marginBottom:10}} />
          <Label>Acceptance criteria / notes <span style={{fontWeight:400,textTransform:'none'}}>(optional)</span></Label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any acceptance criteria, business rules..." rows={2} style={{width:'100%',fontSize:12,padding:'8px 12px',background:'#f8fafc'}} />
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div>
            <Label>Module</Label>
            <select value={mod} onChange={e=>setMod(e.target.value)} style={{width:'100%',height:36,fontSize:12,border:'1px solid #cbd5e1',borderRadius:6,padding:'0 10px',background:'#fff'}}>
              <option value="">Select module...</option>
              {MODULES.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>Business rules <span style={{fontWeight:400,textTransform:'none'}}>(optional)</span></Label>
            <textarea value={rules} onChange={e=>setRules(e.target.value)} placeholder="Constraints, scope..." rows={3} style={{width:'100%',fontSize:12,padding:'8px 10px'}} />
          </div>
          <button onClick={handleGenerate} disabled={!canSubmit||loading} style={{
            marginTop:'auto',width:'100%',padding:'11px 0',fontSize:13,fontWeight:600,
            background:(!canSubmit||loading)?'#94a3b8':'#5B21B6',color:'#fff',
            border:'none',borderRadius:8,cursor:(!canSubmit||loading)?'not-allowed':'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontFamily:'inherit',
          }}>
            <span style={{fontSize:15}}>✨</span> {loading ? 'Generating...' : 'Generate solution & tests'}
          </button>
        </div>
      </div>

      {error && <div style={{padding:'10px 14px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,color:'#991b1b',fontSize:12,marginBottom:16}}>{error}</div>}

      {loading && (
        <div style={{padding:'48px',textAlign:'center',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:32,marginBottom:10}}>✨</div>
          <div style={{fontSize:14,fontWeight:500,color:'#0f172a'}}>Generating solution, tests & documentation...</div>
          <div style={{fontSize:12,color:'#64748b',marginTop:6}}>Analysing against {BPML_SCRIPTS.length} BPML scripts and IMA360 architecture</div>
        </div>
      )}

      {/* ═══ RESULTS ═══ */}
      {result && !loading && (
        <div>
          {/* 1. Understanding */}
          <Sec icon="🧠" title="Understanding" color="#5B21B6">
            <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderLeft:'4px solid #5B21B6',borderRadius:'0 10px 10px 0',padding:'14px 18px'}}>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                {result.understanding?.storyType && <Pill bg="#e0e7ff" fg="#3730a3">{result.understanding.storyType}</Pill>}
                {result.understanding?.affectedModule && <Pill bg="#f1f5f9" fg="#475569">{result.understanding.affectedModule}</Pill>}
                {result.understanding?.complexity && <Pill bg={result.understanding.complexity==='High'?'#fee2e2':result.understanding.complexity==='Medium'?'#fef3c7':'#d1fae5'} fg={result.understanding.complexity==='High'?'#991b1b':result.understanding.complexity==='Medium'?'#92400e':'#065f46'}>{result.understanding.complexity} complexity</Pill>}
              </div>
              <p style={{fontSize:13,color:'#0f172a',lineHeight:1.6,margin:'0 0 6px'}}>{result.understanding?.summary}</p>
              {result.understanding?.complexityReason && <p style={{fontSize:11,color:'#64748b',margin:0}}><strong>Why {result.understanding.complexity?.toLowerCase()} complexity:</strong> {result.understanding.complexityReason}</p>}
            </div>
          </Sec>

          {/* 2. Proposed Solution */}
          <Sec icon="💡" title="Proposed solution" color="#0F6E56">
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'16px 18px'}}>
              <p style={{fontSize:13,color:'#0f172a',lineHeight:1.6,marginBottom:14}}>{result.proposedSolution?.overview}</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[['Backend',result.proposedSolution?.backendChanges],['Frontend',result.proposedSolution?.frontendChanges],['Database',result.proposedSolution?.databaseChanges],['API',result.proposedSolution?.apiChanges],['Dependencies',result.proposedSolution?.dependencies],['Configuration',result.proposedSolution?.configurationChanges]]
                  .filter(([,items])=>items&&items.length>0&&items[0])
                  .map(([title,items])=>(
                    <div key={title} style={{padding:'10px 14px',background:'#f8fafc',borderRadius:8}}>
                      <div style={{fontSize:11,fontWeight:600,color:'#0f172a',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.04em'}}>{title}</div>
                      {items.map((item,i)=><div key={i} style={{fontSize:11,color:'#475569',lineHeight:1.5,marginBottom:3,paddingLeft:10,borderLeft:'2px solid #e2e8f0'}}>{item}</div>)}
                    </div>
                  ))}
              </div>
            </div>
          </Sec>

          {/* 3. Release Notes */}
          {result.releaseNotes && (
            <Sec icon="📝" title="Release notes draft" color="#27500A">
              <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderLeft:'4px solid #27500A',borderRadius:'0 10px 10px 0',padding:'14px 18px'}}>
                <p style={{fontSize:13,color:'#0f172a',lineHeight:1.6,margin:0,fontStyle:'italic'}}>{result.releaseNotes}</p>
              </div>
            </Sec>
          )}

          {/* 4. Test Scenarios */}
          <Sec icon="🧪" title={`Test scenarios (${(result.testScenarios||[]).length})`}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {(result.testScenarios||[]).map((tc,i)=>{
                const pc=PRI_C[tc.priority]||PRI_C['good-to-run']
                const tc_c=TYP_C[tc.type]||{bg:'#f1f5f9',fg:'#475569'}
                return (
                  <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'14px 16px'}}>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
                      <span style={{fontSize:11,fontWeight:600,color:'#5B21B6'}}>{tc.id}</span>
                      <Pill bg={pc.bg} fg={pc.fg}>{tc.priority}</Pill>
                      <Pill bg={tc_c.bg} fg={tc_c.fg}>{tc.type}</Pill>
                    </div>
                    <div style={{fontSize:13,fontWeight:500,color:'#0f172a',marginBottom:8}}>{tc.title}</div>
                    {tc.preconditions && <div style={{fontSize:10,color:'#64748b',padding:'4px 8px',background:'#f8fafc',borderRadius:4,marginBottom:8}}><strong>Pre:</strong> {tc.preconditions}</div>}
                    <div style={{marginBottom:8}}>
                      {(tc.steps||[]).map((step,si)=>(
                        <div key={si} style={{display:'flex',gap:6,fontSize:11,color:'#475569',lineHeight:1.5,marginBottom:2}}>
                          <span style={{color:'#94a3b8',fontWeight:600,flexShrink:0,minWidth:14,textAlign:'right'}}>{si+1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:11,padding:'6px 10px',borderRadius:5,background:'#ECFDF5',color:'#065f46'}}>
                      <strong>Expected:</strong> {tc.expectedResult}
                    </div>
                    {tc.testData && <div style={{fontSize:10,color:'#64748b',marginTop:6}}><strong>Data:</strong> {tc.testData}</div>}
                  </div>
                )
              })}
            </div>
          </Sec>

          {/* 5. Mapped BPML Scripts */}
          <Sec icon="📎" title={`Mapped BPML scripts (${(result.mappedBPMLScripts||[]).length})`}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {(result.mappedBPMLScripts||[]).map((ms,i)=>{
                const rc=REL_C[ms.relevance]||REL_C.related
                return (
                  <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'12px 14px'}}>
                    <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                      <span style={{fontSize:11,fontWeight:600,fontFamily:'monospace',color:'#1F3864'}}>{ms.id}</span>
                      <Pill bg={rc.bg} fg={rc.fg}>{ms.relevance}</Pill>
                    </div>
                    {ms.scriptName && <div style={{fontSize:10,fontFamily:'monospace',color:'#64748b',marginBottom:4}}>{ms.scriptName}</div>}
                    <div style={{fontSize:10,color:'#475569',lineHeight:1.5,marginBottom:6}}>{ms.reason}</div>
                    {ms.action && <Pill bg={ms.action==='new-script-needed'?'#fee2e2':ms.action==='update-script'?'#fef3c7':'#d1fae5'} fg={ms.action==='new-script-needed'?'#991b1b':ms.action==='update-script'?'#92400e':'#065f46'}>{ms.action.replace(/-/g,' ')}</Pill>}
                    {ms.driveLink && <a href={ms.driveLink} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:4,marginLeft:6,fontSize:10,padding:'2px 7px',background:'#1a73e8',color:'#fff',borderRadius:4,textDecoration:'none',fontWeight:500}}>↗ Open</a>}
                  </div>
                )
              })}
            </div>
          </Sec>

          {/* 6. FUT Outline */}
          {result.futOutline && (
            <Sec icon="📄" title="FUT document outline">
              <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'18px 20px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
                  <div>
                    <Label>Test objective</Label>
                    <p style={{fontSize:12,color:'#0f172a',lineHeight:1.6,marginBottom:14}}>{result.futOutline.testObjective}</p>
                    <Label>Prerequisites</Label>
                    <div style={{marginBottom:14}}>{(result.futOutline.prerequisites||[]).map((p,i)=><div key={i} style={{fontSize:11,color:'#475569',lineHeight:1.5,paddingLeft:10,borderLeft:'2px solid #e2e8f0',marginBottom:2}}>{p}</div>)}</div>
                    <Label>In scope</Label>
                    <div style={{marginBottom:14}}>{(result.futOutline.inScope||[]).map((p,i)=><div key={i} style={{fontSize:11,color:'#065f46',lineHeight:1.5,paddingLeft:10,borderLeft:'2px solid #d1fae5',marginBottom:2}}>✓ {p}</div>)}</div>
                    <Label>Out of scope</Label>
                    <div>{(result.futOutline.outOfScope||[]).map((p,i)=><div key={i} style={{fontSize:11,color:'#991b1b',lineHeight:1.5,paddingLeft:10,borderLeft:'2px solid #fee2e2',marginBottom:2}}>✗ {p}</div>)}</div>
                  </div>
                  <div>
                    <Label>Evidence sections</Label>
                    <div style={{marginBottom:14}}>{(result.futOutline.evidenceSections||[]).map((e,i)=><div key={i} style={{fontSize:11,color:'#475569',padding:'5px 9px',background:'#f8fafc',borderRadius:4,marginBottom:3}}>📸 {e}</div>)}</div>
                    <Label>Sign-off criteria</Label>
                    <div>{(result.futOutline.signOffCriteria||[]).map((c,i)=><div key={i} style={{fontSize:11,color:'#0f172a',lineHeight:1.5,paddingLeft:10,borderLeft:'2px solid #c7d2fe',marginBottom:2}}>☐ {c}</div>)}</div>
                  </div>
                </div>
              </div>
            </Sec>
          )}
        </div>
      )}
    </div>
  )
}

function Sec({icon,title,children,color}){
  return <div style={{marginBottom:18}}><div style={{display:'flex',alignItems:'center',gap:6,fontSize:14,fontWeight:500,color:color||'#1F3864',marginBottom:8}}><span style={{fontSize:16}}>{icon}</span>{title}</div>{children}</div>
}
