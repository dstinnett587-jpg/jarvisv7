export async function jWorker(job) {
  "use workflow";

  const accepted = await validateJob(job);
  if (!accepted.ok) return accepted;

  return await prepareJob(accepted.job);
}

async function validateJob(job) {
  "use step";
  const allowed = new Set(["research_lead", "prepare_site", "prepare_followup", "status_check"]);
  if (!job || !allowed.has(job.type)) {
    return { ok: false, status: "blocked", reason: "Action is not approved for autonomous execution." };
  }
  return { ok: true, job: { ...job, receivedAt: new Date().toISOString() } };
}

async function prepareJob(job) {
  "use step";
  // Phase 1 worker: durable queue + safety boundary. External sends, publishing,
  // charges and refunds are deliberately excluded and remain approval-only.
  return {
    ok: true,
    status: "waiting_for_approval",
    jobType: job.type,
    target: job.target || null,
    note: "J completed the autonomous preparation stage. Any external or financial action requires owner approval.",
    completedAt: new Date().toISOString()
  };
}

export default jWorker;
