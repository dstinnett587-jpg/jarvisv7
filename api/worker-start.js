import { start } from "workflow/api";
import jWorker from "../workflows/j-worker.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST required" });

  const job = req.body || {};
  const allowed = new Set(["research_lead", "prepare_site", "prepare_followup", "status_check"]);
  if (!allowed.has(job.type)) {
    return res.status(400).json({ ok: false, status: "blocked", error: "This action requires approval or is not supported by the autonomous worker." });
  }

  try {
    const run = await start(jWorker, [job]);
    return res.status(202).json({ ok: true, status: "working", runId: run.runId, message: "J cloud worker started." });
  } catch (error) {
    console.error("J worker start failed", error);
    return res.status(500).json({ ok: false, status: "failed", error: "J cloud worker could not start." });
  }
}
