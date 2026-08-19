export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'Missing OPENAI_API_KEY' });

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.6',
        input: 'Reply with exactly: JARVIS_ONLINE',
        max_output_tokens: 20,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(502).json({ ok: false, status: response.status, error: data?.error?.message || 'OpenAI request failed' });
    }

    const text = typeof data.output_text === 'string'
      ? data.output_text.trim()
      : (data.output || []).flatMap(i => i.content || []).filter(c => c.type === 'output_text').map(c => c.text).join('').trim();

    return res.status(200).json({ ok: text === 'JARVIS_ONLINE', reply: text, model: data.model || process.env.OPENAI_MODEL || 'gpt-5.6' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Probe failed' });
  }
}
