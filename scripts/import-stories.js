import { sql } from '@vercel/postgres'
import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// ── Config ────────────────────────────────────────────────────
const CSV_PATH = process.argv[2] || './stories_export.csv'
const EMBED = process.argv[3] !== '--no-embed'

// ── Voyage AI embedding ───────────────────────────────────────
async function getEmbedding(text) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: text.slice(0, 4000),
      model: 'voyage-2'
    })
  })
  const data = await res.json()
  if (!data.data) throw new Error(`Voyage error: ${JSON.stringify(data)}`)
  return data.data[0].embedding
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log(`\n📂 Reading CSV from: ${CSV_PATH}`)
  const fileContent = readFileSync(CSV_PATH, 'utf-8')

  const rows = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  console.log(`📊 Found ${rows.length} stories to import\n`)

  let imported = 0
  let embedded = 0
  let errors = 0

  for (let i = 0; i < rows.length; i++) {
    const s = rows[i]

    try {
      // ── Upsert story into Vercel Postgres ──────────────────
      await sql`
        INSERT INTO stories (
          id, story_number, story_description, story_type,
          application, function, priority, category, sprint,
          customer_name, requirement, proposed_solution,
          driving_squad, driving_resource, status, workflow_stage,
          estimated_effort, actual_effort, fut_document, comments,
          release_notes, process, activity, team, submitted_by,
          created_at, updated_at, synced_at
        ) VALUES (
          ${s.id},
          ${s.story_number || null},
          ${s.story_description || null},
          ${s.story_type || null},
          ${s.application || null},
          ${s.function || null},
          ${s.priority ? parseInt(s.priority) : null},
          ${s.category || null},
          ${s.sprint || null},
          ${s.customer_name || null},
          ${s.requirement || null},
          ${s.proposed_solution || null},
          ${s.driving_squad || null},
          ${s.driving_resource || null},
          ${s.status || null},
          ${s.workflow_stage || null},
          ${s.estimated_effort ? parseInt(s.estimated_effort) : 0},
          ${s.actual_effort ? parseInt(s.actual_effort) : 0},
          ${s.fut_document || null},
          ${s.comments || null},
          ${s.release_notes || null},
          ${s.process || null},
          ${s.activity || null},
          ${s.team || null},
          ${s.submitted_by || null},
          ${s.created_at || null},
          ${s.updated_at || null},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          story_description  = EXCLUDED.story_description,
          story_type         = EXCLUDED.story_type,
          requirement        = EXCLUDED.requirement,
          proposed_solution  = EXCLUDED.proposed_solution,
          status             = EXCLUDED.status,
          workflow_stage     = EXCLUDED.workflow_stage,
          release_notes      = EXCLUDED.release_notes,
          updated_at         = EXCLUDED.updated_at,
          synced_at          = NOW()
      `
      imported++

      // ── Generate embedding ─────────────────────────────────
      if (EMBED && process.env.VOYAGE_API_KEY) {
        const text = [
          s.story_description,
          s.requirement,
          s.story_type,
          s.application
        ].filter(Boolean).join(' ')

        const embedding = await getEmbedding(text)
        const vectorStr = JSON.stringify(embedding)

        await sql`
          UPDATE stories
          SET embedding = ${vectorStr}::vector
          WHERE id = ${s.id}
        `
        embedded++

        // Stay under Voyage rate limit (10 req/sec)
        await new Promise(r => setTimeout(r, 110))
      }

      // Progress log every 10 stories
      if ((i + 1) % 10 === 0 || i === rows.length - 1) {
        console.log(`  ✓ [${i + 1}/${rows.length}] Story #${s.story_number} — ${(s.story_description || '').slice(0, 50)}...`)
      }

    } catch (e) {
      console.error(`  ✗ Story #${s.story_number}: ${e.message}`)
      errors++
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Import complete!
   Imported : ${imported}
   Embedded : ${embedded}
   Errors   : ${errors}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)
}

main().catch(console.error)
