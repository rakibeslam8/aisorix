# AI Sorix Admin Dashboard — Build Progress

| Week | Scope | Status |
|------|------|--------|
| 1 | Foundation: auth gating, owner seed, RBAC schema, design tokens, layout shell, routes | ✅ shipped |
| 2 | Dashboard overview KPIs + charts + user list + user profile + CSV export | ✅ shipped |
| 3 | AI monitor, Revenue dashboard, Subscription manager, Invoices, Coupons CRUD | ✅ shipped |
| 4 | Feature flags, Announcements, Prompt templates (versioned), Tickets deepening, Feedback NPS | ✅ shipped |
| 5 | System health, API keys (presence-only), full Audit timeline, Settings tabs | ✅ shipped |

## Notes
- Stack: Supabase Postgres + Edge Functions + Realtime.
- Owner `support@aisorix.com` already exists in the database. (`admin-bootstrap` is disabled and returns 410.)
- Email gating: `*@aisorix.com` + role in `user_roles`.
- Roles: `admin_super` (full), `admin_manager` (write), `admin_viewer` (read-only). Legacy `admin` treated as super.
- All writes audited via `_shared/adminAuth.ts` → `audit_logs`.
- Realtime tables: `ai_events`, `feature_flags`, `announcements`.
- Public-read RPCs (no table exposure): `get_enabled_flags()`, `get_active_announcements()`.

## Deferred (intentional)
- Real Stripe refund call — Subscriptions page stub only; needs `STRIPE_SECRET_KEY` opt-in.
- Docker / GitHub Actions / nginx / Redis — N/A on Lovable Cloud.
- In-admin dark-mode toggle — admin is a fixed polished light shell.
- AI abuse panel — pending rate-limit signal source.
