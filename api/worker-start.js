import { start } from "workflow/api";
import jWorker from "../workflows/j-worker.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  let job;
  if (req.method === "POST") {
    job = req.body || {};
  } else if (req.method === "GET") {
    // Safe test-only trigger: GET can start only a status_check job.
    job = { type: "status_check", target: "j-cloud-worker" };
  } else {
    return res.status(405).json({ ok: false, error: "GET or POST required" });
  }

  const allowed = new Set(["research_lead", "prepare_site", "prepare_followup", "status_check"]);
  if (!allowed.has(job.type)) {
    return res.status(400).json({ ok: false, status: "blocked", error: "This action requires approval or is not supported by the autonomous worker." });
  }

  try {
    const run = await start(jWorker, [job]);
    return res.status(202).json({ ok: true, status: "working", runId: run.runId, jobType: job.type, message: "J cloud worker started." });
  } catch (error) {
    console.error("J worker start failed", error);
    return res.status(500).json({ ok: false, status: "failed", error: "J cloud worker could not start." });
  }
}
