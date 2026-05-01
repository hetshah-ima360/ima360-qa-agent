export async function streamChat({ model, max_tokens, system, messages, onDelta }) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, max_tokens, system, messages }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`)
  }

  const chunks = Array.isArray(data.content) ? data.content : []
  let accumulated = ''

  for (const chunk of chunks) {
    const delta = chunk?.text || ''
    accumulated += delta
    if (typeof onDelta === 'function') {
      onDelta(delta, accumulated)
    }
  }

  return accumulated
}

export function extractJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('No text available to extract JSON from')
  }

  const cleaned = text.trim()
  if (!cleaned.includes('{') || !cleaned.includes('}')) {
    throw new Error('No JSON object found in response text')
  }

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  const candidate = cleaned.slice(start, end + 1)

  try {
    return JSON.parse(candidate)
  } catch (err) {
    throw new Error(`Failed to parse JSON from response: ${err.message}`)
  }
}
