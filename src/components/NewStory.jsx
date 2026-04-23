import { useState } from 'react'
import { BPML_SCRIPTS, MODULES } from '../data/bpml_knowledge.js'
import { buildNewStoryPrompt } from '../lib/prompts.js'

function Label({children,req}){return <div style={{fontSize:10,fontWeight:600,color:'#0f172a',marginBottom:6,display:'flex',alignItems:'center'}}>{children}{req&&<span style={{color:'#dc2626',marginLeft:2}}>*</span>}</div>}

export default function NewStory({ memories, onMemoryChange }) {
  const [desc, setDesc] = useState('')
  const [requirement, setRequirement] = useState('')
  const [mod, setMod] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showOriginal, setShowOriginal] = useState(false)
  const [copiedField, setCopiedField] = useState(null)

  const canSubmit = desc.trim().length > 5 && requirement.trim().length > 3

  const copyField = (text, name) => { navigator.clipboard.writeText(text); setCopiedField(name); setTimeout(()=>setCopiedField(null),1500) }
  const copyTSV = () => {
    const tsv = ['Test Scenario\tExpected Results\tActual Results', ...(result.testScenarios||[]).map(s=>`${s.testScenario}\t${s.expectedResults}\t${s.actualResults||''}`)].join('\n')
    navigator.clipboard.writeText(tsv); setCopiedField('tsv'); setTimeout(()=>setCopiedField(null),1500)
  }

  async function handleGenerate() {
    if (!canSubmit) return
    setLoading(true); setError(''); setResult(null)
    const prompt = buildNewStoryPrompt(memories)
    const userMsg = `NEW STORY:\n\nDESCRIPTION:\n${desc}\n\nREQUIREMENT (brief):\n${requirement}\n\n${mod ? `MODULE: ${mod}` : ''}`

    try {
      const r = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:4000, system:prompt, messages:[{role:'user',content:userMsg}] }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`)
      const text = (data.content||[]).map(b=>b.text||'').join('')
      const parsed = JSON.parse(text.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim())
      setResult(parsed)
      try {
        await fetch('/api/memory', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ kind:'story', title:desc.slice(0,120), content:parsed.enhancedRequirement||'', module:parsed.affectedModule||mod })
        })
        onMemoryChange?.()
      } catch(e){}
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }

  const relatedScripts = (result?.relatedBPMLScripts||[]).map(id=>BPML_SCRIPTS.find(s=>s.id===id)).filter(Boolean)

  return (
    <div style={{maxWidth:900,margin:'0 auto',padding:'24px'}}>
      {/* Input — matches IMA360 backlog Details layout */}
      <div style={{marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <h2 style={{fontSize:14,fontWeight:600,color:'#0f172a',margin:0}}>Details</h2>
        <select value={mod} onChange={e=>setMod(e.target.value)} style={{fontSize:11,height:30,padding:'0 8px',border:'1px solid #cbd5e1',borderRadius:6,background:'#fff',color:'#475569'}}>
          <option value="">Module (optional)</option>
          {MODULES.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div style={{height:1,background:'#e2e8f0',marginBottom:14}} />

      {/* Story Description */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:'12px 14px',marginBottom:12}}>
        <Label req>Story Description</Label>
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Story description (type @ to mention)" rows={3} style={{width:'100%',fontSize:13,padding:'9px 11px',background:'#fafbfc'}} />
      </div>

      {/* Requirement + Proposed Solution placeholder */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:'12px 14px'}}>
          <Label req>Requirement</Label>
          <textarea value={requirement} onChange={e=>setRequirement(e.target.value)} placeholder="Brief keywords or rough sentence — the AI will enhance it" rows={4} style={{width:'100%',fontSize:13,padding:'9px 11px',background:'#fafbfc'}} />
        </div>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:'12px 14px'}}>
          <Label>Proposed Solution</Label>
          <div style={{border:'1px dashed #cbd5e1',borderRadius:6,padding:'10px',fontSize:12,color:'#94a3b8',background:'#fafbfc',minHeight:88,display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',lineHeight:1.5,fontStyle:'italic'}}>
            Will be auto-generated from a BA perspective
          </div>
        </div>
      </div>

      <button onClick={handleGenerate} disabled={!canSubmit||loading} style={{
        padding:'11px 24px',fontSize:13,fontWeight:600,
        background:(!canSubmit||loading)?'#94a3b8':'#1F3864',color:'#fff',
        border:'none',borderRadius:8,cursor:(!canSubmit||loading)?'not-allowed':'pointer',
        display:'flex',alignItems:'center',gap:8,fontFamily:'inherit',
      }}>
        <span style={{fontSize:15}}>✨</span> {loading ? 'Generating...' : 'Generate enhanced requirement, solution & test scenarios'}
      </button>

      {error && <div style={{marginTop:14,padding:'10px 14px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,color:'#991b1b',fontSize:12}}>{error}</div>}

      {loading && (
        <div style={{marginTop:20,padding:'48px',textAlign:'center',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:32,marginBottom:10}}>✨</div>
          <div style={{fontSize:14,fontWeight:500,color:'#0f172a'}}>Generating story analysis...</div>
          <div style={{fontSize:12,color:'#64748b',marginTop:6}}>Connecting dots across BPML scripts and IMA360 business logic</div>
        </div>
      )}

      {/* ═══ RESULTS ═══ */}
      {result && !loading && (
        <div style={{marginTop:22}}>
          {/* AI strip */}
          {(result.affectedModule || relatedScripts.length > 0) && (
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:16,padding:'10px 14px',background:'#f0f4ff',borderRadius:8,border:'1px solid #dbeafe'}}>
              <span style={{fontSize:10,fontWeight:600,color:'#1F3864',textTransform:'uppercase',letterSpacing:'0.05em'}}>AI analysis</span>
              {result.affectedModule && <span style={{fontSize:10,padding:'3px 10px',background:'#1F3864',color:'#fff',borderRadius:20,fontWeight:500}}>{result.affectedModule}</span>}
              {relatedScripts.map(s=>(
                <a key={s.id} href={s.driveLink||'#'} target="_blank" rel="noopener noreferrer" style={{fontSize:10,padding:'3px 9px',background:'#fff',color:'#1F3864',borderRadius:20,fontWeight:500,border:'1px solid #dbeafe',fontFamily:'monospace',textDecoration:'none'}}>{s.id} {s.driveLink&&'↗'}</a>
              ))}
            </div>
          )}

          {/* Enhanced Requirement + Proposed Solution */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:18}}>
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:'12px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <Label req>Requirement <span style={{fontSize:8,fontWeight:600,padding:'1px 5px',borderRadius:20,background:'#f3e8ff',color:'#6b21a8',marginLeft:5}}>✨ Enhanced</span></Label>
                <div style={{display:'flex',gap:4}}>
                  <button onClick={()=>setShowOriginal(!showOriginal)} style={linkBtn}>{showOriginal?'Show enhanced':'Show original'}</button>
                  <button onClick={()=>copyField(result.enhancedRequirement,'req')} style={linkBtn}>{copiedField==='req'?'✓ Copied':'Copy'}</button>
                </div>
              </div>
              <div style={{padding:'10px 12px',fontSize:13,lineHeight:1.6,borderRadius:6,whiteSpace:'pre-wrap',
                color:showOriginal?'#94a3b8':'#0f172a',
                background:showOriginal?'#fafbfc':'#f0f9ff',
                border:`1px solid ${showOriginal?'#e5e7eb':'#bae6fd'}`,
                fontStyle:showOriginal?'italic':'normal',
              }}>{showOriginal ? requirement : result.enhancedRequirement}</div>
            </div>

            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:'12px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <Label>Proposed Solution <span style={{fontSize:8,fontWeight:600,padding:'1px 5px',borderRadius:20,background:'#f3e8ff',color:'#6b21a8',marginLeft:5}}>✨ BA perspective</span></Label>
                <button onClick={()=>copyField(result.proposedSolution,'sol')} style={linkBtn}>{copiedField==='sol'?'✓ Copied':'Copy'}</button>
              </div>
              <div style={{padding:'10px 12px',fontSize:13,lineHeight:1.6,borderRadius:6,whiteSpace:'pre-wrap',color:'#0f172a',background:'#f0fdf4',border:'1px solid #bbf7d0'}}>
                {result.proposedSolution}
              </div>
            </div>
          </div>

          {/* Test Scenarios Table */}
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden'}}>
            <div style={{padding:'10px 14px',background:'#fafbfc',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:13,fontWeight:500,color:'#0f172a'}}>Test scenarios</span>
                <span style={{fontSize:8,fontWeight:600,padding:'1px 5px',borderRadius:20,background:'#f3e8ff',color:'#6b21a8'}}>✨ Generated</span>
                <span style={{fontSize:10,color:'#64748b',padding:'2px 8px',background:'#f1f5f9',borderRadius:20}}>{(result.testScenarios||[]).length} scenarios</span>
              </div>
              <button onClick={copyTSV} style={linkBtn}>{copiedField==='tsv'?'✓ Copied as TSV':'Copy as TSV'}</button>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
                <colgroup><col style={{width:'36px'}}/><col style={{width:'38%'}}/><col style={{width:'31%'}}/><col style={{width:'31%'}}/></colgroup>
                <thead><tr style={{background:'#f8fafc'}}>
                  <th style={thS}>#</th><th style={thS}>TEST SCENARIO</th><th style={thS}>EXPECTED RESULTS</th><th style={thS}>ACTUAL RESULTS</th>
                </tr></thead>
                <tbody>
                  {(result.testScenarios||[]).map((s,i)=>(
                    <TestRow key={i} scenario={s} index={i+1} />
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{padding:'10px 14px',borderTop:'1px solid #e2e8f0',background:'#fafbfc',fontSize:11,color:'#94a3b8'}}>
              💡 Click any "Actual Results" cell to fill in results during testing. Use "Copy as TSV" to paste into the IMA360 backlog tool.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TestRow({scenario,index}) {
  const [actual, setActual] = useState('')
  return (
    <tr style={{borderTop:'1px solid #f1f5f9'}}>
      <td style={{...tdS,textAlign:'center',color:'#94a3b8',fontFamily:'monospace',fontSize:11,fontWeight:500}}>{String(index).padStart(2,'0')}</td>
      <td style={tdS}><div style={{fontSize:12,lineHeight:1.55,color:'#0f172a'}}>{scenario.testScenario}</div></td>
      <td style={tdS}><div style={{fontSize:12,lineHeight:1.55,color:'#166534'}}>{scenario.expectedResults}</div></td>
      <td style={tdS}><textarea value={actual} onChange={e=>setActual(e.target.value)} placeholder="Actual result" style={{width:'100%',minHeight:50,fontSize:11,padding:'5px 7px',border:'1px solid #e5e7eb',borderRadius:4,background:actual?'#fffbeb':'#fafbfc',resize:'vertical',fontFamily:'inherit'}} /></td>
    </tr>
  )
}

const linkBtn = {padding:'3px 8px',fontSize:10,fontWeight:500,background:'transparent',border:'1px solid #e2e8f0',borderRadius:4,color:'#475569',cursor:'pointer',fontFamily:'inherit'}
const thS = {padding:'8px 12px',textAlign:'left',fontSize:9,fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid #e2e8f0'}
const tdS = {padding:'10px 12px',verticalAlign:'top'}
