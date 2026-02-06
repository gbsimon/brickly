# Ticket process

## Overview

Process a ticket by number (e.g. `/ticket-process 035`), then reorder/renumber, implement, document, and update versioning.

## Steps

1. **Locate ticket** — Find the ticket details in `docs/PROJECT_SCOPE.md` (use the provided number). If not found, check `AGENTS.md` and ask for clarification.

2. **Reorder + Renumber** — If the requested ticket is not the next pending ticket, move it up so tickets are handled in order. Then renumber **all** tickets sequentially (001..N) to match the new order. Update both `AGENTS.md` (status table + backlog) and `docs/PROJECT_SCOPE.md`.

3. **Understand scope** — Summarize goal/scope/acceptance in 2-5 lines and identify files likely to change.

4. **Implement** — Make the required code changes to satisfy acceptance criteria. Follow project conventions.

5. **Version sync** — Update the app version in `package.json` to match the latest **completed** ticket number after renumbering. Format: `0.1.<ticketNumber>` (e.g. Ticket 038 → version `0.1.38`).

6. **README update** — If the feature impacts public-facing behavior, update `README.md` to reflect the change.

7. **Report** — Summarize what changed and list edited files. If tests were run, note them; if not, say so.

If the user adds text after the command (e.g. `/ticket-process 035 add a refresh toggle`), treat it as additional requirements.
