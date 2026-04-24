import { sql } from '@vercel/postgres'

export default async function handler(req, res) {
  const { method, query, body } = req

  try {
    // ── GET /api/sessions — list all sessions ─────────────────
    if (method === 'GET' && !query.id) {
      const { rows } = await sql`
        SELECT
          s.id, s.title, s.created_at, s.updated_at,
          COUNT(m.id)::int AS message_count,
          MAX(m.created_at) AS last_message_at
        FROM chat_sessions s
        LEFT JOIN chat_messages m ON m.session_id = s.id
        GROUP BY s.id
        ORDER BY s.updated_at DESC
        LIMIT 30
      `
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
      return res.status(200).json({ messages })
    }

    // ── POST /api/sessions — create a new session ─────────────
    if (method === 'POST' && !query.id) {
      const { title = 'New conversation' } = body || {}
      const { rows } = await sql`
        INSERT INTO chat_sessions (title)
        VALUES (${title})
        RETURNING id, title, created_at
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

      // Update session title from first user message if still default
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
    return res.status(500).json({ error: e.message })
  }
}
