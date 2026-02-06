---
name: git-commit
description: Review everything changed since the last commit, then commit with a meaningful message.
---

## Steps

1. **Revision** — Show a concise summary of what changed since the last commit:
   - Run `git status` and show the output.
   - Run `git diff --stat` (and if useful, a short `git diff` excerpt) so we can see the scope of changes.

2. **Commit** — Stage all changes and create one commit with a clear, imperative message:
   - Run `git add -A`.
   - Propose a short commit message (imperative, e.g. "Add X", "Fix Y", "Update Z") based on the changes; if the user provided a message or extra instructions after the command, use or incorporate that.
   - Run `git commit -m "<message>"`.

If the user added text after the command (e.g. `/git-commit fix rate limit`), use that as the commit message or as the main guidance for the message.

Do not commit if there are no changes; say so and stop.
