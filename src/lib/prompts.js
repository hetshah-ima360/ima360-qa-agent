import { BPML_SCRIPTS } from '../data/bpml_knowledge.js'

function getDomain(memories) {
  const bpml = BPML_SCRIPTS.map(s => `${s.id} | ${s.module} > ${s.submenu} > ${s.fn} | ${s.crit} | ${s.gist}`).join('\n')
  const mem = memories.length > 0 ? `\n### Team memory (${memories.length} past items)\n${memories.slice(0,40).map(m=>`#${m.id} [${m.kind}] ${m.title} | ${m.module||''} | ${(m.content||'').slice(0,200)}`).join('\n')}\n` : ''

  return `## IMA360 CUSTOMER REBATES

### Architecture
CONTRACT SETUP (110) → CALCULATION (120) → ACCRUALS (130) → PAYMENTS (140) → REPORTING (150) → UTILITIES (160-170)
Cross-cutting: Security (user roles, login tracking), Master Data, Alert Management, Global UI (Grid, dropdowns, font standards).

### Modules
**CONTRACT SETUP (110)** — Contract CRUD (Multiaxis/Flatrate/Single Axis), List, Approval with Pending Changes (pending_change_id in contract_header), Change Log, Validator, Document Mgmt. Tables: contract_header (base + pending rows), contract_line, contract_approval_workflow. Pending Changes create new rows; mismatched accrual/payment amounts cause "Cannot change system generated values" error.

**CALCULATION (120)** — Formula Lab (rate conditions, tiers), Calc Simulation (Run Online/Batch, needs at least one filter), Calc Analysis, Exception Mgmt (5 sub-scripts: generation→analysis→simulation→management→approval), Quota Mgmt, Rebate Estimator. Results feed directly into Accruals.

**ACCRUALS (130)** — Accrual Postings (AC/AR/DA/PPA types), Approvals. Rebate Tolerance blocks below-threshold amounts. Known: tolerance halves after AR+DA. After approval, amounts write back to contract_header. Flow: calculation_result → accrual_posting → contract_header.

**PAYMENTS (140)** — Payment Postings, Approvals, Partner Statement, MCF Integration. Due date uses posting_date baseline. Amounts write back to contract_header.

**REPORTING (150)** — Postings Reconciliation, Compliance, Customer Payment Summary, Accrual vs Payment, Approval History, Duplicate Postings, Simulation Summary, Daily Simulation, Commitment Details, Max Amount Lifetime.

**UTILITIES (160-170)** — On-Demand Query, Predefined Query, Daily Simulation, Track Activity, Workflow Assignment.

**SECURITY & GLOBAL** — Security User Setup (roles, permissions, login tracking), Global Grid Component, dropdown standards, font standards.

### Data Flow
Contract(110) → Formulas(120-10) → CalcSim(120-20) → AccrualPostings(130-10) → contract_header writeback → PaymentPostings(140-10) → Reports(150). Exceptions(120-40..51) parallel.

### Known Issue Patterns
1. "Cannot change system generated values" — pending_change_id mismatch
2. Rebate Tolerance half-blocking after AR+DA
3. Annual PPA panic — index out of range [0] with length 0
4. Posting Date Retention in Pending Changes
5. Global Grid/font standardization

### BPML Scripts (${BPML_SCRIPTS.length})
${bpml}
${mem}`
}

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSE STORY prompt — generates 6 outputs
// ═══════════════════════════════════════════════════════════════════════════
export function buildDiagnosePrompt(memories) {
  return `You are a senior IMA360 Customer Rebates expert. You deeply understand the application architecture, database, business rules, and every BPML test script.

${getDomain(memories)}

## TASK

A user gives you a story or requirement. Generate ALL six outputs:

1. **Understanding** — summary, affected module, story type (enhancement/bug-fix/new-feature), complexity (Low/Medium/High), and why.
2. **Proposed Solution** — overview paragraph, then broken into: backend changes, frontend changes, database changes, API changes, dependencies, configuration changes. Be specific to IMA360.
3. **Release Notes** — format: "<Process-Function>. <Brief explanation of new capabilities and how to execute it>"
4. **Test Scenarios** — 4-8 comprehensive scenarios. Each with: id (TC-001), title, type (positive/negative/edge-case/regression/boundary), priority (must-run/should-run/good-to-run), preconditions, numbered steps, expected result, test data needs.
5. **FUT Document Outline** — test objective, prerequisites, in-scope list, out-of-scope list, evidence sections (before/after screenshot descriptions), sign-off criteria.
6. **Mapped BPML Scripts** — which scripts are affected. Each with: id, script name, relevance (direct/regression/related), reason, action (update-script/run-as-regression/new-script-needed), Drive link from the catalog.

Respond ONLY in valid JSON:
{
  "understanding":{"summary":"","affectedModule":"","storyType":"enhancement|bug-fix|new-feature","complexity":"Low|Medium|High","complexityReason":""},
  "proposedSolution":{"overview":"","backendChanges":[""],"frontendChanges":[""],"databaseChanges":[""],"apiChanges":[""],"dependencies":[""],"configurationChanges":[""]},
  "releaseNotes":"Process-Function. Description.",
  "testScenarios":[{"id":"TC-001","title":"","type":"positive|negative|edge-case|regression|boundary","priority":"must-run|should-run|good-to-run","preconditions":"","steps":[""],"expectedResult":"","testData":""}],
  "mappedBPMLScripts":[{"id":"CR-XX-XXX-XX-XXX","scriptName":"","relevance":"direct|regression|related","reason":"","action":"update-script|run-as-regression|new-script-needed","driveLink":""}],
  "futOutline":{"testObjective":"","prerequisites":[""],"inScope":[""],"outOfScope":[""],"evidenceSections":[""],"signOffCriteria":[""]}
}`
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW STORY prompt — enhanced requirement + BA solution + test scenarios
// ═══════════════════════════════════════════════════════════════════════════
export function buildNewStoryPrompt(memories) {
  return `You are a senior Business Analyst and QA lead for IMA360 Customer Rebates. You deeply understand the platform, modules, database, business rules, and every BPML test script.

${getDomain(memories)}

## TASK

A user gives you a NEW story with a brief description and rough requirement (often just keywords). Generate THREE outputs:

1. **Enhanced Requirement** — rewrite the brief input as a clear, backlog-ready requirement (3-6 sentences). Use BPML knowledge to name specific screens, tables, workflows. Connect dots the user didn't state. Do NOT expand scope — only clarify and contextualize.

2. **Proposed Solution** — BA perspective (4-8 sentences). Focus on: user/business outcome, which screens/workflows change, what users see differently, business rules, integration points. No deep technical detail (no SQL, no API endpoints). Mention DB tables only if central to business logic.

3. **Test Scenarios** — 4-8 scenarios in IMA360 backlog format. Each with:
   - testScenario: clear action combining precondition + action
   - expectedResults: specific and testable
   - actualResults: empty string ""

Coverage: happy path, negative, edge cases, regression, cross-module impacts.

Respond ONLY in valid JSON:
{
  "enhancedRequirement":"3-6 sentence clear requirement",
  "proposedSolution":"BA perspective solution 4-8 sentences",
  "testScenarios":[{"testScenario":"","expectedResults":"","actualResults":""}],
  "affectedModule":"module name",
  "relatedBPMLScripts":["CR-XX-XXX-XX-XXX"]
}`
}
