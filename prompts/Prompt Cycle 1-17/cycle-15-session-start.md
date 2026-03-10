# Cycle 15 Session Start — Smart Alerts + Reputation + Disputes + Business Brief + Churn + Market Gaps

## Instructions

Execute both cycle prompts in order:

1. **Cycle 15-1** (`/prompts/prompt-cycle-15-1.md`) — Smart Alerts, Reputation Summarizer, Dispute Mediation
   - Smart saved search alert engine (AI relevance scoring, only notify on high-quality matches)
   - AI seller reputation summarizer (replaces raw star ratings with plain-English summaries)
   - AI dispute mediation assistant (neutral case summary for admin review)
   - Tables: `saved_search_alert_log`, columns: `profiles.reputation_summary`, `profiles.reputation_summary_updated_at`, `disputes.ai_summary`

2. **Cycle 15-2** (`/prompts/prompt-cycle-15-2.md`) — Weekly Brief, Churn Prediction, Market Gaps
   - Weekly AI business brief (Monday email to founders with executive summary)
   - Churn prediction system (heuristic scoring + AI outreach drafts)
   - Market gap alert system (unmet SOS demand analysis + recruitment targets)
   - Tables: `weekly_briefs`, `churn_risk`, `market_gap_reports`

## Rules (apply to BOTH cycles)

- **Do all the work.** Don't ask — just build. Only ask for credentials if missing.
- **Test at the end of every cycle** to make sure it works. If it fails, debug, analyze, and correct until it works properly.
- **Update CHANGELOG.md** at the end of each cycle (Keep a Changelog format, next versions: [1.8.0] for 15-1, [1.9.0] for 15-2).
- **Git:** commit, push, and deploy after each cycle.
- **Commit messages** include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- **Deploy via Vercel REST API** (not CLI — git author mismatch issue).
- **All DB operations** use server actions with `createAdminClient()`. No client-side Supabase DB/storage calls.
- **SQL migrations** use Supabase Management API: `POST https://api.supabase.com/v1/projects/fkcyfpdkcrhjieauhchn/database/query` with Bearer token.
- **AI model:** Claude Sonnet 4 via `@anthropic-ai/sdk` (client at `src/lib/anthropic.ts`).
- **Styling:** Dark-only theme, Tailwind CSS v4, shadcn/ui components. Use `font-display` for headings, `font-body` for text.

## Credentials

### Supabase
- Project ID: `fkcyfpdkcrhjieauhchn`
- URL: `https://fkcyfpdkcrhjieauhchn.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrY3lmcGRrY3JoamllYXVoY2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNzM4NTIsImV4cCI6MjA4NzY0OTg1Mn0.xLxJRmjFdLc7X2OxhFC_yrJwkjkMRthFSyb-lNMBpCk`
- Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrY3lmcGRrY3JoamllYXVoY2huIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA3Mzg1MiwiZXhwIjoyMDg3NjQ5ODUyfQ.48KaLp83ipnJm-MuG5ibz8ZcdWyFd_0ofCLG1nKNYGo`
- Management API Token: `sbp_fc72587230e6069a1f1c36e914f6e9568849b650`
- DB Password: `Mn4c0c4DrRzUU2Uh`
- Note: Direct DB host DNS fails — use Management API for migrations

### Anthropic
- API Key (Mark's Individual Org): `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`
- DO NOT use the other key (`sk-ant-api03-RJ6R8Mzz...`) — different workspace, no credits

### Vercel
- Token: `vcp_5y6QwAutlbyNRILVuzFRaGqL1Jc3USo2cy6H8BH6ySFfnwTb4T1wnWZU`
- Team ID: `team_9n9GosoaraicsoDdbAFgzr5j`
- Project ID: `prj_HQBv7jMhui6LGW5vzVC5pmCMndlx`
- Deploy command:
```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
  -H "Authorization: Bearer vcp_5y6QwAutlbyNRILVuzFRaGqL1Jc3USo2cy6H8BH6ySFfnwTb4T1wnWZU" \
  -H "Content-Type: application/json" \
  -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
```

### Stripe
- Secret Key: `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`
- Webhook Secret: `whsec_nJxLNkGmmsMaEMRcWQ7gRjTixI5g0T5z`

### GitHub
- PAT: `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`

### Resend
- API Key: `re_WmGMkC6N_AchyaFkJPAKLLrP8TqsdCu1J`

### Sentry
- DSN: `https://f25f68c51ce49e6a37e0a4f554c3a96b@o4509144948015104.ingest.us.sentry.io/4509144953782272`

### Production
- URL: https://metal-gear-five.vercel.app
- Superadmin: mark@p5400.com (id: ffc5a0f9-2f38-4e97-811b-f762c6bbe14e)

## How to Start

Paste this to Claude in a new session:

```
Read and execute /prompts/cycle-15-session-start.md — start with Cycle 15-1 (/prompts/prompt-cycle-15-1.md), then continue to Cycle 15-2 (/prompts/prompt-cycle-15-2.md). Follow all rules and use the provided credentials. Test, update changelog, commit, push, and deploy after each cycle.
```
