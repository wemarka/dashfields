# Dashfields — Project TODO

## ✅ Phase 1 — Design System & Core UI
- [x] Apple Vision Pro Glassmorphism CSS (glass cards, blur, silver borders)
- [x] Tailwind config with custom tokens (radius 24px, silver palette, animations)
- [x] Inter font integration
- [x] Micro-animations (fade-in, slide-up, blur-in, cubic-bezier transitions)
- [x] Collapsible sidebar with glassmorphism
- [x] App background (light gradient)
- [x] App shell with route-based navigation

## ✅ Phase 2 — Full Functionality
- [x] Campaign creation wizard (multi-step modal)
- [x] Post composer modal with media + scheduling
- [x] Wire Campaigns page to real tRPC data
- [x] Wire Publishing page to real tRPC data
- [x] AI Tools connected to real LLM router
- [x] Toast feedback on mutations (Sonner)
- [x] Empty states with CTA buttons

## ✅ Phase 3 — Meta Ads Real Integration
- [x] Meta Graph API helper (server/meta.ts)
- [x] tRPC meta router with 7 procedures
- [x] MetaConnect page (3-step connection flow)
- [x] Dashboard with real Meta KPIs + date preset selector
- [x] Campaigns page with Meta/Local tabs + real data
- [x] Analytics page with real Meta insights + 4 charts
- [x] Meta Ads link in sidebar navigation

## ✅ Phase 4 — Supabase Backend (Complete)
- [x] Supabase project created (dashfields - safmbvahqqwwemaqjvut)
- [x] 8 tables created via MCP (users, social_accounts, campaigns, campaign_metrics, posts, user_settings, notifications, alert_rules)
- [x] @supabase/supabase-js installed
- [x] server/supabase.ts — Supabase REST client helper
- [x] SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY secrets added

## ✅ Phase 5 — Server Refactor (Split Files)
- [x] server/db/ directory with separate helpers (users, campaigns, posts, social, settings)
- [x] server/db.ts barrel file (backward compat with _core)
- [x] server/routers/ directory: campaigns, posts, social, settings, notifications, alerts, ai, meta
- [x] server/routers.ts updated to import from split files

## ✅ Phase 6 — Campaign Detail Drawer
- [x] CampaignDetailDrawer component with daily chart
- [x] Campaign KPI summary (CTR, CPC, CPM, Reach)
- [x] Wire to trpc.meta.campaignDailyInsights
- [x] Open drawer on row click in Campaigns page

## ✅ Phase 7 — Performance Alerts
- [x] alert_rules table in Supabase
- [x] server/routers/alerts.ts — create/list/delete/checkAndNotify
- [x] Alerts page UI (list rules + create form) — fixed: removed name field
- [x] notifyOwner integration when threshold breached

## ✅ Phase 8 — Analytics Period Comparison
- [x] "Compare to previous period" in Analytics
- [x] Fetch two date ranges in parallel (current + previous)
- [x] Delta % badges on KPI cards
- [x] trpc.meta.compareInsights procedure

## ✅ Phase 9 — Frontend Component Refactor
- [x] client/src/components/dashboard/: KpiCard, SpendChart, PerformanceStats, ActiveCampaignsTable, DatePresetSelector
- [x] client/src/components/campaigns/: CampaignFilters, MetaCampaignTable, LocalCampaignTable
- [x] Home.tsx refactored to use dashboard components
- [x] Campaigns.tsx refactored to use campaign components

## ✅ Phase 10 — Testing & Final Polish
- [x] Fix Alerts page: remove name field from form (not in router schema)
- [x] NotificationBell component in header with unread badge + dropdown panel
- [x] server/alerts.test.ts — 7 tests for alert rule evaluation logic
- [x] server/meta.test.ts — 7 tests for date helpers and insights parsing
- [x] 23/23 tests passing across 5 test files
- [x] 0 TypeScript errors
- [x] Checkpoint and deliver

## ✅ Phase 11 — Supabase Realtime Notifications
- [x] Add Supabase Realtime channel subscription in NotificationBell
- [x] Replace polling (30s interval) with live push updates
- [x] Show toast when new notification arrives in real-time
- [x] Add unread count animation on badge update
- [x] client/src/lib/supabase.ts — frontend Supabase client
- [x] client/src/hooks/useRealtimeNotifications.ts — Realtime hook
- [x] VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set via MCP auto-extraction

## ✅ Phase 12 — Analytics Component Refactor
- [x] Create client/src/components/analytics/ directory
- [x] AnalyticsKpiCards component (8 KPI cards with period comparison)
- [x] SpendByCampaignChart component (bar chart)
- [x] CtrCpcChart component (CTR bar + spend pie side by side)
- [x] ImpressionsClicksChart component (grouped bar chart)
- [x] Analytics.tsx refactored to use analytics components

## ✅ Phase 13 — Automated Alert Scheduler
- [x] server/routers/scheduler.ts — runAlertCheck + getLastChecked procedures
- [x] Wire to notifyOwner when thresholds breached
- [x] Add "Last checked" timestamp + "Run Check" button to Alerts page
- [x] Registered schedulerRouter in routers.ts

## ✅ Phase 14 — Publishing Page Refactor
- [x] Create client/src/components/publishing/ directory
- [x] PostCard component (individual post card with platform icons + status badge)
- [x] PostList component (list view with empty state)
- [x] PostCalendarView component (monthly calendar grid)
- [x] Publishing.tsx refactored to use publishing components

## ✅ Phase 15 — Final Tests & Delivery
- [x] scheduler.test.ts (8 tests: evaluateRule + datePreset validation)
- [x] publishing.test.ts (9 tests: status style + calendar + groupByDay)
- [x] supabase-frontend.test.ts (3 tests: env vars + REST reachability)
- [x] 43/43 tests passing across 8 test files
- [x] 0 TypeScript errors
- [ ] Checkpoint and deliver
