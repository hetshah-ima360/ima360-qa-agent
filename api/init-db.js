import { sql } from '@vercel/postgres'

export default async function handler(req, res) {
  try {
    // Existing memories table
    await sql`
      CREATE TABLE IF NOT EXISTS memories (
        id SERIAL PRIMARY KEY,
        kind TEXT,
        title TEXT,
        content TEXT,
        module TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );`

    // Chat sessions — one row per conversation
    await sql`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );`

    // Chat messages — persisted history per session
    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );`

    await sql`CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages(session_id);`
    await sql`CREATE INDEX IF NOT EXISTS chat_sessions_updated_idx ON chat_sessions(updated_at DESC);`

    return res.status(200).json({ ok: true, message: 'Database initialized — memories, chat_sessions, chat_messages tables ready' })
  } catch (e) {
    console.error('init-db error:', e)
    return res.status(500).json({ ok: false, error: e.message })
  }
}
