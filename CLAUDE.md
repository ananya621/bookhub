@AGENTS.md

# Git workflow — branch first, merge when ready

`deploy.yml` runs a production deploy on **every push to `main`**, and
those deployment runs are budget-limited. So:

- **Never commit or push directly to `main`.** All work, however small,
  happens on a branch (e.g. `git checkout -b fix-nav-color`).
- Don't push a branch's small in-progress commits to `main` one at a time.
  Do the work, iterate, fix mistakes — all on the branch. `main` only
  moves when the work is actually ready.
- When it's ready: merge the branch into `main` locally, then push `main`
  once. That single push is what should trigger the deploy — not each
  commit along the way.
- Opening a pull request instead of merging locally is fine too (it also
  gets you a preview URL via `preview.yml`) — just know that pushing
  updates to an open PR triggers a preview build each time, so it's not
  free either, just cheaper than a production deploy.

This applies to every session working on this repo, not just one
particular workflow style.
