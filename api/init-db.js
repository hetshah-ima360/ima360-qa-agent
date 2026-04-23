import { sql } from '@vercel/postgres'
export default async function handler(req, res) {
  try {
    await sql`CREATE TABLE IF NOT EXISTS memories (id SERIAL PRIMARY KEY, kind TEXT, title TEXT, content TEXT, module TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);`
    return res.status(200).json({ ok: true, message: 'Database initialized' })
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }) }
}
