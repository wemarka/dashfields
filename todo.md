# Dashfields — Project TODO

## Design System
- [x] Apple Vision Pro Glassmorphism CSS (glass cards, blur, silver borders)
- [x] Tailwind config with custom tokens (radius 24px, silver palette, animations)
- [x] Inter font integration
- [x] Micro-animations (fade-in, slide-up, blur-in, cubic-bezier transitions)

## Layout & Navigation
- [x] Collapsible sidebar with glassmorphism
- [x] App background (light gradient)
- [x] App shell with route-based navigation
- [ ] Mobile responsive layout (partial)

## Dashboard
- [x] KPI cards (6 metrics: spend, impressions, clicks, conversions, reach, ROAS)
- [x] Area chart — spend over time
- [x] Performance bars (CTR, CPC, CPM, CPA)
- [x] Active campaigns table

## Campaigns
- [x] Campaign list with glass table
- [x] Search + status filter
- [x] Status badges (active, paused, ended, draft)
- [x] Pause/Resume actions (UI)
- [ ] Campaign detail drawer
- [ ] Create campaign wizard

## Analytics
- [x] Summary metrics row
- [x] Spend & Conversions area chart
- [x] Spend by Placement donut chart
- [x] Reach by Age Group bar chart
- [ ] Date range selector (wired)

## Publishing
- [x] Post list view with status, platform, type
- [x] Calendar view (March 2026)
- [ ] Post composer modal
- [ ] Real scheduling backend

## Insights
- [x] AI-powered recommendations cards
- [x] Impact badges (High/Medium/Low)
- [ ] Real-time insights from Meta API

## AI Tools
- [x] Tool selector (copywriter, audience, creative, strategy)
- [x] Prompt input + example prompts
- [x] AI generation (connected to LLM via tRPC)
- [x] Copy to clipboard

## Settings
- [x] Account info section
- [x] Meta Ads integration (connect/disconnect UI)
- [x] Instagram integration (connect/disconnect UI)
- [x] Notification preferences
- [x] Appearance (theme, language)

## Backend (tRPC + DB)
- [x] DB schema: users, socialAccounts, campaigns, campaignMetrics, posts, userSettings, notifications
- [x] server/db.ts query helpers
- [x] tRPC router: campaigns (list, create, updateStatus, metrics)
- [x] tRPC router: posts (list, create)
- [x] tRPC router: social accounts (list)
- [x] tRPC router: settings (get, update)
- [x] tRPC router: notifications (list, markRead)
- [x] tRPC router: ai (generate with LLM)
- [ ] DB migration: pnpm db:push
- [ ] Real Meta Ads OAuth integration
- [ ] Real-time metrics sync from Meta API

## Testing
- [ ] Vitest tests for campaign procedures
- [ ] Vitest tests for AI procedure

## Phase 2 — Full Functionality (In Progress)
- [x] DB migration: pnpm db:push
- [x] Campaign creation wizard (multi-step modal)
- [x] Post composer modal with media + scheduling
- [x] Wire Campaigns page to real tRPC data
- [x] Wire Publishing page to real tRPC data
- [x] AI Tools connected to real LLM router
- [x] Toast feedback on mutations (Sonner)
- [x] Empty states with CTA buttons
- [x] Loading skeletons (Loader2 spinners)
- [ ] Notification bell in header (future)

## Phase 3 — Meta Ads Real Integration

- [x] Verify Meta Ads MCP connection (3 ad accounts found)
- [x] Build server/meta.ts — Meta Graph API helper
- [x] Build server/routers/meta.ts — tRPC router with 7 procedures
- [x] Register metaRouter in appRouter
- [x] Build MetaConnect.tsx — 3-step connection flow
- [x] Update Dashboard with real Meta KPIs + date preset selector
- [x] Update Campaigns page with Meta/Local tabs + real Meta campaign data
- [x] Update Analytics page with real Meta insights + 4 charts
- [x] Add Meta Ads link in sidebar navigation
- [x] Add /meta-connect route in App.tsx
- [x] 0 TypeScript errors, 5 tests passing
