export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const provider = process.env.GROQ_API_KEY
    ? 'groq'
    : process.env.OPENAI_API_KEY
      ? 'openai'
      : null;

  const model = provider === 'groq'
    ? (process.env.GROQ_MODEL || 'openai/gpt-oss-20b')
    : provider === 'openai'
      ? (process.env.OPENAI_MODEL || 'gpt-5.6')
      : null;

  if (provider !== 'groq') {
    return res.status(200).json({ ok: true, service: 'jarvis', brainConfigured: Boolean(provider), provider, model, aiTest: null });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: 'Reply with exactly: JARVIS_ONLINE',
        reasoning: { effort: 'low' },
        max_output_tokens: 256
      })
    });
    const data = await response.json();
    const text = typeof data.output_text === 'string'
      ? data.output_text.trim()
      : (data.output || []).flatMap(i => i.content || []).filter(c => c.type === 'output_text').map(c => c.text).join('').trim();
    return res.status(200).json({
      ok: response.ok && text === 'JARVIS_ONLINE',
      service: 'jarvis',
      brainConfigured: true,
      provider,
      model,
      aiTest: { status: response.status, reply: text || null }
    });
  } catch {
    return res.status(200).json({ ok: false, service: 'jarvis', brainConfigured: true, provider, model, aiTest: { status: null, reply: null } });
  }
}
