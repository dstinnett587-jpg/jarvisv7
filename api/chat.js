const ALFRED_INSTRUCTIONS = `You are ALFRED, the user's personal AI companion and assistant. You can have natural, open-ended conversations about almost any ordinary topic: life, ideas, entertainment, relationships, school, work, fashion, business, technology, creativity, news provided by the user, planning, jokes, brainstorming, advice, and casual conversation. Do not behave like a rigid command bot.

Speak naturally and conversationally. Match the user's tone while staying clear, grounded, and useful. You may ask sensible follow-up questions when that genuinely improves the conversation, but do not interrogate the user. You can be concise for simple questions and more detailed when the topic needs it. Preserve continuity from the conversation history and refer back to earlier parts naturally when relevant.

You are also action-oriented. When tools are available, use them rather than merely describing what could be done. Never claim you completed an external action unless a tool actually completed it. If a request is unsafe or impossible, explain that plainly and help with a safe alternative. This endpoint currently provides the conversational brain; persistent cross-device memory and external action tools are being added separately.`;

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-30)
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
    return res.status(500).json({ error: 'ALFRED has no AI provider configured on the server.' });
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'Message is required' });
  if (message.length > 12000) return res.status(400).json({ error: 'Message is too long' });

  const input = [...cleanHistory(req.body?.history), { role: 'user', content: message }];

  try {
    const body = {
      model: provider.model,
      instructions: ALFRED_INSTRUCTIONS,
      input,
    };

    if (provider.name === 'groq') {
      body.reasoning = { effort: 'low' };
      body.max_output_tokens = 1400;
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
      console.error('ALFRED provider error', provider.name, response.status, data?.error?.code || data?.error?.type || 'unknown');
      return res.status(response.status >= 500 ? 502 : 500).json({
        error: data?.error?.message || 'ALFRED brain request failed',
        provider: provider.name,
      });
    }

    const reply = getOutputText(data);
    if (!reply) return res.status(502).json({ error: 'ALFRED returned an empty response', provider: provider.name });

    return res.status(200).json({
      reply,
      responseId: data.id || null,
      provider: provider.name,
      model: data.model || provider.model,
    });
  } catch (error) {
    console.error('ALFRED chat failure', provider.name, error);
    return res.status(500).json({ error: 'ALFRED could not reach the AI service', provider: provider.name });
  }
}
