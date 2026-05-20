# Acquisition Autopilot Diagnosis — Plain English

The platform already has the bones of an owner-side acquisition machine. It can source creator leads, score them, write VaultX outreach, queue the next action, track proof, and count runs. The problem is that its current live-send gate is all-or-nothing: unless several server approval environment variables are present, every outbound action is treated as a blocked dry run and becomes a manual-send handoff.

That behavior is safe, but it is not the owner experience the platform needs. The owner should not have to manually approve every normal outreach action. The better model is **standing approval with guardrails**: the owner approves the strategy once, and the system can run inside those rules without interrupting the owner unless risk, unclear data, or a high-value close decision appears.

Current blocker in normal words: the platform can prepare outreach, but it does not yet have a stored owner-approved autopilot policy that says, “these channels, stages, scores, and daily limits are allowed to send automatically.” Because of that, it falls back to manual handoff even for safe queued actions.

The upgrade should add a durable autopilot policy to the acquisition config. The platform should still block unsafe leads, risky content, unsupported channels, missing delivery credentials, or actions above the approved daily limit. But safe actions should be allowed to execute automatically when the owner-approved policy is enabled.

The owner-facing command center should also stop using confusing language. It should explain whether the platform is in autopilot, guarded setup, or proof-only mode; what it did; what it can do next; and what actually moves toward revenue.
