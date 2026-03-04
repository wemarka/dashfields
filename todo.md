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
- [x] Checkpoint and deliver

## ✅ Phase 16-24 — Multi-Platform Expansion (Complete)
- [x] shared/platforms.ts — PLATFORMS config (8 platforms: FB, IG, TikTok, X, LinkedIn, YouTube, Snapchat, Pinterest)
- [x] PlatformIcon component for all platforms
- [x] Connections Hub page (/connections) — replaces MetaConnect in sidebar
- [x] server/routers/platforms.ts — unified allInsights procedure
- [x] Dashboard: cross-platform KPIs + PlatformBreakdownCard
- [x] Analytics: platform filter tabs + per-platform breakdown table
- [x] Campaigns: platform tabs (All / Meta Ads / Local) + future platform stubs
- [x] PostComposerModal: multi-platform selector with all 8 platforms
- [x] Alerts: platform selector in create form + notification filter by platform
- [x] DashboardLayout: "Connections" in sidebar with connected count badge
- [x] App.tsx: /connections route added
- [x] server/platforms.test.ts — 14 tests (PLATFORMS config + aggregation)
- [x] server/connections.test.ts — 11 tests (connection status + feature matrix)
- [x] 68/68 tests passing across 10 test files
- [x] 0 TypeScript errors
- [x] Checkpoint and deliver

## ✅ Phase 25-29 — Enhanced Features (Complete)
- [x] Connections Hub: PlatformCardSkeleton loading state (6 skeleton cards)
- [x] Connections Hub: ConnectModal with step-by-step OAuth/token flow per platform
- [x] Insights page: cross-platform ROI comparison (BarChart + RadarChart)
- [x] Insights page: best platform card, cost efficiency table, AI recommendations
- [x] Insights page: DashboardKpiSkeleton + ChartSkeleton loading states
- [x] Export Reports: server/routers/export.ts (CSV + HTML report generation)
- [x] Export Reports: ExportReportModal component with platform/format/date filters
- [x] Export button in Analytics page header
- [x] MetaCampaignTable: CampaignRowSkeleton (5 skeleton rows) instead of spinner
- [x] shared/platforms.ts: connectionType added per platform
- [x] snapchat + pinterest added to platformEnum in schema
- [x] server/export.test.ts — 13 tests (CSV builder + HTML report)
- [x] server/insights.test.ts — 11 tests (ROI ranking + efficiency + radar)
- [x] 92/92 tests passing across 12 test files
- [x] 0 TypeScript errors
- [x] Checkpoint and deliver

## ✅ Phase 30-34 — Meta OAuth + Reports + Compare + Polish (Complete)
- [x] server/metaOAuth.ts — Meta OAuth server routes (/api/meta/oauth/start, /callback)
- [x] Connections Hub: OAuth button for Facebook/Instagram + step-by-step modal
- [x] drizzle/schema.ts: reports table + reportScheduleEnum
- [x] Supabase migration applied via MCP
- [x] server/routers/reports.ts — CRUD for scheduled reports + notifyOwner delivery
- [x] Reports page (/reports) in sidebar with create/edit/delete/run now
- [x] App.tsx: /reports route added
- [x] CampaignCompareDrawer: side-by-side campaign comparison with bar charts
- [x] Campaigns page: "Compare" button in header
- [x] Settings page: full redesign with real data binding (notifications, connections, appearance)
- [x] OnboardingBanner: smart 3-step guide auto-hides when all steps done
- [x] Home.tsx: SmartOnboardingBanner replaces simple connect banner
- [x] server/reports.test.ts — 14 tests (schedule, next-run, CSV, title)
- [x] server/metaOAuth.test.ts — 10 tests (URL builder, state encode/decode, code validation)
- [x] 116/116 tests passing across 14 test files
- [x] 0 TypeScript errors
- [x] Checkpoint and deliver
## 🔄 Phase 35-39 — Audience Analytics + Budget Tracker + Cron + TikTok/LinkedIn

### Phase 35 — Audience Analytics Page
- [x] server/routers/audience.ts — demographics data (age, gender, location, interests)
- [x] Audience page (/audience) with 4 chart sections
- [x] AgeGenderChart component (stacked bar chart)
- [x] LocationChart component (top countries/cities bar chart)
- [x] InterestsChart component (horizontal bar chart)
- [x] DeviceBreakdown component (pie chart: mobile/desktop/tablet)
- [x] Platform filter tabs in Audience page
- [x] App.tsx: /audience route + sidebar link

### Phase 36 — Budget Tracker Widget
- [x] BudgetTracker component on Dashboard
- [x] Daily/Monthly spend vs budget progress bars
- [x] 80% threshold alert badge
- [x] Budget settings in Settings page
- [x] server/routers/budget.ts — getBudgetStatus + setBudget procedures

### Phase 37 — Automated Scheduled Reports Cron
- [x] server/cron.ts — cron job runner (daily/weekly/monthly)
- [x] Auto-run scheduled reports via notifyOwner
- [x] Cron status endpoint (/api/cron/status)
- [x] Last run timestamp in Reports page

### Phase 38 — TikTok & LinkedIn OAuth UI
- [x] TikTok OAuth flow UI in Connections Hub
- [x] LinkedIn OAuth flow UI in Connections Hub
- [x] Real OAuth URL builders for TikTok + LinkedIn
- [x] Token storage in connections table

### Phase 39 — Tests + Checkpoint
- [x] server/audience.test.ts — 10+ tests
- [x] server/budget.test.ts — 8+ tests
- [x] 149/149 tests passing
- [x] 0 TypeScript errors
- [x] Checkpoint and deliver

## 🐛 Bug Fixes
- [x] Fix "column posts.platform does not exist" error on /audience page
- [x] Fix "column posts.post_type does not exist" error on /audience page — added post_type, likes, comments, shares, reach, impressions columns via Supabase migration

## 🔄 Phase 40-44 — Post Analytics + Period Comparison + AI Content + Activity Feed

### Phase 40 — Post Analytics Page
- [x] server/routers/postAnalytics.ts — top posts, engagement by hour/day, best times
- [x] Post Analytics page (/post-analytics) with 4 sections
- [x] TopPostsTable component (sorted by engagement)
- [x] EngagementHeatmap component (day x hour grid)
- [x] BestTimesChart component (bar chart by hour)
- [x] PostTypeBreakdown component (image/video/text pie)
- [x] App.tsx: /post-analytics route + sidebar link

### Phase 41 — Period Comparison Dashboard
- [x] PeriodComparison page (/compare) with current vs previous month
- [x] server/routers/periodComparison.ts — fetch two periods in parallel
- [x] ComparisonKpiCard component (shows delta %, trend arrow)
- [x] ComparisonChart component (two lines on same chart)
- [x] Platform filter in comparison page
- [x] App.tsx: /compare route + sidebar link

### Phase 42 — AI Content Suggestions
- [x] server/routers/aiContent.ts — LLM-powered post ideas generator
- [x] AI Content page (/ai-content) with platform + tone selectors
- [x] ContentIdeaCard component (copy to clipboard, save to drafts)
- [x] Hashtag suggestions per platform
- [x] Caption length optimizer
- [x] Save generated content to posts table in Supabase

### Phase 43 — Activity Feed + Settings API Keys
- [x] ActivityFeed component — real-time Supabase Realtime events
- [x] Add ActivityFeed to Dashboard sidebar/widget
- [x] Settings: API Keys tab (add/remove platform API keys)
- [x] server/routers/apiKeys.ts — store encrypted keys in Supabase
- [x] Show connected API key status per platform in Connections Hub

### Phase 44 — Tests + Checkpoint
- [x] server/postAnalytics.test.ts — 10+ tests
- [x] server/periodComparison.test.ts — 8+ tests
- [x] server/aiContent.test.ts — 8+ tests
- [x] 175+ tests passing
- [x] 0 TypeScript errors
- [x] Checkpoint and deliver

## 🔄 Phase 45-48 — Activity Feed + Content Calendar + Demo Data

### Phase 45 — Activity Feed
- [x] Activity Feed widget in Dashboard (Supabase Realtime)
- [x] ActivityFeed component with real-time updates
- [x] Server router for activity events (via Supabase Realtime on client)

### Phase 46 — Content Calendar
- [x] Content Calendar page (monthly/weekly view)
- [x] Drag-and-drop post scheduling (click-to-create + reschedule modal)
- [x] Calendar router (CRUD for scheduled posts) — extended posts router
- [x] Add Calendar to sidebar navigation

### Phase 47 — Demo Data + Bug Fixes
- [x] Seed demo posts with analytics data (10 posts)
- [x] Fix periodComparison router missing module error (was stale log)
- [x] Fix any remaining Supabase column errors

### Phase 48 — Tests + Checkpoint
- [x] Write tests for new features (213/213)
- [x] 0 TypeScript errors
- [x] Checkpoint and deliver

## 🎨 Phase 49-52 — Sidebar Redesign + App Audit

### Phase 49 — Audit
- [x] List all sidebar items and identify duplicates/overlaps
- [x] Map each page to its purpose and check for redundancy

### Phase 50 — Sidebar Redesign
- [x] Group sidebar into logical sections (Overview, Advertising, Analytics, Content, Reports)
- [x] Remove or merge duplicate pages — Publishing kept, Calendar added as primary
- [x] Add section labels/dividers to sidebar
- [x] Improve sidebar visual design (icons, active state, hover, active dot indicator)

### Phase 51 — Design Improvements
- [x] Improve typography consistency across all pages (page-header, page-subtitle, section-title classes)
- [x] Fix spacing and card layout inconsistencies
- [x] Improve empty states on all pages (empty-state utility class)
- [x] Better color hierarchy and visual polish (brand color, chart colors, card-hover)

### Phase 52 — Tests + Checkpoint
- [x] TypeScript check (0 errors)
- [x] Tests passing (213/213)
- [x] Checkpoint and deliver

## ✅ Phase 53-56 — Feature Completion Round 3 (Complete)

### Phase 53 — Analytics Merge + Dark Mode
- [x] Merge Insights page content into Analytics as a Tab
- [x] Add Dark Mode toggle button in Topbar
- [x] Update sidebar to remove standalone Insights entry (now under Analytics)

### Phase 54 — Dashboard Quick Actions + Publishing
- [x] Add Quick Actions bar in Dashboard (New Post, New Campaign, View Reports)
- [x] Improve Publishing page with better layout and scheduling UI

### Phase 55 — Campaigns + Connections Polish
- [x] Add filters (status, platform, date) to Campaigns page
- [x] Add status badges and better empty states to Campaigns
- [x] Improve Connections page with platform health indicators

### Phase 56 — Tests + Checkpoint
- [x] TypeScript check (0 errors)
- [x] Tests passing (225/225)
- [x] Checkpoint and deliver

## ✅ Phase 57-60 — Dark Mode + Connections + Calendar Merge + Campaigns (Complete)

### Phase 57 — Dark Mode + Connections Improvement
- [x] Dark Mode toggle in Topbar (sun/moon icon, saves to localStorage)
- [x] ThemeProvider update to support dark/light toggle
- [x] Connections page: better platform cards with last-sync, reconnect button
- [x] Connections page: status indicators (connected/expired/disconnected)

### Phase 58 — Merge Publishing into Calendar
- [x] Calendar page: add List View tab alongside Calendar View
- [x] List View: shows all scheduled posts sorted by date
- [x] Remove Publishing from sidebar (merged into Calendar)
- [x] Update App.tsx routes (/publishing → /calendar)

### Phase 59 — Campaigns Improvements
- [x] Campaigns: search bar to filter by name
- [x] Campaigns: summary KPI bar (total spend, active count, avg CTR)
- [x] Campaigns: better status badges (ACTIVE=green, PAUSED=yellow, ENDED=gray)

### Phase 60 — Tests + Checkpoint
- [x] TypeScript check (0 errors)
- [x] Tests passing (225/225)
- [x] Checkpoint and deliver

## ✅ Phase 69-73 — Hashtag Analytics + Post Trend Chart
- [x] Hashtag Analytics page (/hashtags) with real data from posts table
- [x] server/routers/hashtags.ts — top hashtags, trend distribution, co-occurring tags
- [x] Hashtag seeding script (added hashtags to 10 posts in Supabase)
- [x] Hashtags added to sidebar under Analytics section
- [x] Post Analytics — engagementTrend procedure (real data from posts table)
- [x] Post Analytics — Trend tab with AreaChart (Engagement, Reach, Likes over time)
- [x] 225/225 tests passing, 0 TypeScript errors

## ✅ Phase 74-77 — Backend Data Wiring + Competitor Analysis + PDF Export

### Phase 74 — Fix All Mock Data
- [x] export.ts: Replace mockRow() with real getDbRow() from campaign_metrics
- [x] platforms.ts: Already using real getDbInsight() from campaign_metrics (no mock)
- [x] budget.ts: Already using real campaign_metrics queries (no mock)
- [x] All data sources verified: 100% real Supabase data, no random/simulated values

### Phase 75 — PDF Export
- [x] Reports page: Add "📄 PDF Report" as a 3rd format option
- [x] PDF generation: Opens HTML report in new window + triggers browser print dialog
- [x] User can save as PDF from browser's native print dialog

### Phase 76 — Competitor Analysis Page
- [x] server/routers/competitors.ts — benchmarkComparison + platformTrend + getBenchmarks
- [x] Industry benchmarks for 8 platforms (Facebook, Instagram, TikTok, LinkedIn, YouTube, Twitter, Snapchat, Pinterest)
- [x] Competitors page (/competitors) with platform cards showing score rings
- [x] CTR comparison bar chart (your performance vs industry average)
- [x] Radar chart for selected platform (5-metric performance spider)
- [x] CTR trend line chart vs benchmark over time
- [x] Industry benchmarks reference table
- [x] Added "Competitors" to Analytics section in sidebar
- [x] App.tsx: /competitors route added

### Phase 77 — Tests + Checkpoint
- [x] server/competitors.test.ts — 19 tests (benchmarks, score calculation, metrics, ranking)
- [x] 244/244 tests passing across 23 test files
- [x] 0 TypeScript errors
- [x] Checkpoint and deliver

## ✅ CRITICAL — Real Data Only (No Mock/Seed/Random) — DONE

### Principle: Only show data from connected accounts. If no account connected → show 0 / empty state.

- [x] Clean Supabase: delete all seed/fake campaigns, campaign_metrics, posts
- [x] Fix platforms.ts — only Meta API for FB/IG, only real DB for others
- [x] Fix audience.ts — only real posts from DB (no industry distribution fallback)
- [x] Fix postAnalytics.ts — only real posts from DB
- [x] Fix hashtags.ts — only real hashtags extracted from real posts
- [x] Fix competitors.ts — only real metrics from connected campaigns
- [x] Fix periodComparison.ts — only real campaign_metrics
- [x] Fix export.ts — only real connected account data
- [x] Fix reports.ts — only real data
- [x] Fix social.ts: use 'name' column (not 'display_name' which doesn't exist in DB)
- [x] Fix Connections.tsx: use acc.name instead of acc.display_name
- [x] Fix platforms.ts + export.ts: use acc.name instead of acc.display_name
- [x] Verified Meta API works: 423K impressions, 12.5K clicks, $745 spend (real data)
- [x] Analytics.tsx: shows "Connect platforms" CTA when no accounts connected
- [x] Audience.tsx: shows empty state when no posts exist
- [x] 244/244 tests passing, 0 TypeScript errors
- [x] Checkpoint saved

## 🔴 BUG FIX — Crash on Profile, Settings, Hashtags Pages

- [ ] Fix Profile page crash
- [ ] Fix Settings page crash
- [ ] Fix Hashtags page crash
- [ ] Run tests and save checkpoint

## 🔴 BUG FIX — Profile, Hashtags, Settings outside DashboardLayout

- [x] Fix Profile.tsx: added DashboardLayout wrapper
- [x] Fix HashtagAnalytics.tsx: added DashboardLayout wrapper
- [x] Fix Notifications.tsx: added DashboardLayout wrapper
- [x] Verified all sidebar links render inside DashboardLayout
- [x] 0 TypeScript errors
- [x] Save checkpoint

## ✅ MAJOR UPGRADE — Full UI/UX Redesign + Arabic RTL + Auth Fix (DONE)

### Phase A — UI/UX Redesign
- [x] Redesign Sidebar: better hierarchy, icons animation, active states, hover effects, section labels
- [x] Redesign Topbar: cleaner layout, language toggle, dark mode, notification bell
- [x] Improve color system: better contrast, refined brand palette in index.css (OKLCH)
- [x] Add micro-animations: icon hover scale, sidebar item slide, page transitions (animate-fade-in, animate-blur-in)
- [x] Improve card designs: better shadows, spacing, border radius consistency
- [x] Improve empty states: better illustrations and CTAs
- [x] Add Noto Sans Arabic font via Google Fonts CDN

### Phase B — Arabic RTL Support
- [x] Install i18n library (react-i18next + i18next)
- [x] Create translation files: en.json and ar.json (full translation of all UI strings)
- [x] Add language toggle in Topbar (EN/ع button)
- [x] Apply RTL direction when Arabic is selected (dir="rtl" on html element)
- [x] Sidebar uses flex-row-reverse in RTL mode
- [x] All sidebar items translated to Arabic
- [x] Settings page: Language selector connected to i18n
- [x] RTL CSS utilities added to index.css

### Phase C — Auth/Connect Fix
- [x] Meta OAuth callback handler in Connections.tsx (shows success/error toast)
- [x] META_APP_ID + META_APP_SECRET secrets added
- [x] Connections page: auto-refreshes after OAuth callback
- [x] All mock/demo data removed from Supabase
- [x] Connections page shows real connected accounts only
- [x] Fix Notifications.tsx JSX structure (unterminated JSX fixed)

### Phase D — Tests + Checkpoint
- [x] TypeScript check (0 errors)
- [x] 247/247 tests passing
- [x] Save checkpoint

## 🔄 Phase 78-83 — Full Arabic Translation + UX Polish + Connections OAuth

### Phase 78 — Complete Arabic Translation
- [x] Expand ar.json to cover all page content (Dashboard, Analytics, Campaigns, Audience, etc.)
- [x] Apply useTranslation() in all pages (Home, Analytics, Campaigns, Audience, PostAnalytics, Hashtags, Competitors, Calendar, Reports, Alerts, Profile, Settings, Connections, Notifications)
- [x] Translate all error messages, toast notifications, empty states, and button labels
- [x] Ensure RTL layout works correctly on all pages

### Phase 79 — Connections Page Redesign + OAuth
- [x] Redesign Connections page with modern platform cards
- [x] Show real connected account info (name, followers, last sync)
- [x] OAuth flow: Facebook/Instagram direct connect button
- [x] Disconnect button with confirmation dialog
- [x] Status badges: Connected (green), Expired (yellow), Not Connected (gray)
- [x] "Sync Now" button per platform

### Phase 80 — Dashboard + Analytics UX Polish
- [x] Dashboard: show real Meta data when connected (impressions, clicks, spend, reach)
- [x] Dashboard: better empty state with step-by-step onboarding guide
- [x] Analytics: improve chart designs and data labels
- [x] Analytics: add date range picker (7d, 30d, 90d, custom)
- [x] Analytics: platform comparison table with real data

### Phase 81 — Campaigns + Content Pages Polish
- [ ] Campaigns: improve campaign creation form with real Meta Ads integration
- [ ] Calendar: improve post composer with real platform publishing
- [ ] Post Analytics: improve charts and add export button
- [ ] Hashtags: improve visualization with trending indicators

### Phase 82 — Settings + Profile + Reports Polish
- [ ] Profile: edit name/email/avatar with real Supabase update
- [ ] Settings: improve appearance tab with more theme options
- [ ] Reports: improve scheduled reports UI with next-run countdown
- [ ] Alerts: improve alert rules with better threshold UI

### Phase 83 — Tests + Checkpoint
- [x] TypeScript check (0 errors)
- [x] 247/247 tests passing
- [x] Save checkpoint and deliver

## 🔄 Phase 84-88 — Campaigns Meta API + Calendar Publishing + Reports + Alerts + Profile

### Phase 84 — Campaigns: Meta Ads API Integration
- [ ] Campaign creation form: connect to real Meta Ads API (create campaign via Graph API)
- [ ] Campaign status toggle: pause/resume via Meta API
- [ ] Campaign budget edit: update budget via Meta API
- [ ] Better campaign creation wizard with ad set + budget steps
- [ ] Show Meta campaign ID and link to Meta Ads Manager

### Phase 85 — Calendar: Real Publishing + Post Composer
- [ ] Post Composer: publish immediately to Meta (Facebook/Instagram) via Graph API
- [ ] Post Composer: schedule post (save to DB + cron picks up)
- [ ] Calendar: show published posts with real engagement data
- [ ] Calendar: drag-and-drop reschedule updates DB
- [ ] Post Composer: image upload via S3

### Phase 86 — Reports: Countdown + Alerts: Threshold UI
- [ ] Reports page: next-run countdown timer (live countdown to next scheduled run)
- [ ] Reports page: last-run status indicator (success/failed/running)
- [ ] Alerts page: visual threshold slider instead of text input
- [ ] Alerts page: alert history log (last 10 triggered alerts)
- [ ] Alerts page: test alert button (simulate trigger)

### Phase 87 — Profile + Settings Polish
- [ ] Profile page: edit name with real Supabase update
- [ ] Profile page: avatar upload via S3
- [ ] Settings: appearance tab with font size option
- [ ] Settings: timezone selector (affects date display)
- [ ] Settings: data export (download all your data as JSON)

### Phase 88 — Tests + Checkpoint
- [x] TypeScript check (0 errors)
- [ ] All tests passing
- [ ] Save checkpoint and deliver

## Phase 84-88 — Campaigns + Calendar + Reports + Alerts + Profile

- [x] Campaigns: إضافة إجراءات createCampaign وtoggleStatus وupdateBudget في Meta router
- [x] Campaigns: إنشاء MetaCampaignCreateModal لإنشاء حملات Meta حقيقية
- [x] Campaigns: تحديث MetaCampaignTable مع toggle status وlink لـ Meta Ads Manager
- [x] Calendar: إضافة زر Publish Now في PostDetailModal لنشر المنشورات عبر Meta Graph API
- [x] Calendar: إضافة إجراء publishNow في server/routers/posts.ts
- [x] Reports: إضافة CountdownBadge لعداد تنازلي للتقرير التالي
- [x] Reports: تحسين ReportCard مع عرض آخر وقت تشغيل + i18n
- [x] Alerts: إضافة threshold slider لكل metric مع نطاق ديناميكي
- [x] Alerts: تحسين CreateAlertForm مع SlidersHorizontal icon + i18n
- [x] Profile: إضافة i18n كامل + مزامنة اللغة فورياً عند الحفظ
- [x] i18n: إضافة مفاتيح profile.accountInfo/preferences/notifications في en.json وar.json
- [x] i18n: إضافة common.saving وcommon.saveChanges في كلا الملفين
- [x] TypeScript: 0 أخطاء
- [x] Tests: 247/247 ناجح

## Phase 89-93 — Instagram + Cron + PDF + Profile + Alerts

### Phase 89 — Instagram Publishing + Auto-Schedule Cron
- [x] Instagram Graph API: publish photo/video to Instagram Feed
- [x] Instagram Graph API: publish Reels
- [x] Cron job: auto-publish scheduled posts when due time arrives
- [x] PostComposerModal: platform selector shows Instagram as publishable
- [x] Calendar: Publish Now button for Instagram + Facebook

### Phase 90 — PDF Reports Server-Side
- [x] server/routers/reports.ts: generatePdf procedure (HTML → S3)
- [x] Download PDF button in Reports page (opens S3 URL in new tab)
- [x] Store HTML report in S3 and return download URL

### Phase 91 — Profile: Avatar Upload + Edit Name
- [x] Profile page: avatar upload button → S3 upload → save URL in user_settings
- [x] Profile page: editable name field with save button
- [x] server/routers/settings.ts: updateProfile + uploadAvatar procedures

### Phase 92 — Alerts: History + Test Alert + Data Export
- [x] Alerts page: Alert History section (last 20 triggered alerts)
- [x] Alerts page: "Test Alert" button → simulate trigger → show toast
- [x] Alerts page: "Export CSV" button → download alert rules

### Phase 93 — Tests + Checkpoint
- [x] TypeScript check (0 errors)
- [x] 247/247 tests passing
- [x] Save checkpoint and deliver

## Phase 94-98 — Twitter/X + AI Caption + Hashtags + Dashboard Widgets

### Phase 94 — Twitter/X OAuth + Publishing
- [x] server/twitter.ts: Twitter API v2 helper (post tweet, media upload)
- [x] server/platformOAuth.ts: Twitter OAuth scope updated (tweet.write)
- [x] server/routers/posts.ts: publishNow supports Twitter/X
- [x] ContentCalendar.tsx: Publish Now button for Twitter/X

### Phase 95 — AI Caption Generator in Post Composer
- [x] server/routers/ai.ts: generateCaption, generateHashtags, improveContent
- [x] PostComposerModal.tsx: AI Caption Generator with topic input
- [x] PostComposerModal.tsx: AI Hashtag Suggestions
- [x] PostComposerModal.tsx: Improve Content button

### Phase 96 — Hashtags + Competitors Enhancements
- [x] HashtagAnalytics.tsx: AI Suggest Hashtags panel (copy + download .txt)
- [x] Competitors.tsx: AI Strategy Recommendations button + panel

### Phase 97 — Dashboard Widgets Customization
- [x] Home.tsx: Widget visibility toggle menu (show/hide 6 widgets)
- [x] Home.tsx: Persist widget preferences in localStorage
- [x] Home.tsx: Reset to Default button

### Phase 98 — Tests + Checkpoint
- [x] TypeScript check (0 errors)
- [x] 247/247 tests passing
- [x] Save checkpoint and deliver

## Phase 99-104 — Connections 100% Complete

### Phase 99 — Audit All Connections
- [ ] Review server/platformOAuth.ts for all 8 platforms
- [ ] Review server/metaOAuth.ts for Facebook/Instagram
- [ ] Review Connections.tsx UI state
- [ ] Identify gaps: missing OAuth flows, broken callbacks, missing token refresh

### Phase 100 — Meta (Facebook + Instagram) OAuth Polish
- [ ] Verify /api/meta/oauth/start and /callback work end-to-end
- [ ] Store page_id, page_name, instagram_business_account_id after connect
- [ ] Show real account name + page name in Connections card
- [ ] Add token expiry check + re-auth prompt
- [ ] Disconnect clears tokens properly

### Phase 101 — Twitter/X OAuth 2.0 Complete
- [ ] /api/oauth/twitter/start → Twitter OAuth 2.0 PKCE flow
- [ ] /api/oauth/twitter/callback → exchange code for access_token
- [ ] Store twitter username + user_id after connect
- [ ] Show @username in Connections card

### Phase 102 — TikTok + LinkedIn + YouTube OAuth
- [ ] TikTok: /api/oauth/tiktok/start + /callback (OAuth 2.0)
- [ ] LinkedIn: /api/oauth/linkedin/start + /callback
- [ ] YouTube: /api/oauth/youtube/start + /callback (Google OAuth)
- [ ] Store display name/handle for each platform

### Phase 103 — Snapchat + Pinterest + Connections UI
- [ ] Snapchat: token-based connect (API key input)
- [ ] Pinterest: token-based connect (API key input)
- [ ] Connections page: show real account info per platform
- [ ] Connections page: Sync Now button per platform
- [ ] Connections page: token expiry badge (Expired/Active)
- [ ] Connections page: last synced timestamp

### Phase 104 — Tests + Checkpoint
- [x] TypeScript check (0 errors)
- [ ] All tests passing
- [ ] Save checkpoint and deliver

## Phase 99-104 — Connections 100% Complete

### Phase 99 — Meta OAuth Overhaul
- [x] metaOAuth.ts: Exchange short-lived token for long-lived (60 days)
- [x] metaOAuth.ts: Fetch Facebook ad accounts + Pages
- [x] metaOAuth.ts: Fetch Instagram business accounts from Pages
- [x] metaOAuth.ts: Save profile picture, username, followers count
- [x] metaOAuth.ts: Friendly error page when META_APP_ID missing
- [x] Callback: save both Facebook + Instagram in one OAuth flow

### Phase 100 — Twitter/X OAuth 2.0 (PKCE)
- [x] platformOAuth.ts: Twitter PKCE flow (code_verifier + code_challenge)
- [x] platformOAuth.ts: HTTP Basic Auth for token exchange
- [x] platformOAuth.ts: Fetch Twitter user info (name, username, profile_image_url)
- [x] State store with in-memory TTL cleanup

### Phase 101 — TikTok OAuth
- [x] platformOAuth.ts: TikTok OAuth 2.0 flow
- [x] platformOAuth.ts: Fetch TikTok user info (display_name, avatar_url)
- [x] Friendly "not configured" HTML page when CLIENT_ID missing

### Phase 102 — LinkedIn + YouTube OAuth
- [x] platformOAuth.ts: LinkedIn OAuth 2.0 with Basic Auth
- [x] platformOAuth.ts: YouTube (Google) OAuth with offline access
- [x] Fetch LinkedIn name + YouTube channel info

### Phase 103 — Snapchat + Pinterest (API Key)
- [x] shared/platforms.ts: Changed connectionType from "coming_soon" to "api_key"
- [x] ManualConnectModal: token hint + docs URL link
- [x] Full manual token connect form with validation

### Phase 104 — Connections UI Overhaul
- [x] PlatformCard: OAuth 2.0 badge, profile picture, username display
- [x] PlatformCard: Token expiry badge (Active / Expires in Xd / Expired)
- [x] PlatformCard: "Refresh" button to reconnect expired tokens
- [x] PlatformCard: "Add another account" link
- [x] Connected accounts list with disconnect per account
- [x] Summary chips showing connected platforms
- [x] Expired tokens warning banner
- [x] OAuth callback handler (meta_connected, oauth_success, oauth_error)
- [x] Info banner explaining OAuth 2.0 security
- [x] 247/247 tests passing, 0 TypeScript errors

## 🐛 Bug Fix — Connect Button "refused to connect"
- [x] Diagnose OAuth redirect URL construction issue
- [x] Fix: platformOAuth.ts now redirects to app with oauth_error=not_configured instead of serving HTML page
- [x] Fix: toast shows clear message with "View Docs" button when credentials missing
- [x] Verified: all platforms (twitter, tiktok, linkedin, youtube) return 302 redirect correctly
- [x] 247/247 tests passing, 0 TypeScript errors

## Phase 105-108 — Health Check + Notifications + Campaign Clone

### Phase 105 — Connection Health Check + Meta Ad Account Selector
- [x] server/routers/social.ts: healthCheck mutation (validates all tokens)
- [x] server/routers/social.ts: setActiveAdAccount procedure
- [x] Connections.tsx: Health Check button in header with toast result

### Phase 106 — Token Auto-Refresh + Campaign Clone
- [x] server/cron.ts: auto-refresh tokens expiring in 7 days
- [x] server/routers/campaigns.ts: clone + delete procedures
- [x] LocalCampaignTable.tsx: Clone + Delete buttons with confirmation

### Phase 107 — Audience Insights AI
- [x] server/routers/ai.ts: analyzeAudience procedure
- [x] Audience.tsx: AI Analysis panel with insights + best posting times

### Phase 108 — Tests + Checkpoint
- [x] TypeScript check (0 errors)
- [x] Vite: no errors
- [x] 247/247 tests passing
- [x] Save checkpoint and deliver

## Bug Fix — Duplicate key "facebook" on / and /connections pages
- [x] Fix duplicate key error in PlatformBreakdownCard.tsx (key={ins.platform} → key={platform-name-idx})
- [x] Fix duplicate key error in Analytics.tsx (key={ins.platform+ins.accountName} → key={platform-name-idx})
- [x] Fix duplicate key error in Insights.tsx (key={ins.platform} → key={platform-idx})

## Phase 109-120 — World-Class Professional Completion

### Phase 109 — Multi-Platform Publishing (LinkedIn + TikTok + YouTube)
- [ ] server/linkedin.ts — LinkedIn API helper (share post, upload media)
- [ ] server/tiktok.ts — TikTok API helper (create video post)
- [ ] server/youtube.ts — YouTube Data API helper (upload video, community post)
- [ ] server/routers/posts.ts: publishNow supports linkedin, tiktok, youtube
- [ ] ContentCalendar.tsx: Publish Now for all 6 platforms
- [x] PostComposerModal: platform-specific character limits + previews + image upload

### Phase 110 — Advanced AI Studio
- [ ] server/routers/ai.ts: sentimentAnalysis procedure
- [ ] server/routers/ai.ts: bestTimeToPost procedure
- [ ] server/routers/ai.ts: contentCalendarPlan procedure
- [ ] AIContent.tsx: Sentiment Analysis tab
- [ ] AIContent.tsx: Best Time to Post AI recommendations
- [ ] AIContent.tsx: AI Content Calendar Planner

### Phase 111 — Competitor Intelligence Upgrade
- [ ] Competitors.tsx: Add competitor URL/handle input form
- [ ] Competitors.tsx: AI-powered SWOT analysis
- [ ] Competitors.tsx: Benchmark comparison radar chart
- [ ] server/routers/competitors.ts: trackCompetitor + getSwot procedures

### Phase 112 — White-Label PDF Reports
- [ ] server/routers/reports.ts: generateWhitelabelPdf (logo + brand colors)
- [ ] Reports page: Brand customization section (logo upload, color picker)
- [ ] Reports page: PDF preview before download
- [ ] Reports page: Email delivery option

### Phase 113 — Advanced Analytics (Funnel + Attribution)
- [x] AdvancedAnalytics page: Conversion Funnel chart (Impressions → Clicks → Conversions)
- [x] AdvancedAnalytics page: Attribution model selector (Last Click, First Click, Linear, Time Decay)
- [x] AdvancedAnalytics page: ROI calculator widget with ROAS, LTV:CAC, Break-even
- [x] server/routers/meta.ts: funnelData + attributionData procedures

### Phase 114 — Real-Time Dashboard Enhancements
- [x] Home.tsx: Live spend ticker (animated counter with ease-out cubic)
- [x] Home.tsx: Top Campaign widget (highest spend campaign with metrics)
- [x] Home.tsx: Platform health status indicators (active/inactive per platform)
- [x] server/routers/meta.ts: topCampaign procedure

### Phase 115 — Mobile Responsiveness Polish
- [ ] DashboardLayout: bottom navigation bar for mobile
- [ ] All pages: mobile-first responsive fixes
- [ ] PostComposerModal: mobile-optimized layout
- [ ] Charts: responsive sizing for small screens

### Phase 116 — Onboarding Wizard
- [ ] Multi-step onboarding modal for new users
- [ ] Step 1: Connect first platform
- [ ] Step 2: Set budget goals
- [ ] Step 3: Create first campaign or post
- [ ] Progress saved in user_settings

### Phase 117 — Settings Overhaul
- [ ] Settings: Timezone selector (affects all date displays)
- [ ] Settings: Currency selector (USD, EUR, SAR, AED, EGP)
- [ ] Settings: Data export (download all data as JSON/CSV)
- [ ] Settings: Account deletion with confirmation

### Phase 118-120 — Tests + Polish + Checkpoint
- [x] TypeScript check (0 errors)
- [x] All tests passing (247/247)
- [ ] Final UI polish pass
- [x] Save checkpoint and deliver

## Phase 121 — دمج AITools + تحسين Settings

- [ ] دمج AITools (Ad Copywriter, Audience Builder, Creative Brief, Campaign Strategist) كـ tabs في AIContent.tsx
- [ ] تحويل /ai-tools redirect لـ /ai-content
- [ ] Settings: Currency Selector (USD, EUR, SAR, AED, EGP, GBP)
- [ ] Settings: Timezone Selector مع تأثير على عرض التواريخ
- [ ] Settings: Data Export (JSON/CSV)
- [ ] حفظ currency وtimezone في user_settings وتطبيقهما globally

## Phase 122 — Multi-Platform OAuth UI

- [ ] Connections.tsx: زر "Connect with OAuth" لـ Twitter/X
- [ ] Connections.tsx: زر "Connect with OAuth" لـ TikTok
- [ ] Connections.tsx: زر "Connect with OAuth" لـ LinkedIn
- [ ] Connections.tsx: زر "Connect with OAuth" لـ YouTube
- [ ] server/platformOAuth.ts: التحقق من صحة الـ routes وإضافة callback handlers
- [ ] عرض حالة الاتصال الحقيقية لكل منصة

## Phase 123 — Campaign Builder الكامل

- [ ] server/routers/meta.ts: createAdSet procedure
- [ ] server/routers/meta.ts: createAd procedure مع image upload
- [ ] server/routers/meta.ts: getAdSets procedure
- [ ] server/routers/meta.ts: getAds procedure
- [ ] CampaignDetailDrawer.tsx: تبويب Ad Sets داخل الحملة
- [ ] CreateAdSetModal.tsx: نموذج إنشاء Ad Set مع targeting
- [ ] CreateAdModal.tsx: نموذج إنشاء Ad مع رفع صورة
- [ ] Audience Targeting: Age, Gender, Location, Interests

## Phase 124 — White-Label PDF Reports

- [ ] server/routers/reports.ts: generateWhitelabelPdf procedure
- [ ] Reports.tsx: Brand customization section (logo upload, color picker)
- [ ] Reports.tsx: PDF preview قبل التنزيل
- [ ] server/routers/reports.ts: sendReportByEmail procedure
- [ ] Reports.tsx: Email delivery option مع قائمة مستلمين

## Phase 125 — Dashboard Customization + Custom Date Range

- [ ] Custom Date Range Picker component
- [ ] تطبيق Custom Date Range على Analytics وCampaigns وHome
- [ ] Dashboard widget visibility toggles (إخفاء/إظهار)
- [ ] حفظ تفضيلات Dashboard في user_settings

## Phase 126 — A/B Testing + Audience Overlap

- [ ] server/routers/meta.ts: abTestCompare procedure
- [ ] ABTestingPage.tsx: مقارنة أداء نسختين من الإعلان
- [ ] Statistical significance calculator
- [ ] server/routers/audience.ts: audienceOverlap procedure
- [ ] Audience Overlap visualization في Audience page

## Phase 127 — اختبارات شاملة وcheckpoint

- [x] TypeScript check (0 errors)
- [ ] All tests passing
- [ ] Final UI polish
- [ ] Save checkpoint

## Phase 121-127 — تطوير شامل (جلسة 2026-03-03)
- [x] دمج AITools في AI Studio كـ tab جديد "Ad Tools"
- [x] إضافة Currency selector في Settings
- [x] Campaign Builder متكامل من 4 خطوات (Campaign → Ad Set → Ad Creative → Review)
- [x] White-Label PDF Reports مع شعار الشركة والألوان المخصصة
- [x] server/routers/abTesting.ts — router كامل مع statistical significance
- [x] client/src/pages/ABTesting.tsx — صفحة A/B Testing Dashboard كاملة
- [x] إضافة A/B Testing في sidebar وApp.tsx وi18n
- [x] جدول ab_tests في قاعدة البيانات
- [x] 247/247 اختبار ناجح
- [x] 0 أخطاء TypeScript

## Phase 128-133 — تطوير متقدم (جلسة 2026-03-03 مساءً)
- [ ] Onboarding Wizard — معالج تهيئة 4 خطوات للمستخدمين الجدد
- [ ] Mobile Bottom Navigation — شريط تنقل سفلي للهاتف
- [ ] Competitor SWOT Analysis بالذكاء الاصطناعي
- [ ] Competitor Benchmark Radar Chart
- [ ] Data Export (JSON/CSV) في Settings
- [ ] Account Deletion مع تأكيد في Settings
- [ ] AI Sentiment Analysis في AI Studio
- [ ] AI Best Time to Post في AI Studio

## Phase 128-133 — تطوير متقدم (جلسة مارس 2026)
- [x] SWOT AI Analysis procedure في competitors router (generateSwot)
- [x] Danger Zone (Account Deletion) في Settings مع تأكيد "DELETE"
- [x] Data Export موجود ومتصل بـ settings.exportData
- [x] Mobile Bottom Navigation مدرج في DashboardLayout مع pb-16 md:pb-0
- [x] AI Sentiment Analysis موجود في AI Studio (SentimentTab)
- [x] Best Time to Post موجود في AI Studio (TimingTab)
- [x] AI Content Calendar Planner موجود في AI Studio (CalendarTab)
- [x] A/B Testing Dashboard كامل (صفحة + router + جدول ab_tests)
- [x] Campaign Builder 4-step wizard (CampaignBuilder.tsx)
- [x] White-Label PDF Reports مع branding panel في Reports.tsx
- [x] 247/247 اختبار ناجح
- [x] 0 أخطاء TypeScript

## Phase 134-138 — Custom Dashboards + Advanced Notifications + Polish (جلسة 2026-03-03)
- [x] جدول custom_dashboards في Supabase (تم التحقق عبر Supabase client)
- [x] server/routers/customDashboards.ts — router كامل (list, get, create, update, delete, duplicate)
- [x] client/src/pages/CustomDashboards.tsx — صفحة Widget Builder كاملة
- [x] إضافة Custom Dashboards في sidebar وApp.tsx وi18n (en + ar)
- [x] Advanced Notifications page مع bulk actions وcategory filters
- [x] Performance Optimization — lazy loading للصفحات الثقيلة
- [ ] تحسين Home Dashboard — ربط KPI cards بالبيانات الحقيقية
- [x] اختبارات vitest للـ customDashboards router
- [x] TypeScript check (0 errors)
- [ ] Save checkpoint

## Phase 139-143 — إعادة هيكلة التطبيق (IA Redesign)
- [ ] Sidebar: تقليل العناصر لـ 10 فقط مع تجميع منطقي (Overview, Advertising, Content, Analytics, Reports)
- [ ] Sidebar: إزالة Publishing, Insights, Hashtags, PeriodCompare, AudienceOverlap, Advanced Analytics من القائمة الرئيسية
- [ ] Sidebar: دمج Alerts + Notifications في عنصر واحد
- [ ] Topbar: Profile Dropdown (Avatar → Profile, Settings, Logout)
- [ ] Sidebar: إزالة Profile + Settings من القائمة الجانبية
- [ ] Account Switcher في أسفل Sidebar مع أيقونة المنصة + اسم الحساب
- [ ] Account Switcher Modal: قائمة الحسابات المربوطة مقسمة حسب المنصة
- [ ] فلترة البيانات حسب الحساب المختار (activeAccountId في context)
- [ ] دمج Insights كـ tab داخل Analytics
- [ ] دمج Hashtags كـ tab داخل Post Analytics
- [ ] اختبارات + TypeScript check
- [ ] Checkpoint

## Phase — UI Restructure (2026-03-03)
- [x] Sidebar redesign — 6 groups, ~13 items, no cognitive overload
- [x] Profile Dropdown in Topbar (avatar → Profile, Settings, Logout)
- [x] Account Switcher at Sidebar bottom (per-platform, multi-account)
- [x] Active account stored in localStorage
- [x] Redirect routes for deprecated paths (/ai-tools, etc.)
- [x] i18n keys for topbar and account switcher (en + ar)
- [x] 266/266 tests passing, 0 TypeScript errors

## Phase — Analytics Tabs + Accessibility Fixes
- [x] Analytics.tsx — إضافة 3 tabs: Overview, Insights, Compare
- [x] Insights Tab — AI recommendations + Platform ranking
- [x] Compare Tab — Period comparison cards + Bar chart
- [x] GlobalSearch.tsx — إضافة DialogDescription مخفية
- [x] OnboardingModal.tsx — إضافة DialogDescription مخفية
- [x] 266/266 اختبار ناجح — 0 أخطاء TypeScript

## Phase — Active Account Filtering
- [ ] تحليل جميع الـ routers لتحديد الـ procedures التي تحتاج فلترة بـ accountId
- [ ] تحديث platforms.allInsights لقبول accountId اختياري
- [ ] تحديث meta.insights وmeta.campaigns لقبول accountId
- [ ] تحديث audience.demographics لقبول accountId
- [ ] تحديث alerts.list لقبول accountId
- [ ] تحديث campaigns.list لقبول accountId
- [ ] تحديث client: Analytics.tsx يمرر activeAccountId
- [ ] تحديث client: Home.tsx يمرر activeAccountId
- [ ] تحديث client: Campaigns.tsx يمرر activeAccountId
- [ ] تحديث client: Audience.tsx يمرر activeAccountId
- [ ] تحديث client: Alerts.tsx يمرر activeAccountId
- [ ] TypeScript check (0 errors)
- [ ] 266/266 اختبار ناجح
- [ ] Checkpoint

## Phase — Active Account Filtering (Completed)
- [x] ActiveAccountContext عالمي مشترك بين جميع الصفحات
- [x] Server-side: platforms.allInsights + platforms.summary يقبلان accountId اختياري
- [x] Server-side: meta procedures (campaignInsights, funnelData, attributionData, spendForecast, topCampaign) تقبل accountId
- [x] Client: Home.tsx مرتبط بـ activeAccountId
- [x] Client: Analytics.tsx مرتبط بـ activeAccountId
- [x] Client: Campaigns.tsx مرتبط بـ activeAccountId
- [x] Client: AdvancedAnalytics.tsx مرتبط بـ activeAccountId
- [x] Client: Insights.tsx مرتبط بـ activeAccountId
- [x] Client: AudienceOverlap.tsx مرتبط بـ activeAccountId
- [x] 266/266 اختبار ناجح — 0 أخطاء TypeScript

## ✅ Phase — Workspaces Multi-Tenancy SaaS

- [x] Schema: جدول workspaces (id, name, slug, logo_url, plan, created_by)
- [x] Schema: جدول workspace_members (workspace_id, user_id, role, invited_at, accepted_at)
- [x] Schema: جدول brand_profiles (workspace_id, tone, industry, language, keywords, avoid_words)
- [x] Backend: workspaceProcedure middleware في _core/trpc.ts
- [x] Backend: workspaces router (CRUD + members management + brand profile)
- [x] Backend: db helpers في server/db/workspaces.ts
- [x] Frontend: WorkspaceContext منفصل عن ActiveAccountContext
- [x] Frontend: Workspace Switcher في Sidebar (فوق Account Switcher)
- [x] Frontend: WorkspaceSwitcherModal في DashboardLayout
- [x] Frontend: صفحة WorkspaceSettings (General + Team + Brand Profile)
- [x] Auto-create Default Workspace عند تسجيل مستخدم جديد
- [x] QA: 281/281 اختبار ناجح + 0 أخطاء TypeScript + Checkpoint

## ✅ Phase — Workspace Data Binding + Invitations + Branding

### Phase A — ربط البيانات بـ workspaceId
- [x] إضافة عمود workspace_id لجداول social_accounts, campaigns, posts, alert_rules, reports في Supabase
- [x] تحديث DB helpers: getUserCampaigns, getUserPosts, getUserAlertRules, getUserSocialAccounts, reports.list
- [x] تحديث routers: campaigns.list, campaigns.create, posts.list, posts.create, alerts.list, alerts.create, reports.list, reports.create, social.list

### Phase B — نظام الدعوات
- [x] جدول workspace_invitations (token, workspace_id, email, role, expires_at, accepted_at, status)
- [x] Supabase migration لجدول الدعوات
- [x] server/db/invitations.ts — createInvitation, getInvitationByToken, acceptInvitation, revokeInvitation, getWorkspaceInvitations
- [x] server/routers/invitations.ts — invite, list, revoke, accept procedures
- [x] WorkspaceSettings Team tab: "Invite by Link" + قائمة الدعوات المعلقة + زر إلغاء
- [x] صفحة AcceptInvite.tsx (/invite/:token) — قبول الدعوة

### Phase C — Workspace Branding
- [x] uploadLogo tRPC procedure — base64 → S3 → logo_url في Supabase
- [x] Logo Upload UI في WorkspaceSettings General tab (preview + spinner + remove)
- [x] canAdmin في GeneralTab لإخفاء Logo uploader عن غير المشرفين

### Phase D — اختبارات + Checkpoint
- [x] server/invitations.test.ts — 11 اختبار (token generation, DB helpers, edge cases, security)
- [x] 292/292 اختبار ناجح + 0 أخطاء TypeScript
- [x] Checkpoint نهائي

## ✅ Phase — Workspace Logo in Sidebar + Frontend Filtering + Transfer Ownership

### Phase A — عرض شعار الـ Workspace في Sidebar
- [x] عرض logo_url في WorkspaceSwitcher (Sidebar bottom) بدلاً من أيقونة Building2
- [x] عرض logo_url في WorkspaceSwitcherModal (قائمة الـ workspaces)
- [x] Fallback: أول حرف من اسم الـ workspace إذا لم يكن هناك شعار
- [x] إصلاح JSDoc comments في 100+ ملف (حل مشكلة عرض المحرر)

### Phase B — فلترة البيانات في Frontend
- [x] Campaigns.tsx: تمرير activeWorkspace.id لـ campaigns.list و social.list
- [x] Publishing.tsx: تمرير activeWorkspace.id لـ posts.list
- [x] Alerts.tsx: تمرير activeWorkspace.id لـ alerts.list و social.list
- [x] Reports.tsx: تمرير activeWorkspace.id لـ reports.list
- [x] Connections.tsx: تمرير activeWorkspace.id لـ social.list

### Phase C — نقل الملكية (Transfer Ownership)
- [x] server/routers/workspaces.ts: transferOwnership procedure (owner only)
- [x] WorkspaceSettings Team tab: زر "Transfer Ownership" للـ Owner فقط
- [x] TransferOwnershipModal: اختيار العضو + كتابة TRANSFER للتأكيد

### Phase D — اختبارات + Checkpoint
- [x] 292/292 اختبار ناجح + 0 أخطاء TypeScript
- [x] Checkpoint نهائي

## ✅ Phase — Multi-Platform Publishing + AI Studio + Onboarding + Settings

### Phase A — Multi-Platform Publishing
- [x] server/linkedin.ts — LinkedIn API helper (share post, upload media)
- [x] server/tiktok.ts — TikTok API helper (create video post)
- [x] server/youtube.ts — YouTube Data API helper (upload video, community post)
- [x] server/routers/posts.ts: publishNow يدعم linkedin, tiktok, youtube
- [x] ContentCalendar.tsx: Publish Now لجميع المنصات الـ 6

### Phase B — Advanced AI Studio
- [x] server/routers/ai.ts: sentimentAnalysis procedure
- [x] server/routers/ai.ts: bestTimeToPost procedure
- [x] server/routers/ai.ts: contentCalendarPlan procedure
- [x] AIContent.tsx: Sentiment Analysis tab
- [x] AIContent.tsx: Best Time to Post AI recommendations
- [x] AIContent.tsx: AI Content Calendar Planner

### Phase C — Competitor SWOT + Onboarding + Mobile
- [x] Competitors.tsx: AI-powered SWOT analysis panel
- [x] Competitors.tsx: Benchmark comparison radar chart
- [x] Multi-step Onboarding Wizard (4 steps: Connect → Budget → Campaign → Done)
- [x] Mobile Bottom Navigation bar (DashboardLayout + MobileBottomNav.tsx)
- [x] إصلاح i18n error في LocalCampaignTable (campaigns.status → campaigns.statusLabel)

### Phase D — Settings Overhaul
- [x] Settings: Timezone selector
- [x] Settings: Currency selector (USD, EUR, SAR, AED, EGP, GBP)
- [x] Settings: Data export (JSON/CSV)
- [x] Settings: Account deletion with confirmation

### Phase E — اختبارات + Checkpoint
- [x] TypeScript check (0 errors)
- [x] 292/292 اختبار ناجح
- [x] Checkpoint نهائي

## 🔄 Phase — Billing + Activity Log + Date Range Picker

### Phase A — Workspace Billing
- [ ] صفحة Billing.tsx — مقارنة Free/Pro/Enterprise مع feature list
- [ ] Stripe integration — webdev_add_feature stripe
- [ ] server/routers/billing.ts — createCheckoutSession + getSubscription + cancelSubscription
- [ ] Billing tab في WorkspaceSettings أو route منفصل /billing
- [ ] عرض الـ plan الحالي في Workspace Switcher

### Phase B — Workspace Activity Log
- [ ] جدول workspace_activity في Supabase (id, workspace_id, user_id, action, metadata, created_at)
- [ ] server/db/activity.ts — logActivity + getWorkspaceActivity
- [ ] تسجيل الأحداث: إضافة عضو، تغيير دور، نقل ملكية، تحديث إعدادات، رفع شعار
- [ ] server/routers/activity.ts — list procedure
- [ ] WorkspaceSettings: tab جديد "Activity" مع timeline

### Phase C — Custom Date Range Picker
- [ ] DateRangeContext عالمي (startDate, endDate, preset: 7d/30d/90d/custom)
- [ ] DateRangePicker component في Topbar
- [ ] تطبيق dateRange على: Home.tsx, Analytics.tsx, Campaigns.tsx, Reports.tsx
- [ ] حفظ التفضيل في localStorage

### Phase D — اختبارات + Checkpoint
- [ ] TypeScript check (0 errors)
- [ ] All tests passing (292+)
- [ ] Checkpoint نهائي

## ✅ Phase — Brand-Aware AI

### Step 3 — Backend
- [x] drizzle/schema.ts: إضافة brandGuidelines (text) لجدول workspaces
- [x] Supabase SQL migration — تم تشغيله يدوياً في SQL Editor
- [x] server/db/workspaces.ts: إضافة brandGuidelines في getWorkspaceById + updateWorkspace
- [x] server/routers/workspaces.ts: قبول brandGuidelines في update + upsertBrandProfile procedures
- [x] server/routers/ai.ts: buildBrandContext() يدمج brandGuidelines + brandProfile في System Prompt
- [x] تطبيق brand-aware context على: generate, generateCaption, generateHashtags, improveContent, contentCalendarPlan
- [x] التحقق من auto-create workspace في oauth.ts ✔

### Step 4 — Frontend
- [x] WorkspaceSettings.tsx: Textarea كبير لـ Brand Guidelines في Brand Profile tab (2000 حرف max)
- [x] WorkspaceContext.tsx: utils.invalidate() عند تغيير الـ workspace — يمنع تسرب البيانات

### Step 5 — QA
- [x] TypeScript check (0 errors)
- [x] 292/292 اختبار ناجح
- [x] Checkpoint نهائي

## Brand Assets Integration (Dashfields Official Logo & Icon)
- [x] رفع SVG assets إلى CDN
- [x] تطبيق الأيقونة في Favicon (index.html)
- [x] تطبيق الأيقونة في Sidebar (WorkspaceSwitcher)
- [x] تطبيق الشعار الكامل في صفحة Login/Landing
- [x] تطبيق الأيقونة في Loading screen
- [x] تحديث VITE_APP_LOGO بالأيقونة الرسمية

## Brand Polish Round 2
- [x] Sidebar: شعار كامل بدون أيقونة منفصلة + حجم أكبر
- [x] Splash Screen عند التحميل الأولي
- [x] Open Graph Meta Tags (og:title, og:image, og:description)

## Brand Polish Round 3
- [x] تلوين الشعار بلون Brand رسمي
- [x] Dark Mode: شعار أبيض تلقائياً عند تفعيل Dark Mode
- [x] تحسين Splash Screen بحجم أكبر وتصميم أفضل

## App Cleanup (Real Data Only)
- [x] حذف جميع Connections السابقة من قاعدة البيانات
- [x] تحديد وحذف جميع ملفات Demo/Mock و migration scripts القديمة
- [x] إزالة Math.random() من AudienceOverlap.tsx
- [x] تحويل /meta-connect إلى redirect لـ /connections
- [x] تحديث ActiveCampaignsTable: رابط Connect يوجه إلى /connections
- [x] التأكد أن جميع الصفحات تعرض بيانات حقيقية فقط (صفر أو empty state عند عدم وجود بيانات)

## Refactoring Phase 1 — Backend (Feature-Based Architecture)
- [x] إنشاء server/services/integrations/ و server/__tests__/
- [x] نقل ملفات integrations (meta, metaOAuth, platformOAuth, tiktok, linkedin, youtube, twitter)
- [x] نقل جميع .test.ts إلى server/__tests__/
- [x] تحديث جميع import paths في routers/ و _core/ و cron.ts
- [x] تشغيل الاختبارات: 292/292 passing ✅

## Refactoring Phase 2 — Frontend Core
- [x] إنشاء client/src/core/ مع مجلداتها الفرعية
- [x] نقل components/ui/ → core/components/ui/
- [x] نقل contexts/ → core/contexts/
- [x] نقل hooks/ → core/hooks/
- [x] نقل lib/ → core/lib/
- [x] نقل i18n/ → core/i18n/
- [x] تحديث جميع import paths بـ sed -i (80+ ملف)
- [x] تشغيل tsc --noEmit: 0 TS2307 errors ✅
- [x] تشغيل الاختبارات: 292/292 passing ✅

## Refactoring Phase 3 — Features
- [x] إنشاء client/src/features/ مع 20 مجلد feature
- [x] نقل pages/ وcomponents/ إلى features/ بهيكل feature-based
- [x] تحديث جميع import paths في App.tsx وباقي الملفات بـ Python script
- [x] حذف المجلدات القديمة الفارغة (pages/, components/dashboard|campaigns|analytics|publishing)
- [x] تشغيل tsc --noEmit: 0 TS2307 errors ✅
- [x] تشغيل الاختبارات: 292/292 passing ✅
- [x] Dev server: لا توجد أخطاء Vite بعد restart ✅

## Meta OAuth Fix
- [x] إصلاح Facebook iframe block: فتح OAuth في نافذة مستقلة (window.open) بدلاً من redirect مباشر
- [x] إضافة postMessage listener لتحديث القائمة بعد إغلاق popup
- [x] إضافة popup handling لجميع OAuth callbacks (success + error)
- [x] التحقق من Redirect URI في Meta App Dashboard ✅
- [x] اختبار OAuth Flow الكامل بعد الإصلاح ✅ (9 حسابات مرتبطة بنجاح)

## Phase 4 — TypeScript Strictness (Enterprise Quality) ✅
- [x] إنشاء shared/types/ مع Database types و Meta API types
- [x] إصلاح server/supabase.ts: استخدام Database types بدلاً من any
- [x] إصلاح server/db/*.ts: إزالة as any من Supabase queries
- [x] إصلاح server/services/integrations/metaOAuth.ts: Meta API response types
- [x] إصلاح server/services/integrations/platformOAuth.ts
- [x] إصلاح server/routers/meta.ts, postAnalytics.ts, export.ts, audience.ts
- [x] إصلاح client/src/features/*.tsx: إزالة as any
- [x] إصلاح client/src/core/components/ui/*.tsx
- [x] التحقق النهائي: 0 any + 292/292 tests ✅

## Phase 5 — Workspace Multi-Account Isolation ✅
- [x] تعديل upsertSocialAccount لحفظ workspaceId عند OAuth
- [x] تعديل OAuth callback (metaOAuth.ts) لتمرير workspaceId من state
- [x] تعديل meta.ts router لفلترة social_accounts بـ workspace_id
- [x] تعديل audience.ts: fetchPosts + 3 procedures بـ workspaceId
- [x] تحديث Analytics.tsx + Home.tsx + AdvancedAnalytics.tsx + Campaigns.tsx لتمرير workspaceId
- [x] كتابة server/workspace.isolation.test.ts (11 اختباراً)
- [x] التحقق النهائي: 303/303 tests + 0 TS errors ✅

## Phase 6 — Token Refresh + Auto-Onboarding + WorkspaceSwitcher ✅
- [x] Token Refresh: refreshMetaTokens function في server/cron.ts (إصلاح استخدام access_token بدلاً من refresh_token)
- [x] Token Refresh: Cron Job يومي يبحث عن tokens تنتهي خلال 10 أيام
- [x] Token Refresh: System Notification عند فشل التجديد (إعادة الربط يدوياً)
- [x] Auto-Onboarding: workspaces.ensureDefault procedure (idempotent)
- [x] Auto-Onboarding: WorkspaceContext يستدعي ensureDefault عند عدم وجود workspaces
- [x] Auto-Onboarding: ربط الحسابات اليتيمة (workspace_id=null) بالـ Default Workspace
- [x] WorkspaceSwitcher: موجود بالفعل في DashboardLayout Sidebar مع Modal للتبديل
- [x] Tests: server/token.refresh.test.ts (25 اختباراً: Token logic + URL builder + Auto-Onboarding + Notifications)
- [x] التحقق النهائي: 328/328 tests + 0 TS errors ✅

## Phase 7 — Multi-Workspace Billing Logic ✅
- [x] Backend: PLAN_LIMITS config في shared/planLimits.ts (free=1, pro=3, agency=∞, enterprise=∞)
- [x] Backend: canCreateWorkspace() + workspaceLimitMessage() helpers
- [x] Backend: فحص حدود الخطة في createWorkspace procedure (FORBIDDEN error)
- [x] Backend: upgradeWorkspace procedure لتغيير الـ plan
- [x] Frontend: UpgradeModal بمقارنة الخطط الثلاث (Free vs Pro vs Agency)
- [x] Frontend: Plan Badge في WorkspaceSwitcher بالـ Sidebar
- [x] Frontend: ربط "Create New Workspace" بـ UpgradeModal عند تجاوز الحد
- [x] Tests: server/billing.limits.test.ts (24 اختباراً: PLAN_LIMITS + canCreateWorkspace + workspaceLimitMessage)
- [x] Tests: workspaces.create محدّث لاختبار blocks + allows scenarios
- [x] التحقق النهائي: 352/352 tests + 0 TS errors ✅
