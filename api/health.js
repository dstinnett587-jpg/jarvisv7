export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    service: 'jarvis',
    brainConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || 'gpt-5.6',
  });
}
