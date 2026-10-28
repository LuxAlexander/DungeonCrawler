# DungeonCrawler project records

Use these records to carry ideas, decisions, and implementation progress across sessions. Design intent is separate from current gameplay.

| Document | Purpose |
| --- | --- |
| [Decisions](decisions.md) | Agreed goals and constraints, including what has not been implemented |
| [Ideas](ideas.md) | Candidate features, unanswered questions, and suggested next work |
| [Implementation log](implementation-log.md) | What actually changed, how it was checked, and remaining limitations |
| [Maintenance memory](../AGENTS.md) | Architecture, working practices, and known technical pitfalls |

## Updating these records

1. Add a new proposal to `ideas.md`; give it a stable ID and mark it Proposed.
2. When the owner agrees, record the decision and rationale in `decisions.md`, linking the idea where relevant. Agreement on a direction does not settle every implementation detail.
3. When work is actually completed, add an implementation entry with its date, affected files, verification, and limitations. Link the decision or idea it implements.
4. Update idea status to reflect actual progress. If a decision changes, mark it Superseded and link its replacement instead of silently erasing the rationale.

Use Proposed, Agreed direction, In progress, Implemented, Deferred, or Rejected as appropriate. Only call something Implemented once it exists in code and has been checked. Record whether changes are uncommitted, committed, merged, or deployed separately from implementation status; do not invent commit references or deployment results.

**Commit rule:** leave changes uncommitted unless the owner explicitly requests a commit. Agreeing to an idea or approving an implementation is not commit authorization.
