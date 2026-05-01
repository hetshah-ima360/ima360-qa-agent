import { sql } from '@vercel/postgres'

// Adds support for `kind` on chat_sessions so Diagnose Story can use this same
// storage without polluting Agent Chat's session list.
//
//   GET    /api/sessions?kind=diagnose            → list diagnoses
//   GET    /api/sessions                          → list chat sessions (kind != 'diagnose')
//   GET    /api/sessions?id=xxx                   → load messages for a session
//   POST   /api/sessions  body:{ title, kind }    → create a session
//   POST   /api/sessions?id=xxx body:{role,content} → append a message
//   DELETE /api/sessions?id=xxx                   → delete session + cascade messages
//   PATCH  /api/sessions?id=xxx body:{ title }    → rename a session

export default async function handler(req, res) {
  const { method, query, body } = req

  try {
    // ── GET /api/sessions — list all sessions (filtered by kind) ─────
    if (method === 'GET' && !query.id) {
      const kind = query.kind || null

      // If kind is provided, filter strictly. Otherwise default to chat-like sessions
      // (so Agent Chat keeps working unchanged — it doesn't know about diagnoses).
      let rows
      if (kind === 'diagnose') {
        const result = await sql`
          SELECT
            s.id, s.title, s.kind, s.created_at, s.updated_at,
            COUNT(m.id)::int AS message_count,
            MAX(m.created_at) AS last_message_at
          FROM chat_sessions s
          LEFT JOIN chat_messages m ON m.session_id = s.id
          WHERE s.kind = 'diagnose'
          GROUP BY s.id
          ORDER BY s.updated_at DESC
          LIMIT 50
        `
        rows = result.rows
      } else {
        const result = await sql`
          SELECT
            s.id, s.title, s.kind, s.created_at, s.updated_at,
            COUNT(m.id)::int AS message_count,
            MAX(m.created_at) AS last_message_at
          FROM chat_sessions s
          LEFT JOIN chat_messages m ON m.session_id = s.id
          WHERE s.kind IS NULL OR s.kind = 'chat'
          GROUP BY s.id
          ORDER BY s.updated_at DESC
          LIMIT 30
        `
        rows = result.rows
      }
      return res.status(200).json({ sessions: rows })
    }

    // ── GET /api/sessions?id=xxx — load messages for a session ─
    if (method === 'GET' && query.id) {
      const { rows: messages } = await sql`
        SELECT id, role, content, created_at
        FROM chat_messages
        WHERE session_id = ${query.id}
        ORDER BY created_at ASC
      `
      // Also return the session metadata so callers know the kind
      const { rows: sessionRows } = await sql`
        SELECT id, title, kind, created_at, updated_at
        FROM chat_sessions
        WHERE id = ${query.id}
      `
      return res.status(200).json({
        messages,
        session: sessionRows[0] || null,
      })
    }

    // ── POST /api/sessions — create a new session ─────────────
    if (method === 'POST' && !query.id) {
      const { title = 'New conversation', kind = 'chat' } = body || {}
      const { rows } = await sql`
        INSERT INTO chat_sessions (title, kind)
        VALUES (${title}, ${kind})
        RETURNING id, title, kind, created_at
      `
      return res.status(200).json({ session: rows[0] })
    }

    // ── POST /api/sessions?id=xxx — append a message ──────────
    if (method === 'POST' && query.id) {
      const { role, content } = body || {}
      if (!role || !content) return res.status(400).json({ error: 'role and content required' })

      await sql`
        INSERT INTO chat_messages (session_id, role, content)
        VALUES (${query.id}, ${role}, ${content})
      `

      // Update session title from first user message if still default (chat behavior preserved)
      if (role === 'user') {
        await sql`
          UPDATE chat_sessions
          SET
            updated_at = NOW(),
            title = CASE
              WHEN title = 'New conversation'
              THEN ${content.slice(0, 80)}
              ELSE title
            END
          WHERE id = ${query.id}
        `
      } else {
        // Just bump updated_at for non-user messages
        await sql`UPDATE chat_sessions SET updated_at = NOW() WHERE id = ${query.id}`
      }

      return res.status(200).json({ ok: true })
    }

    // ── DELETE /api/sessions?id=xxx — delete a session ────────
    if (method === 'DELETE' && query.id) {
      await sql`DELETE FROM chat_sessions WHERE id = ${query.id}`
      return res.status(200).json({ ok: true })
    }

    // ── PATCH /api/sessions?id=xxx — rename a session ─────────
    if (method === 'PATCH' && query.id) {
      const { title } = body || {}
      if (!title) return res.status(400).json({ error: 'title required' })
      await sql`UPDATE chat_sessions SET title = ${title} WHERE id = ${query.id}`
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('sessions error:', e)
    if (e.message?.includes('does not exist')) {
      return res.status(500).json({ error: 'DB not initialized. Visit /api/init-db first.' })
    }
    if (e.message?.includes('column') && e.message?.includes('kind')) {
      return res.status(500).json({
        error: 'chat_sessions.kind column missing. Run: ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT \'chat\';',
      })
    }
    return res.status(500).json({ error: e.message })
  }
}
