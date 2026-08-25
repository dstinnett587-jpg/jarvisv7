const ALLOWED = new Set(["research_lead", "prepare_site", "prepare_followup", "status_check"]);

function normalizeJob(input) {
  if (!input || typeof input !== "object") return null;
  const type = typeof input.type === "string" ? input.type.trim() : "";
  if (!ALLOWED.has(type)) return null;
  return {
    type,
    target: typeof input.target === "string" ? input.target.slice(0, 500) : null,
    payload: input.payload && typeof input.payload === "object" ? input.payload : null,
    receivedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "POST required" });
  }

  const job = normalizeJob(req.body);
  if (!job) {
    return res.status(400).json({
      ok: false,
      status: "blocked",
      error: "This action requires approval or is not supported by the autonomous worker.",
    });
  }

  // Phase 1 worker: prepare/queue safely inside the serverless request path.
  // External sends, publishing, charges, refunds, and other consequential actions
  // remain deliberately excluded and require explicit owner approval.
  return res.status(202).json({
    ok: true,
    status: "waiting_for_approval",
    jobType: job.type,
    target: job.target,
    receivedAt: job.receivedAt,
    message: "J completed the autonomous preparation stage. Any external or financial action still requires owner approval.",
  });
}
