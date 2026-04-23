export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it in Vercel Project Settings → Environment Variables.' })
  try {
    const { model, max_tokens, system, messages } = req.body || {}
    if (!messages) return res.status(400).json({ error: 'messages required' })
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: model || 'claude-sonnet-4-20250514', max_tokens: max_tokens || 4000, system, messages }),
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'API error', details: data })
    return res.status(200).json(data)
  } catch (e) { return res.status(500).json({ error: e.message }) }
}
