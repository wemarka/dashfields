#!/usr/bin/env python3
"""Fix import paths in features/ after moving pages/ and components/"""
import os
import re

FEATURES_DIR = "client/src/features"
COMPONENTS_DIR = "client/src/components"

# Mapping: old @/pages/X → new @/features/feature/X
PAGE_MAPPINGS = {
    "@/pages/Home": "@/features/dashboard/Home",
    "@/pages/Campaigns": "@/features/campaigns/Campaigns",
    "@/pages/Analytics": "@/features/analytics/Analytics",
    "@/pages/AdvancedAnalytics": "@/features/analytics/AdvancedAnalytics",
    "@/pages/PeriodComparison": "@/features/analytics/PeriodComparison",
    "@/pages/Publishing": "@/features/publishing/Publishing",
    "@/pages/ContentCalendar": "@/features/publishing/ContentCalendar",
    "@/pages/Connections": "@/features/connections/Connections",
    "@/pages/MetaConnect": "@/features/connections/MetaConnect",
    "@/pages/Audience": "@/features/audience/Audience",
    "@/pages/AudienceOverlap": "@/features/audience/AudienceOverlap",
    "@/pages/Reports": "@/features/reports/Reports",
    "@/pages/Alerts": "@/features/alerts/Alerts",
    "@/pages/AIContent": "@/features/ai/AIContent",
    "@/pages/AITools": "@/features/ai/AITools",
    "@/pages/Settings": "@/features/settings/Settings",
    "@/pages/Profile": "@/features/settings/Profile",
    "@/pages/WorkspaceSettings": "@/features/settings/WorkspaceSettings",
    "@/pages/Competitors": "@/features/competitors/Competitors",
    "@/pages/Insights": "@/features/insights/Insights",
    "@/pages/HashtagAnalytics": "@/features/insights/HashtagAnalytics",
    "@/pages/AcceptInvite": "@/features/workspace/AcceptInvite",
    "@/pages/ABTesting": "@/features/ab-testing/ABTesting",
    "@/pages/PostAnalytics": "@/features/post-analytics/PostAnalytics",
    "@/pages/CustomDashboards": "@/features/custom-dashboards/CustomDashboards",
    "@/pages/Notifications": "@/features/notifications/Notifications",
    "@/pages/NotFound": "@/features/shared/NotFound",
}

# Mapping: old @/components/X/ → new @/features/X/components/
COMPONENT_DIR_MAPPINGS = {
    "@/components/dashboard/": "@/features/dashboard/components/",
    "@/components/campaigns/": "@/features/campaigns/components/",
    "@/components/analytics/": "@/features/analytics/components/",
    "@/components/publishing/": "@/features/publishing/components/",
}

# Also update in components/ remaining files
SEARCH_DIRS = [FEATURES_DIR, COMPONENTS_DIR]

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix @/pages/ imports
    for old, new in PAGE_MAPPINGS.items():
        content = content.replace(f'from "{old}"', f'from "{new}"')
        content = content.replace(f"from '{old}'", f"from '{new}'")
    
    # Fix @/components/X/ imports
    for old, new in COMPONENT_DIR_MAPPINGS.items():
        content = content.replace(f'from "{old}', f'from "{new}')
        content = content.replace(f"from '{old}", f"from '{new}")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

fixed = 0
for search_dir in SEARCH_DIRS:
    for root, dirs, files in os.walk(search_dir):
        for fname in files:
            if fname.endswith('.tsx') or fname.endswith('.ts'):
                fpath = os.path.join(root, fname)
                if fix_file(fpath):
                    print(f"  Fixed: {fpath}")
                    fixed += 1

# Also fix App.tsx and main.tsx
for extra in ["client/src/App.tsx", "client/src/main.tsx"]:
    if os.path.exists(extra) and fix_file(extra):
        print(f"  Fixed: {extra}")
        fixed += 1

print(f"\n✅ Fixed {fixed} files")
