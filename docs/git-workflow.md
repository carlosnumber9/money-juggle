# Git Workflow

Read the [publication rules](development-workflow.md#publishing-changes) before
every commit or push. They remain authoritative for this repository.

## Scope And Transport

Ordinary commit and push requests use the local `git` CLI and the configured
SSH remote. Do not use `gh`, GitHub plugins/connectors, or publishing skills
unless the user explicitly requests a GitHub or pull request workflow.

Publish directly to `main`. A commit/push request does not authorize a branch,
fork, pull request, merge commit, force-push, or deployment configuration change.
Preserve unrelated work and obtain explicit scope authorization before including
pre-existing edits in the requested commit.

## Publication Sequence

1. Inspect `git status --short`, `git diff`, staged changes, branch, and remote.
   Confirm that the proposed commit contains only intended changes.
2. Be on `main`. If another branch contains work that cannot safely be moved,
   stop and explain rather than creating a new workflow.
3. Run `git fetch origin main`, then inspect
   `git rev-list --left-right --count HEAD...origin/main`.
   Fast-forward only when safe. If remote changes conflict with local edits or
   history has diverged, stop and explain; never use a merge commit or force-push
   to resolve it implicitly.
4. Run verification appropriate to the change. Review the final diff and use
   `git diff --check` before staging.
5. Stage explicit intended paths with `git add <paths>`. Review
   `git diff --cached --stat` and `git diff --cached` before committing.
6. Create the commit using the repository message convention below.
7. Re-read the publication rules, then run `git push origin main`. If the remote
   moved and the push is rejected, fetch and reassess safe synchronization.
8. Confirm the final commit, local status, and push result. Report anything left
   uncommitted or any verification that was skipped.

Do not discard edits, reset history, or stash someone else's changes as an
unannounced shortcut. Never stage ignored credentials or generated reports.

## Commit Messages

Use a lowercase type and a concise message beginning with a capitalized verb in
the simple past:

```text
<type>: <Capitalized simple-past message>
```

Examples:

- `feat: Added monthly report command`
- `fix: Preserved previous workbook on export failure`
- `docs: Updated agent guidance and implementation status`

Commit messages are persisted English prose, even when conversation is Spanish
or uses a compressed communication style.
