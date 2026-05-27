# Security incidents log

A short, append-only record of every security incident and recovery action.
The point of this file is **future you**: when something goes wrong six months
from now, you want to be able to read what happened the last time, what you
did about it, and what changed afterwards.

Don't agonise over the format. One block per incident. Markdown is fine.

---

## Template

Copy this when adding a new entry. Newest entries at the top.

```md
## YYYY-MM-DD — short title of what happened

**Severity:** Critical / High / Medium / Low
**Detected at:** YYYY-MM-DD HH:MM UTC
**Resolved at:** YYYY-MM-DD HH:MM UTC
**Affected:** which users / brands / data / cost

### What happened
One paragraph. Plain English. What broke, what triggered it.

### Detection
How did you find out? (alert, user report, log review, billing surprise…)

### Mitigation
What did you do to stop the bleeding? Rate-limit boost, key rotation,
service-role disable, snapshot restore, etc.

### Recovery
- Backup ID restored from (if any): `__________`
- Data lost (writes between snapshot and now): describe
- Keys rotated: list

### Root cause
Why did this happen? Not "what broke" — what made it possible.

### Follow-up actions
- [ ] Concrete code / config / process change to prevent recurrence
- [ ] Test added to SECURITY_TESTS.md (or `security-smoke.yml`)
- [ ] Documentation updated
```

---

## Incidents

> No incidents recorded yet — and you want it to stay that way.
