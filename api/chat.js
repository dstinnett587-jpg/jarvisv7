const JARVIS_INSTRUCTIONS = `You are JARVIS, a capable personal AI assistant. Be concise, useful, and action-oriented. Preserve conversational context provided by the client. Never claim you completed an external action unless a tool actually completed it. For now, this endpoint provides the core conversational brain only; memory and action tools are added separately.`;

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-12)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }));
}

function getOutputText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts = [];
  for (const item of data?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

function getProvider() {
  if (process.env.GROQ_API_KEY) {
    return {
      name: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-5.6',
    };
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const provider = getProvider();
  if (!provider) {
    return res.status(500).json({ error: 'JARVIS has no AI provider configured on the server.' });
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'Message is required' });
  if (message.length > 12000) return res.status(400).json({ error: 'Message is too long' });

  const input = [...cleanHistory(req.body?.history), { role: 'user', content: message }];

  try {
    const body = {
      model: provider.model,
      instructions: JARVIS_INSTRUCTIONS,
      input,
    };

    if (provider.name === 'groq') {
      body.reasoning = { effort: 'low' };
      body.max_output_tokens = 1024;
    }

    const response = await fetch(`${provider.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('JARVIS provider error', provider.name, response.status, data?.error?.code || data?.error?.type || 'unknown');
      return res.status(response.status >= 500 ? 502 : 500).json({
        error: data?.error?.message || 'JARVIS brain request failed',
        provider: provider.name,
      });
    }

    const reply = getOutputText(data);
    if (!reply) return res.status(502).json({ error: 'JARVIS returned an empty response', provider: provider.name });

    return res.status(200).json({
      reply,
      responseId: data.id || null,
      provider: provider.name,
      model: data.model || provider.model,
    });
  } catch (error) {
    console.error('JARVIS chat failure', provider.name, error);
    return res.status(500).json({ error: 'JARVIS could not reach the AI service', provider: provider.name });
  }
}
