export default function handler(req, res) {
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

  return res.status(200).json({
    ok: true,
    service: 'jarvis',
    brainConfigured: Boolean(provider),
    provider,
    model,
  });
}
