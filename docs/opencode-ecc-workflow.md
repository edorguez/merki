# OpenCode + ECC — Merki Workflow

> Operating guide for working in this repo with OpenCode + ECC (project-local in
> `.opencode/`). Read it before your first session. The repo's routing table is
> still `AGENTS.md`; this only explains the flow.

## 0. Setup (one-time)

1. Open OpenCode **at the repo root**:

   ```bash
   cd /Users/pc/Projects/merki
   opencode
   ```

   Config is picked up from `.opencode/` automatically (agents, commands, skills,
   hooks). Nothing global needs to be configured for this project.

2. **Model.** The global config (`~/.config/opencode/opencode.jsonc`) sets
   `anthropic/claude-sonnet-4-5`. If you don't have Anthropic credentials, use
   DeepSeek (which is authenticated):

   - per session: `opencode -m deepseek/deepseek-flash`
   - or switch the model inside the TUI with the model selector (`/models`).

3. **Two modes** (**Tab** to toggle):
   - **Plan** — read-only; cannot edit or delete files. Use it to clarify and
     plan.
   - **Build** — edits files. `build` is the default primary agent
     (`default_agent: build`).

## 1. Flow: from idea to change

### Phase 1 — Idea and plan (Plan mode)

1. Tab → **Plan**.
2. Describe the idea in natural language. ECC loads `AGENTS.md` as the routing
   table automatically.
3. To force the planned flow:

   ```text
   /plan "describe the feature"
   ```

   It runs in the `planner` subagent (clean context, no edit permissions) and
   **waits for your confirmation** before writing any code.

4. Support as needed:
   - Unfamiliar part of the repo → invoke the `codebase-onboarding` skill.
   - Context getting full or slow → `context-budget` / `strategic-compact` skills.
   - Large or ambiguous feature → `intent-driven-development`, `product-lens`
     skills.
5. Review the plan and approve it ("yes" / "proceed").

### Phase 2 — Implementation (Build mode)

1. Tab → **Build**.
2. For quality features:

   ```text
   /feature-dev        # full feature flow
   /tdd                # test-first (tdd-guide subagent)
   ```

3. **Routing by stack** (follow these rules):
   | Area | Skills to use | Repo rules |
   | --- | --- | --- |
   | Go backend (`cmd/`, `internal/`, `pkg/`) | `golang-pro`, `golang-patterns`, `golang-testing` | handler → service → repository; GORM only in `repository/` |
   | Mobile (`mobile/`) | `vercel-react-native-skills`, `react-native-patterns` | offline-first: SQLite + Zustand + `SyncOperation`; tokens from `mobile/styles/` |
   | Web (`web/`) | `vercel-react-best-practices`, `react-patterns`, `react-performance` | React 19 + Vite; see `DESIGN.md` |
   | DB (`pkg/database/`) | `postgres-patterns`, `database-migrations` | single migration `001_create_tables.{up,down}.sql` |

4. While it edits, ECC hooks act: `console.log` warnings, formatting,
   TypeScript checks, security reminders, and a completion notification.

### Phase 3 — Verification

| Need | Command |
| --- | --- |
| General verification | `/verify` |
| Test coverage | `/test-coverage` |
| Go (TDD / review / build) | `/go-test`, `/go-review`, `/build-fix` |
| Mobile (Expo/RN) | `/rn-review` |
| Web (React) | `/react-build`, `/react-review`, `/react-test` |
| E2E | `/e2e` |
| Security (payments/money) | `/security`, `/security-scan` |
| Fresh-context review | `/code-review` |

### Phase 4 — Close out and PR

```text
/review-pr          # prepare/inspect the PR
/pr                 # create the PR
/checkpoint         # save verification state
/save-session       # session summary (manual durable memory)
/learn              # extract lessons/patterns
/update-docs        # /update-codemaps if structure changed
```

## 2. Cheat sheet

### Most-used commands
| Category | Commands |
| --- | --- |
| Plan | `/plan`, `/feature-dev`, `/plan-prd` |
| Implement | `/tdd`, `/go-test`, `/go-review`, `/rn-review`, `/react-*`, `/build-fix` |
| Verify | `/verify`, `/test-coverage`, `/e2e`, `/security`, `/security-scan`, `/quality-gate` |
| Maintain | `/refactor-clean`, `/prune`, `/update-docs`, `/update-codemaps`, `/skill-create` |
| Meta/ECC | `/harness-audit`, `/project-init`, `/context-budget`, `/ecc-guide`, `/checkpoint`, `/save-session`, `/learn` |

### Agents (subagents)
`build` (primary) · `planner` · `architect` · `code-reviewer` ·
`security-reviewer` · `tdd-guide` · `build-error-resolver` · `e2e-runner` ·
`doc-updater` · `refactor-cleaner` · `go-reviewer` · `go-build-resolver` ·
`database-reviewer` · `docs-lookup` · `harness-optimizer` · `loop-operator` ·
`react-native-reviewer`.

Commands with `subtask: true` (e.g. `/plan`, `/code-review`, `/security`,
`/tdd`, `/rn-review`) run in a **subagent** with separate context, so your main
context stays clean.

### Skills (by area)
- Go: `golang-pro`, `golang-patterns`, `golang-testing`
- Mobile: `vercel-react-native-skills`, `react-native-patterns`
- Web: `vercel-react-best-practices`, `react-patterns`, `react-performance`, `react-testing`, `accessibility`
- DB: `postgres-patterns`, `database-migrations`
- Quality: `tdd-workflow`, `verification-loop`, `e2e-testing`, `error-handling`, `ai-regression-testing`
- Product/docs: `codebase-onboarding`, `code-tour`, `architecture-decision-records`, `living-docs-governance`
- Utilities: `context-budget`, `strategic-compact`, `production-audit`, `git-workflow`, `caveman` (terse mode, opt-in)

## 3. Golden rules

1. **Plan first, always**: Tab → Plan, approve the blueprint, then Tab → Build.
2. **Offline-first on mobile**: do not add paths that require the network for
   core cart/product operations (SQLite + Zustand + `SyncOperation`).
3. **Money in integer cents**: never floats; dual currency (Bs + USD) via the
   BCV rate.
4. **`isPremium` / `isAnonymous` server-side only**: never trust client flags.
5. **Auth is delegated to the auth server**; the backend does not validate
   credentials.
6. **No `console.log`** in delivered code (hooks warn about it).
7. **No automatic memory**: ECC on OpenCode does not save your chats. To persist
   decisions, use `/save-session` or write them into `AGENTS.md` / `docs/adr/`.

## 4. Concrete example

**Idea:** "filter cart history by supermarket".

1. Tab → **Plan** → `/plan "filter cart history by supermarket"`.
2. Review the `planner` blueprint and approve.
3. Tab → **Build** → `/tdd` for the store/`mobile/lib/local/repositories`,
   following offline-first and the `mobile/styles/` tokens.
4. `/rn-review` + `/verify`; if the build breaks, `/build-fix`.
5. `/code-review` → `/review-pr` → `/checkpoint` → `/save-session`.

## 5. ECC maintenance

`.opencode/` is **local and git-ignored** (not versioned). To reinstall/update in
another project (verified: no need to clone ECC):

```bash
# Install/update ECC project-local for OpenCode
OPENCODE_CONFIG_DIR="$PWD/.opencode" \
npx --yes ecc-universal@2.2.1 install --target opencode \
  --profile opencode --modules hooks-runtime --enable-hooks
```

Post-install fixes ECC does not apply on its own (re-apply if you run
`ecc repair`):

1. `commands/harness-audit.md`: `node scripts/harness-audit.js` →
   `node .opencode/scripts/harness-audit.js`.
2. Create `.opencode/scripts/package.json` with `{"type":"commonjs"}` (ECC leaves
   `"type":"module"` and breaks the CJS scripts).
3. Delete `.opencode/plugins/index.ts` and remove `"plugin": ["./plugins"]` from
   `.opencode/opencode.json` (avoids double hook registration).

To audit the repo:

```bash
node .opencode/scripts/harness-audit.js repo --format text
```

Notes:
- Your own/shared skills live in `.agents/skills/` (versioned); ECC's live in
  `.opencode/skills/` (ignored). OpenCode discovers **both**.
- The `/rn-review` command and the `react-native-reviewer` agent are specific to
  this repo (not managed by ECC).
