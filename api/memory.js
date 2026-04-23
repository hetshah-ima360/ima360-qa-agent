import { sql } from '@vercel/postgres'
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT id, kind, title, content, module, created_at FROM memories ORDER BY created_at DESC LIMIT 100;`
      return res.status(200).json({ memories: rows })
    }
    if (req.method === 'POST') {
      const m = req.body || {}
      if (!m.title) return res.status(400).json({ error: 'title required' })
      const { rows } = await sql`INSERT INTO memories (kind, title, content, module) VALUES (${m.kind||'chat'}, ${m.title}, ${m.content||''}, ${m.module||''}) RETURNING id, created_at;`
      return res.status(200).json({ ok: true, id: rows[0].id })
    }
    if (req.method === 'DELETE') {
      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'id required' })
      await sql`DELETE FROM memories WHERE id = ${Number(id)};`
      return res.status(200).json({ ok: true })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    if (e.message?.includes('does not exist')) return res.status(500).json({ error: 'DB not initialized. Visit /api/init-db first.' })
    return res.status(500).json({ error: e.message })
  }
}
