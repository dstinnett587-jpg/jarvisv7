export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'Missing GROQ_API_KEY' });
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'You are JARVIS. Reply exactly as requested.' },
          { role: 'user', content: 'Reply with exactly: JARVIS_ONLINE' }
        ],
        temperature: 0,
        max_tokens: 20
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ ok: false, status: response.status, error: data?.error?.message || 'Groq request failed' });
    const text = data?.choices?.[0]?.message?.content?.trim() || '';
    return res.status(200).json({ ok: text === 'JARVIS_ONLINE', reply: text, model: data.model || null });
  } catch {
    return res.status(500).json({ ok: false, error: 'Probe failed' });
  }
}
