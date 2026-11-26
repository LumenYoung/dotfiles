---
name: intercom-wakeup
description: Wake the owning Pi session after a delay or at regular intervals using a detached Intercom reminder. Use when asked to check back later, monitor a long job without blocking, or ensure a session wakes again.
---

# Wake the owner with Intercom

Use this Pi-only skill when the **agent** needs to take another turn later. If the job's collector already sends the required wakeups to the owner, use that instead. A polling process that only writes a log does not wake Pi.

## Arm before yielding

Run `scripts/wake.sh STATE_DIR SECONDS MESSAGE [--repeat]` from the task's working directory. Resolve the script relative to this skill. Choose a **new**, task-local state directory under an existing parent; reuse that same name when checking whether the task already has a timer. The script refuses to overwrite it. By default it sends once.

```bash
wake="$HOME/.pi/agent/skills/intercom-wakeup/scripts/wake.sh"
state="$PWD/run-42/owner-wakeup"
"$wake" "$state" 1200 'Run 42: inspect run-42/status.json. If complete, verify the manifest before releasing the worker. No routine upstream ping.' --repeat
```

The recipient is `PI_INTERCOM_SESSION_ID`, not the supervisor, the process PID, or `PI_SESSION_ID`. If it is unset, confirm the current owner's Intercom ID via `intercom({action:"status"})` or the live roster and set it for the command. Do not guess. Do not put secrets in reminder text.

A successful arm prints the worker PID, the next attempt time (UTC), and the log path after checking that the worker is alive. You can now yield. The detached process sleeps locally; it does not occupy an agent turn. When the reminder arrives, **inspect the task and act under its original instructions**. A reminder is not evidence of progress or permission to rerun anything.

## Close and verify

Write `touch "$state/closed"` on completion or cancellation. It suppresses future sends and retries; it cannot recall a send already in flight. Keep the directory as a receipt. Check `timer.log` and `next-utc` for delivery and timing. Do not kill a process solely by a PID found in an old receipt.

**Armed** means the worker started. **Delivered** means the Intercom CLI reported success. Only an owner-side check establishes that the work was inspected. A live workstation, reachable local broker, and reachable owner are required for timely handling. A missed interval produces one reminder, not a backlog. After three failed delivery attempts the worker stops and logs the failure. This is not a persistent scheduler and does not survive reboot.
